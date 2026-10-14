# Side Badger - Developer & AI Context

Marketing website for a white-label bill splitting app. The actual app is hosted externally at `app.sidebadger.me` (staging at `staging.sidebadger.me`); this repo is just the marketing site.

## Architecture

- **Framework**: Astro 5 (static site generation)
- **Deployment**: Docker container on `sidebadger.me` (behind shared nginx proxy)
- **CI/CD**: GitHub Actions. Every push and pull request runs the `verify` job; a push to `main` deploys only if it passes (see Verify gate)
- **Branches**: `main` is production. `redesign` is the long-running branch for the site redesign; it runs English-first (see below) and merges to `main` only when its locales are complete

## Key Files

| File | Purpose |
|------|---------|
| `src/i18n/en.ts` | All user-facing text, URLs, copy |
| `src/styles/tokens.css` | Design tokens (colors, spacing, typography) |
| `astro.config.mjs` | Site URL, i18n config |

## Code Patterns

**Translations**: Use `t(key, locale)` from `@/i18n`:
```typescript
import { t } from '@/i18n';
const alt = t('header.logoText', locale);
```

**Path aliases**:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@styles/*` → `src/styles/*`

**CSS**: Uses CSS custom properties from `tokens.css`. Layout and the site shell live in `layout.css`.

## Internationalization (i18n)

- **Text & Routing**: All text is handled via `src/i18n/*.ts`. Astro's dynamic routes provide locale-based URLs (e.g., `/ja/pricing`).
- **RTL**: `ar`, `fa` and `ur` are RTL (`rtlLocales` in `src/i18n/index.ts`). `BaseLayout.astro` sets `<html dir>` and `lang`. Write new CSS with logical properties only (some older rules are still physical); `tokens.css` sets `--dir: -1` under `[dir="rtl"]` for transforms. Check any layout change in `/ar/`.
- **Fonts**: `BaseLayout.astro` sets `data-font-script` from the locale's `fontScript`; `tokens.css` picks the font stack for each script. Arabic, Devanagari, Bengali and Telugu pages also load that script's Noto Sans stylesheet from `public/fonts/`.
- **SEO**: `SeoHead.astro` writes the title, description, canonical, `hreflang` alternates (`src/seo/alternates.ts`), `og:locale` and JSON-LD.
- **Formatting**: The `src/i18n/index.ts` file includes helpers like `getFormattedDate` for locale-aware date formatting.

### English-first mode and `redesign`

`I18N_MODE=strict` (default) means every locale has every English key and page. `I18N_MODE=english-first` lets new English content ship before its translations:
- `src/i18n/pending/keys.json` lists keys added or removed in English that locales have not caught up with; `pending/pages.json` does the same for content pages. Strict mode requires both to be empty.
- `src/i18n/locks/<locale>.json` records the English hash each translation was made against, so `npm run i18n audit` can flag stale or unconfirmed translations.
- In english-first mode, routes (`src/site/routes.ts`) are not generated for a locale that lacks a key or page, so no English fallback is built at a localized URL.
- CI picks the mode: `english-first` on `redesign` and pull requests into it, `strict` everywhere else including `main`. Local runs default to strict; set `I18N_MODE=english-first` to match `redesign`.
- `PREVIEW_PSEUDO=1` (pseudo-locales `xx-*`) and `PREVIEW_UNPUBLISHED=1` (unpublished pages) are local review switches. Never set them in CI or Docker; output checks fail if they leak.

### Adding a New Language

`src/i18n/index.ts` is the **single source of truth**. See the checklist at the top of that file. Pages use `getLocalePaths()` and `astro.config.mjs` imports `locales` from there, so you only update one file.

### Translation Management Tool

CLI tool for managing translations. English (`en.ts`) is the master file.

```bash
npm run i18n help    # Show all commands and usage
npm run i18n stats   # Quick overview of translation status
npm run i18n audit   # Check for missing/extra keys
```

## URL policy

- Every page URL ends in a slash (`/pricing/`, `/fr/pricing/`). English has no prefix; slugs are English in every locale.
- Build every internal URL with `src/seo/urls.ts` (`localizedPath`, `canonicalFor`, `launchHref`), never by string concatenation.
- Regional aliases (see `aliasConfig` in `src/i18n/index.ts`) are not pages. nginx 301s them to the locale they copy (`nginx/locale-redirects.conf`), keeping the query string.
- A slashless page URL gets nginx's 301 to the slash form; `/x/index.html` 301s to `/x/`; unknown paths are 404 (no `.html` fallback).
- `/go/app/` and `/go/register/` are the launch counter: nginx logs one minimal line per click and 302s to `app.sidebadger.me/dashboard` or `/register`, passing only a validated `lang`. Links to the app go through `launchHref()`, never straight to the app (rule 15 enforces this).
- The legacy URL list in `src/__tests__/fixtures/legacy-urls.txt` is replayed against the real image by `scripts/check-nginx.sh`.

## Site structure

- `src/site/pages.ts`: the page registry (id, type, English path, parent, `published`). Routes, navigation, breadcrumbs, the sitemap and the output checks all read it. `preview-pages.ts` holds preview-only pages.
- `src/site/routes.ts`: `pathsFor(pageId)` / `pathsForType(type)` for `getStaticPaths()`. Route files live in `src/pages/[...locale]/`.
- `src/seo/`: `urls.ts` (paths, canonicals, launch links), `alternates.ts` (hreflang), `indexability.ts` (noindex rules), `jsonld.ts` (typed JSON-LD graph).
- `src/components/layout/`: `SeoHead`, `SiteHeader`, `SiteFooter`. `BaseLayout.astro` composes them.

## Components

- `BaseLayout.astro` (`src/layouts`) - HTML wrapper, SEO head, header/footer
- `HomePage.astro`, `PricingPage.astro` - page bodies
- `PolicyPage.astro` - Renders a legal page from the committed snapshot in `src/content/policies` (English text; non-English locales show a notice)
- `LanguageSwitcher.astro`, `LanguageDetection.astro` - language picker and first-visit detection
- `EasterEggs.astro` - Konami code, disco mode, hidden interactions

## Pages

All in `src/pages/` (file-based routing); most are under `[...locale]/` so one file serves every locale:
- `index.astro`, `pricing.astro` - Homepage and the free tier explanation with FAQ schema
- `privacy.astro`, `terms.astro`, `cookies.astro` - Policy pages (pre-rendered from snapshots at build time)
- Outside `[...locale]/`: `404.astro`, `robots.txt.ts` and `og/[card].png.ts` (social cards)

## Verify gate

`npm run verify` is the full gate: unit tests, `i18n:audit`, `astro check` (0 errors), `build`, then `check:site`.
- `check:site` (`vitest.site.config.ts`, rules in `src/__site_tests__/`) reads `dist/` and enforces 15 output rules: files, canonicals, noindex, h1, title/description, lang/dir, hreflang, sitemap, links, social image, JSON-LD, leaks, English fallback, image dimensions and alt, launch links. Run `npm run build` first; `SITE_DIST` points it at another directory.
- `scripts/check-nginx.sh` (`npm run check:nginx`) builds the image (or takes `--image`), runs it and checks redirects, 404s, `/go/`, headers. It needs Docker and a strict build, so on `redesign` it passes only once every locale is complete.
- CI (`.github/workflows/deploy.yml`): the `verify` job runs `npm run verify` on every push and pull request. `build-and-push` and `deploy` need `verify` and run only on pushes to `main`; `build-and-push` builds the image, runs the nginx smoke test against it, then pushes it.
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
2. `builder` - Node 22, install deps (dev included), build, run `check:site`
3. `production` - `nginx:1.27-alpine` serving `dist/`; `nginx/default.conf` goes in `conf.d/`, other `nginx/*.conf` in `/etc/nginx/side-badger/`

`nginx/default.conf` owns every response header except HSTS, plus caching and the body limit. The shared Snowmonkey proxy terminates TLS, compresses responses (brotli or gzip) and forwards to the `side-badger` alias.

## External Dependencies

The app lives at `app.sidebadger.me` (production). `staging.sidebadger.me` is for rehearsals only; the built site must never contain it (rule 12). `getAppUrl()` in `src/i18n/index.ts` returns the production app URL.

Policy pages are built from Markdown snapshots in `src/content/policies/`. `scripts/sync-policies.mjs` (`npm run policies:sync`) refreshes them from `https://app.sidebadger.me/api/policies/{policy-type}/current` and `/text`; the `policy-sync.yml` workflow runs it daily and opens a PR. The build never calls the API.

Caveat: a PR opened with the default `GITHUB_TOKEN` does not trigger the `verify` job. Either give the workflow a GitHub App or PAT token, or push an empty commit / close and reopen the PR to run checks. The repository setting "Allow GitHub Actions to create pull requests" must be enabled.

## Styling Notes

- Fluid typography and spacing using `clamp()`
- Breathing animations on hero elements
- Confetti via `canvas-confetti` on CTA clicks and easter eggs (loaded on first use)
- All animations respect `prefers-reduced-motion`
