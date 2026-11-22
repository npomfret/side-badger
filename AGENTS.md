# Side Badger - Developer & AI Context

Marketing website for a white-label bill splitting app. The actual app is hosted externally at `app.sidebadger.me` (staging at `staging.sidebadger.me`); this repo is just the marketing site.

- **Tech**: Astro 5 static site, TypeScript, YAML content validated with zod, Vitest, Playwright, nginx in Docker; many locales including RTL.
- **Lifecycle**: production. A push to `main` builds and deploys the site (`.github/workflows/deploy.yml`) once `verify` and `e2e` pass. Verification gates and the output rules below are the change constraints.

## Architecture

- **Framework**: Astro 5 (static site generation)
- **Deployment**: Docker container on `sidebadger.me` (behind shared nginx proxy)
- **CI/CD**: GitHub Actions. Every push and pull request runs the `verify` job; a push to `main` deploys only if it and the `e2e` browser tests pass (see Verify gate)

## Internationalization (i18n)

- **Text & Routing**: All user-facing English text, URLs and copy live in `src/i18n/en.ts` (the master); other locales are `src/i18n/*.ts`. Astro's dynamic routes provide locale-based URLs (e.g., `/ja/pricing`).
- **RTL**: `ar`, `fa` and `ur` are RTL (`rtlLocales` in `src/i18n/index.ts`). `BaseLayout.astro` sets `<html dir>` and `lang`. Write new CSS with logical properties only (some older rules are still physical); `tokens.css` sets `--dir: -1` under `[dir="rtl"]` for transforms. Check any layout change in `/ar/`.
- **Details**: fonts, SEO head, formatting helpers, English-first mode mechanics (pending manifests, locks, preview flags) and the `npm run i18n` tool are in `docs/i18n.md`; read it before changing them.
- **Modes**: `I18N_MODE=strict` (default) needs every locale to have every English key and page; CI always runs strict. `I18N_MODE=english-first`, `PREVIEW_UNPUBLISHED=1` and `PREVIEW_PSEUDO=1` are local only: never set them in CI or Docker. Output checks fail if they leak (rule 12 fails by design on a pseudo build, so run `check:site` on a normal build).
- **Adding a language**: `src/i18n/index.ts` is the single source of truth (checklist at the top of that file). `npm run i18n audit` is part of the verify gate; `npm run i18n help` lists the rest.

## URL policy

- Every page URL ends in a slash (`/pricing/`, `/fr/pricing/`). English has no prefix; slugs are English in every locale.
- Build every internal URL with `src/seo/urls.ts` (`localizedPath`, `canonicalFor`, `launchHref`), never by string concatenation.
- Regional aliases (see `aliasConfig` in `src/i18n/index.ts`) are not pages. nginx 301s them to the locale they copy (`nginx/locale-redirects.conf`), keeping the query string.
- A slashless page URL gets nginx's 301 to the slash form; `/x/index.html` 301s to `/x/`; unknown paths are 404 (no `.html` fallback).
- `/go/app/` and `/go/register/` are the launch counter: nginx logs one minimal line per click and 302s to `app.sidebadger.me/dashboard` or `/register`, passing only a validated `lang`. Links to the app go through `launchHref()`, never straight to the app (rule 15 enforces this).
- The legacy URL list in `src/__tests__/fixtures/legacy-urls.txt` is replayed against the real image by `scripts/check-nginx.sh`.

## Site structure

- `src/site/pages.ts`: the page registry (id, type, English path, parent, `published`, `related`, `content`). Routes, navigation, breadcrumbs, the sitemap and the output checks all read it. New pages are registered with `published: false` and flipped at release; `preview-pages.ts` holds preview-only pages.

Rules that hold across the site (full structure, shell, layouts, components and homepage detail is in `docs/site-structure.md`; read it before changing those):

- `src/components/cta/LaunchAppCta.astro` is the only way to link to the app (it goes through `launchHref()`; rule 15). Rich text and YAML never contain app links.
- `src/data/features.ts`, `use-cases.ts`, `substitutions.ts` and `screenshots.ts` (types in `types.ts`) are the English, internal registry: feature ids and statuses, claims, proof, approved wording. Pages reference ids and never print registry strings. `substitutions.ts` lists phrases banned from English copy and what to write instead. `src/__tests__/registry.test.ts` checks every reference.
- `richText` fields are inline Markdown only. The one link form is `[text](page:<pageId>)`, resolved per locale by `RichText.astro`; an unknown or unbuilt page id fails the build. No app links in rich text.
- Every entry has a `review` block. `machine` is the default; `checked` is set by an agent that back-checked the text (needs `checker` and `date`); `reviewed` only for a named fluent human (needs `reviewer` and `date`). Agents never write `reviewed`.
- Copy never describes how the app works internally: no AI provider, vendor, region or processing detail (owner rule, 21 November 2026). Say what the person gets. `substitutions.ts` bans the known phrases.
- Copy never promises no ads or no paid tier: both may come (owner decision, 22 November 2026). Brag about what Side Badger does better, for free; `substitutions.ts` bans the phrases.
- Policies are not content: the legal pages load the app's current policy in the browser (see External Dependencies).
- A page's scripts must stay under 10 KB gzipped at load.
- Retired: the canvas background, floating particles, cursor-follow, glass-layer and aurora effects, and the old single-file homepage are gone. Do not reintroduce ambient background effects; motion belongs to scenes and respects `prefers-reduced-motion`.

## End-to-end tests

`e2e/` is Playwright (`npm run test:e2e`; specs in `e2e/*.spec.ts`; page objects in `e2e/pages/`). `playwright.config.ts` builds the site with both preview flags and serves it on `E2E_PORT` (default 18520); it defaults to `I18N_MODE=english-first`. Tests go through page objects only.

## Verify gate

`npm run verify` is the full gate: unit tests, `i18n:audit`, `astro check` (0 errors), `build`, then `check:site`.
- `check:site` (`vitest.site.config.ts`, rules in `src/__site_tests__/`) reads `dist/` and enforces 15 output rules: files, canonicals, noindex, h1, title/description, lang/dir, hreflang, sitemap, links, social image, JSON-LD, leaks, English fallback, image dimensions and alt, launch links. Run `npm run build` first; `SITE_DIST` points it at another directory.
- `scripts/check-nginx.sh` (`npm run check:nginx`) builds the image (or takes `--image`), runs it and checks redirects, 404s, `/go/`, headers. It needs Docker and a strict build.
- CI (`.github/workflows/deploy.yml`): the `verify` job runs `npm run verify` and the `e2e` job runs the Playwright suite (three shards, strict mode) on every push and pull request. `build-and-push` and `deploy` need both and run only on pushes to `main`; `build-and-push` builds the image, runs the nginx smoke test against it, then pushes it.
- In English-first mode the unused-key test lets keys listed under `pending/keys.json` `added` stay unused (their code lands in a later wave) and prints them; strict mode fails on any unused key.
- The Dockerfile `builder` stage runs `check:site` after the build, so a manual `scripts/deploy.sh` build is gated too.

## Docker

```bash
npm run dev            # Restart the dev container, hot-reload (port 4321)
npm run dev:host       # Plain `astro dev` on the host, no Docker
npm run docker:stop
npm run docker:logs
```

Multi-stage Dockerfile:
1. `dev` - hot-reload container
2. `builder` - Node 26.12.1, install deps (dev included), build, run `check:site`
3. `production` - digest-pinned `nginx:1.30.6-alpine` serving `dist/`; `nginx/default.conf` goes in `conf.d/`, other `nginx/*.conf` in `/etc/nginx/side-badger/`

`nginx/default.conf` owns every response header except HSTS, plus caching and the body limit. The shared Snowmonkey proxy terminates TLS, compresses responses (brotli or gzip) and forwards to the `side-badger` alias.

## External Dependencies

The app lives at `app.sidebadger.me` (production). `staging.sidebadger.me` is for rehearsals only; the built site must never contain it (rule 12). `getAppUrl()` in `src/i18n/index.ts` returns the production app URL.

The legal policies are owned by the app and are never copied into this repository. The build makes no API call and needs no snapshot, so a build and every other page work while the app is down. A policy page's static HTML is a shell; the visitor's browser fetches `https://app.sidebadger.me/api/policies/{privacy-policy,terms-of-service,cookie-policy}/text` (Markdown) and `/current` (publication date, `createdAt`) when the page opens, so a policy change shows on the next page load with no site deploy. The API sends `access-control-allow-origin` for the requesting origin and this site's CSP has no `connect-src`, so no change is needed on either side today. If the API fails, times out (10 s) or returns an empty or malformed body, the page shows a translated message and a Retry button and no policy text. Never point this at staging (rule 12).

<!-- agent-standards:begin -->
## Operating contract

*Managed by `npomfret/agent-standards`; detailed workflows are skills.*

- Skills come first: your first action on any task is to invoke, with the Skill tool, every skill whose description matches the request, before reading code or running commands. A task usually matches several (code design, tests, SQL, UI, scripts, logging, CI, commits); load them all, and again when the work moves to a new kind of task. Starting work without them is a mistake, even when the change looks small.
- Scope: do what was asked plus the callers, tests and migrations it needs. Leave unrelated refactors, renames, cleanup, dependency bumps and docs for separate work; suggest them at the end. Never invent commands, paths, field names or APIs; check the source first. Add failure handling only for observed evidence. When readings differ materially, choose the most plausible, state the assumption in your report and proceed. Done means the behaviour works, verification passes, and you report evidence and blockers.
- Gates: only substantive failures block (types, broken behaviour, agreed rules). Cosmetics are autoformatted and never block commits, CI or reviews. Run tests, builds and type checks yourself; no test or lint hooks, and formatting hooks only when targeted at changed files.
- Machine load: one build or test command at a time per machine, across all agents and sessions (wait for any running xcodebuild). Lean on CI for full suites; locally run only the tests your change needs. No load, stress, performance or other CPU-saturating tests without the user's explicit authorisation.
- Other agents share the checkout. Stage only your files; never stash, discard, revert or commit their changes. The shared checkout stays on the default branch; isolate with `git worktree add --detach tmp/worktrees/<name> <default-branch>`.
- Git: work is complete only when verified, reviewed commits are on the default branch and pushed (`git pull --rebase`, land with `git merge --ff-only`). Force-pushing is permitted; prefer `--force-with-lease`. Commit, land and push without asking. Repositories stay private.
- Significant work (behaviour, refactor, tests, config, tooling) is reviewed independently before commit: spawn a project reviewer or `change-reviewer` subagent (`spawn_agent` in Codex, the Agent tool in Claude Code), never report a review you did not delegate; resolve every finding. Tests and review do not replace each other.
- Substantial work needs a committed task file under `tasks/`.
- Run commands yourself unless they need the user's login, password, sudo, device or install. Reuse the project's scripts and `tmp/ad-hoc-scripts/`; put multi-step or quoted shell in a named script there. Hand the user one short command, else a script run as `! tmp/ad-hoc-scripts/<purpose>.sh`. Send long output to `tmp/logs/`; read it with `rg` and bounded excerpts; never paste whole logs.
- Secrets never go in source, arguments, output or logs, or the repo; they live in iCloud Drive, reached through gitignored `secrets/` links. Configuration comes only from explicitly supplied files, never environment, dotenv or ambient login.
- Code: construct dependencies at the entry point and inject them; no globals, singletons or hidden construction; immutable by default; structured logs with fixed labels that preserve error causes and stacks; no sleeps in tests. Raise a test timeout or limit only on measured evidence, recorded beside the operation.

- Be concise: lead with the outcome; give only the detail needed to act or decide.
- Do the work properly and verify it; never trade correctness for speed or cost.
- When options exist, recommend the best technical solution first, even if costlier; state cheaper alternatives separately with their trade-offs.
- Fail fast: surface errors with their cause; never swallow, mask or silently fall back from them.
- Keep one canonical implementation: migrate callers and delete superseded code instead of adding shims or compatibility layers.
- Question unclear or unsound requests before acting on them; do not comply silently.
In Codex, use native skills and specialists for equivalent Claude invocations; referenced `.claude/` files remain canonical project knowledge.

*Managed by `npomfret/agent-standards`; edit the shared sources there.*
<!-- agent-standards:end -->
