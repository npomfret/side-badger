# Side Badger - Developer & AI Context

Marketing website for a white-label bill splitting app. The actual app is hosted externally at `app.sidebadger.me` (staging at `staging.sidebadger.me`); this repo is just the marketing site.

## Architecture

- **Framework**: Astro 5 (static site generation)
- **Deployment**: Docker container on `sidebadger.me` (behind shared nginx proxy)
- **CI/CD**: GitHub Actions. Every push and pull request runs the `verify` job; a push to `main` deploys only if it and the `e2e` browser tests pass (see Verify gate)
- **Branches**: `main` is production; work happens on short-lived branches merged into it

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

### English-first mode

`I18N_MODE=strict` (default) means every locale has every English key and page. `I18N_MODE=english-first` lets new English content ship before its translations:
- `src/i18n/pending/keys.json` lists keys added or removed in English that locales have not caught up with; `pending/pages.json` does the same for content pages. Strict mode requires both to be empty.
- `src/i18n/locks/<locale>.json` records the English hash each translation was made against, so `npm run i18n audit` can flag stale or unconfirmed translations.
- In english-first mode, routes (`src/site/routes.ts`) are not generated for a locale that lacks a key or page, so no English fallback is built at a localized URL.
- CI always runs `strict`. Local runs default to strict; set `I18N_MODE=english-first` to build new English content before its translations exist (it cannot reach `main` until the locales catch up).
- `PREVIEW_UNPUBLISHED=1` builds the registry pages that have `published: false` plus the preview-only pages in `src/site/preview-pages.ts` (`/preview/<slug>/`, content under `src/content/*/__preview__/`). They are `noindex`, carry `data-unpublished`, and stay out of navigation and the sitemap.
- `PREVIEW_PSEUDO=1` adds the pseudo-locales `xx-long`, `xx-ar`, `xx-ja` and `xx-hi` for layout review (long text, RTL, CJK, Devanagari). Their content is the English entry run through `pseudoize` (`src/components/content/pseudo-content.ts`); there is no YAML for them.
- Both are local only: never set them in CI or Docker. Output checks fail if they leak (rule 12 fails by design on a pseudo build, so run `check:site` on a normal build). `playwright.config.ts` builds with both set.

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

- `src/site/pages.ts`: the page registry (id, type, English path, parent, `published`, `related`, `content`). Routes, navigation, breadcrumbs, the sitemap and the output checks all read it. New pages are registered with `published: false` and flipped at release; `preview-pages.ts` holds preview-only pages.
- `src/site/routes.ts`: `pathsFor(pageId)` / `pathsForType(type)` for `getStaticPaths()`. Route files live in `src/pages/[...locale]/`.
- `src/site/cross-links.ts`: the page ids a page links to automatically (its `related` list, the features a use case depicts, the use cases that depict a feature). Callers filter by publication.
- `src/seo/`: `urls.ts` (paths, canonicals, launch links), `alternates.ts` (hreflang), `indexability.ts` (noindex rules), `jsonld.ts` (typed JSON-LD graph).
- `src/components/layout/`: `SeoHead`, `SiteHeader`, `MobileNav`, `SiteFooter`. `BaseLayout.astro` composes them with `src/components/nav/Breadcrumbs.astro` and `RelatedLinks.astro`.

### Shell

- `SiteHeader` is sticky; `--header-h` (`tokens.css`) is its height and drives `scroll-padding-top` and the pinned homepage scenes. Use it instead of a literal.
- `MobileNav` is a native Popover API menu (`popovertarget`, `popover`): Escape, light dismiss and focus return come from the browser, so add no JS for them.
- `src/components/cta/LaunchAppCta.astro` is the only way to link to the app (it goes through `launchHref()`; rule 15). Rich text and YAML never contain app links.
- Breadcrumbs come from the registry `parent` chain and match the BreadcrumbList JSON-LD.

### Registries and content

- `src/data/features.ts`, `use-cases.ts`, `substitutions.ts` and `screenshots.ts` (types in `types.ts`) are the English, internal registry: feature ids and statuses, claims, proof, approved wording. Pages reference ids and never print registry strings. `substitutions.ts` lists phrases banned from English copy and what to write instead. `src/__tests__/registry.test.ts` checks every reference.
- Content is YAML, one file per page per locale: `src/content/{features,use-cases,pages,guides}/<slug>/<locale>.yaml`. `src/content/schemas.ts` (zod) defines every shape; `content.test.ts` checks structural parity between locales (same keys as English).
- `richText` fields are inline Markdown only. The one link form is `[text](page:<pageId>)`, resolved per locale by `RichText.astro`; an unknown or unbuilt page id fails the build. No app links in rich text.
- A worked example is data, not prose: `computeExample` (`src/lib/settle.ts`) computes the settlement, `content/money.ts` formats it and `WorkedExample` shows it. Locales may change names, labels and amounts, but people, payers, split methods and payment count must match English. `exampleAfter` places the example after N sections; `navLabel` (max 32 characters) is the short label used in navigation.
- Every entry has a `review` block. `machine` is the default; `checked` is set by an agent that back-checked the text (needs `checker` and `date`); `reviewed` only for a named fluent human (needs `reviewer` and `date`). Agents never write `reviewed`.
- Policies: `src/content/policies/*.md` are committed snapshots (see External Dependencies).

### Layouts and content blocks

- `src/layouts/`: `FeaturePageLayout`, `UseCasePageLayout`, `HubLayout` (the features, use-cases and guides indexes), `HowItWorksLayout`, `GuidePageLayout`, plus `BaseLayout`. The route files in `src/pages/[...locale]/` load the collection entry and pass it in.
- `GuidePageLayout` (guides: page type `article`, id `guide/<slug>`, path `/guides/<slug>/`) composes the hero, sections, `WorkedExample` (by `exampleAfter`), `FaqList`, `RelatedPages` and `CtaBand`, and emits `Article` JSON-LD. A guide's `owner`, `reviewBy` and dates are structural, and it names at least two product pages in `related` (restructure D20); those pages list it back.
- `ToolPageLayout` (page type `tool`, the calculators) composes the hero, the calculator named for the page in its `TOOLS` map, the sections, `WorkedExample`, `FaqList`, `RelatedPages` and `CtaBand`, and emits `WebApplication` JSON-LD.
- `src/components/tools/` holds the in-browser calculators (`SplitCalculator`, `RentCalculator`). Each has pure logic (`*-engine.ts`, over `src/lib/settle.ts`), a share-link codec (`*-fragment.ts`, on `fragment-codec.ts`: the state in the URL fragment, no network, no storage) and one page script, with `calculator.css`, `CurrencyField`, `ToolResultFooter` and `tool-dom.ts` shared. A page's scripts must stay under 10 KB gzipped at load.
- `src/components/content/` holds the building blocks: `PageHero`, `PageArt`, `ContentSection`, `ExtraSections`, `CardGrid`, `WorkflowSteps`, `WorkedExample`, `Screenshot`, `FaqList`, `LimitsList`, `RelatedPages`, `CtaBand`, `BetaLabel`, `RichText`. Compose these rather than writing page-specific markup.
- Page art: `PageHero` shows `PageArt` (two to four homepage props in one of five layouts: `cluster`, `stack`, `row`, `chat`, `flank`) beside the h1 on wide screens and as a strip under the call to action on phones. What goes in it is `src/data/page-art.ts`, keyed by registry page id; its words come only from the page's worked example, existing keys or short `art.<page>.<slot>` keys (at most six words), and `page-art.test.ts` checks every reference. It is `aria-hidden` and still. A product shot with an image takes the art's place in the hero. The props paint with `src/styles/props.css` (the paper palette), scoped to `.home`, `.page-art` and `.worked-example`. `WorkedExample` is styled like the app's ledger (till slips, a "who pays whom" card), and `WorkflowSteps` underlines each step title with a `Doodle`.

## Components

- `PricingPage.astro` - pricing body
- `PolicyPage.astro` - Renders a legal page from the committed snapshot in `src/content/policies` (English text; non-English locales show a notice)
- `LanguageSwitcher.astro`, `LanguageDetection.astro` - language picker and first-visit detection
- `EasterEggs.astro` - Konami code, disco mode, hidden interactions

### Homepage (`src/components/home/`)

A scroll-driven set of scenes. Styles are in `src/styles/home/` (`tokens.css`, `scenes.css`).
- `HomePage.astro` composes the scenes; `ScrollScene.astro` is the scene wrapper (its `data-*` contract is documented in `scene-controller.ts`); `AppFrame.astro` frames app-like content.
- `scenes/` has one component per scene (`SceneChaos`, `SceneTangle`, `SceneGroup`, `SceneExpenses`, `SceneCurrencies`, `SceneSettle`, `SceneWorlds`, `ScenePricing`, `SceneTrust`).
- `props/` is the illustration kit (`Paper`, `Receipt`, `Polaroid`, `StickyNote`, `Stamp`, `Doodle`, `Avatar`, `ChatBubble`, `Money`, `SceneLink`) with `chaos/`, `expenses/` and `worlds/` sub-kits.
- `tangle/layout.ts` lays out the debt tangle; `data/` holds the scene data (`example-group.ts`, `home-features.ts`, `links.ts`, `worlds.ts`); `format.ts` formats money.
- `scene-controller.ts` is the only homepage script: no scroll listeners and no permanent animation loop. It picks the engine: `native` (CSS view timelines), `stages` (fallback for browsers without them; sets `data-stage` from hidden regions) or `static` (reduced motion or a viewport under 560 px high: nothing pinned, scenes rest at `data-static-stage`). `?scenes=stages` forces the fallback for testing. Ambient loops stop 5 s after a scene activates.
- Confetti is lazy: `canvas-confetti` is dynamically imported on first use (`[data-confetti]`, the `home:confetti` event, easter eggs, pricing) and never under reduced motion.
- Homepage text is `home.*` keys in `en.ts`; app links go through `LaunchAppCta`.
- Retired: the canvas background, floating particles, cursor-follow, glass-layer and aurora effects, and the old single-file homepage are gone. Do not reintroduce ambient background effects; motion belongs to scenes and respects `prefers-reduced-motion`.

## Pages

All in `src/pages/` (file-based routing); most are under `[...locale]/` so one file serves every locale:
- `index.astro` (homepage), `pricing.astro` (free tier with FAQ schema)
- `features/index.astro`, `features/[slug].astro`, `use-cases/index.astro`, `use-cases/[slug].astro`, `how-it-works.astro`, `guides/index.astro`, `guides/[slug].astro` - content pages built from the collections
- `privacy.astro`, `terms.astro`, `cookies.astro` - Policy pages (pre-rendered from snapshots at build time)
- `preview/[slug].astro` - layout review pages, only under `PREVIEW_UNPUBLISHED=1`
- Outside `[...locale]/`: `404.astro`, `robots.txt.ts` and `og/[card].png.ts` (social cards)

## End-to-end tests

`e2e/` is Playwright (`npm run test:e2e`; specs `layouts`, `shell`, `pricing`; page objects in `e2e/pages/`). `playwright.config.ts` builds the site with both preview flags and serves it on `E2E_PORT` (default 18520); it defaults to `I18N_MODE=english-first`. Tests go through page objects only.

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
2. `builder` - Node 22, install deps (dev included), build, run `check:site`
3. `production` - `nginx:1.27-alpine` serving `dist/`; `nginx/default.conf` goes in `conf.d/`, other `nginx/*.conf` in `/etc/nginx/side-badger/`

`nginx/default.conf` owns every response header except HSTS, plus caching and the body limit. The shared Snowmonkey proxy terminates TLS, compresses responses (brotli or gzip) and forwards to the `side-badger` alias.

## External Dependencies

The app lives at `app.sidebadger.me` (production). `staging.sidebadger.me` is for rehearsals only; the built site must never contain it (rule 12). `getAppUrl()` in `src/i18n/index.ts` returns the production app URL.

Policy pages are built from Markdown snapshots in `src/content/policies/`. `scripts/sync-policies.mjs` (`npm run policies:sync`) refreshes them from `https://app.sidebadger.me/api/policies/{policy-type}/current` and `/text`; the `policy-sync.yml` workflow runs it daily and opens a PR. The build never calls the API.

Caveat: a PR opened with the default `GITHUB_TOKEN` does not trigger the `verify` job. Either give the workflow a GitHub App or PAT token, or push an empty commit / close and reopen the PR to run checks. The repository setting "Allow GitHub Actions to create pull requests" must be enabled.

## Styling Notes

- Fluid typography and spacing using `clamp()`
- Confetti via `canvas-confetti` on CTA clicks, scenes and easter eggs (loaded on first use)
- All animations respect `prefers-reduced-motion`
