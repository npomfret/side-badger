# Restructure the marketing website

## Start here

**Reading order.**

1. This file: the decisions, the sequence and the [Agent execution plan](#agent-execution-plan), which schedules every package in both tasks.
2. [The site plan](./seo-site-expansion-plan.md): product truth. The feature registry, approved claims, page set, page briefs, imagery and pricing promise.
3. [The homepage plan](./homepage-scroll-experience.md): the homepage's design and its packages H1 to H16.
4. [Baseline measurements](./baseline-measurements.md): the before numbers and the measurement method. Reference only.

**First wave.** W0 can start immediately and in parallel: P01, P02, P03, P04 and P05 (P05 merges after P02), and the homepage's H1, H2 (merges after P04) and H3. Nothing in W0 needs owner input.

**Model guidance.** Every package names a model. Sonnet suits the clear, mechanical packages: the translation groups T1–T6 and their back-checks, mechanical refactors (P03, P22, H11), and checks and scripts (P01, P02, P04, P05, P13, P14, P16, P19, P35, P38, P39, H3, H14, H16). The default model takes the judgement-heavy ones: the prototype (H1), copywriting (H2, P31–P34), design and layout (H4–H10, P23, P24, P26), interlocking SEO and locale rules (P11, P12, P15, P21), and the verification that has to judge what it sees (H13, P41).

**Rules that never bend.**

- Parallel packages never share a file. Every shared file has one holder at a time ([Shared files and serialization](#shared-files-and-serialization)).
- Each package builds in its own worktree or a private copy, never in the shared working tree's `dist/`.
- English first, translation last (D38). All English work lands on the long-lived `redesign` branch. `main` deploys on every push, so it only receives W0–W1 packages that add no user-facing string, and finally the finished `redesign` branch. No English fallback is ever built at a localized URL.

**Naming.** P packages belong to this task, H packages to the homepage plan, and T1–T6 are the translation groups. W0–W4 are execution waves. "Release 1" (the first release) and "release 2" are the site plan's content releases. Each plan numbers its own decisions: inside a file a bare Dn is that file's decision, and across files they are written "site plan Dn" and "restructure Dn". The homepage plan has no D-numbers of its own.

## Status

Planned. Decisions are settled and the work is broken into agent packages (see [Agent execution plan](#agent-execution-plan)).

The plan comes from an audit on 14 October 2026 of commit `bc01126`, rechecked against `2f9b773`, which only moves the app origin to `app.sidebadger.me`. It also draws on [baseline measurements](./baseline-measurements.md) and the [homepage task](./homepage-scroll-experience.md). The audit covered the source, a local production build (Astro 5.16.4, 231 HTML files), the repo's nginx config served locally in `nginx:1.27-alpine`, the unit tests, `npm run i18n audit`, and the policy endpoints in the app repo (`wl-bill-splitter`). Agents follow the decisions below and do not re-decide them. If evidence shows a decision is wrong, the agent stops and reports to the coordinator.

## Objective

Restructure the Side Badger marketing site from a homepage-led product brochure into a small, coherent static site with dedicated feature, use-case, and explanatory pages.

The finished site should:

- explain what Side Badger does and why it is useful;
- give important search intents a useful landing page;
- retain the dry, tongue in cheek Side Badger voice;
- show product evidence rather than relying only on claims;
- lead relevant visitors into the external app;
- preserve accessible, localized static output.

## Related documents

- [Site review and expansion plan](./seo-site-expansion-plan.md): review findings, proposed information architecture, page responsibilities, voice and editorial rules, and success measures. It is the design reference for this task and the **source of product inputs**: the feature registry, the page set and page briefs, priority markets, the proof list, and the pricing promise.
- [Homepage scroll experience](./homepage-scroll-experience.md): the homepage rebuild from step 6.
- [Baseline measurements](./baseline-measurements.md): the before numbers and the local measurement method.
- `nginx/default.conf` and the Docker section of `AGENTS.md`: the nginx contract this task extends with the URL policy. nginx owns every response header except HSTS, plus caching and the body limit; the Snowmonkey edge terminates TLS and compresses. The task that set this up is finished and its file removed.

This task owns the sequence, checklists, URL and SEO policy, content model, translation gate, acceptance criteria, and agent execution plan.

## Decisions

Each decision is recorded in full, with the alternatives that lost, in the step named.

| ID | Decision | Rationale | Step |
|----|----------|-----------|------|
| D1 | Every page URL ends with `/` (`/`, `/pricing/`, `/fr/pricing/`). Astro uses `trailingSlash: 'always'` and `build.format: 'directory'`. | Matches Astro's directory output and the URLs already in the sitemap and in Search Console. | 2 |
| D2 | nginx enforces the URL form: 301 from the slashless form, 301 from `…/index.html`, 404 for everything else unknown. | One URL per page without relying on canonical hints. Prototype verified locally. | 2 |
| D3 | Regional aliases (`en-us`, `en-au`, `en-gb`, `en-ca`, `en-ie`, `en-sc`, `nl-NL`) stop being pages. nginx 301s them to their target locale. The language switcher keeps them as display choices that link to the target URL. | They are byte-identical duplicates. A redirect consolidates signals and keeps old links working. | 2 |
| D4 | Alias redirects are hand-written in `nginx/locale-redirects.conf` and a unit test checks them against `localeAliasMap`. | Seven rarely changing rules. The test gives the same drift protection a generator would, without the extra tooling. | 2 |
| D5 | `localeConfig` gains `htmlLang`, `hreflang`, `ogLocale`, `dir` and `browserLanguages`. Every tag, direction and detection rule is derived from it. | Removes the hard-coded maps and fixes the invalid `ph` tag. | 2 |
| D6 | `BaseLayout` takes a typed `page` id and SEO props. A `SeoHead` component renders canonical, robots, alternates, Open Graph, Twitter and one JSON-LD `@graph`, and also renders `<slot name="head" />`. | Structured inputs make every page's head checkable. The slot stays for one-off extras. | 2 |
| D7 | JSON-LD per page type is fixed by the table in step 2, authored with `schema-dts` types. No `HowTo`, no ratings, `FAQPage` only where the FAQ is visible. `priceCurrency` is `GBP`. | Schema must match visible content. `HowTo` rich results were retired in 2023. The company is UK-based and the price is zero. | 2 |
| D8 | A page in a locale is indexable only when it is published and its review status for that locale is `reviewed` (fluent human) or `legacy` (live before this task, English copy unchanged since). Every other built page carries `noindex` and is left out of the sitemap and every `hreflang` set. | Agent translations can ship for visitors without being submitted to search before fluent review. | 2, 7 |
| D9 | Keep `@astrojs/sitemap` at `/sitemap-index.xml` with a `filter` driven by the indexability module. `hreflang` lives in HTML only. | The URL is already submitted. The output check, not the generator, is the guarantee. | 2 |
| D10 | Legal policies are committed Markdown snapshots in `src/content/policies/`, refreshed by `npm run policies:sync` and a daily workflow that opens a PR. They render at build time. English policy URLs are indexable. Localized policy URLs keep localized navigation, show a translated "English only" notice and the English text marked `lang="en"`, and carry `noindex`. | Crawlable text, no network at build, reviewable legal diffs, and no English presented as a translation. | 2 |
| D11 | Long-form localized copy lives in Astro content collections of YAML files, one file per page per locale, validated by Zod schemas in `src/content/schemas.ts` that Vitest also imports. Rich-text fields allow inline Markdown only. | Structured fields allow parity checks across 39 locales. YAML handles long prose better than TS strings. | 3 |
| D12 | Internal links in content are written `[text](page:<pageId>)` and resolved per locale at build. An unknown or unpublished page id fails the build. | Links always point to the right localized page and can never dangle. | 3 |
| D13 | Short interface strings stay in `src/i18n/*.ts` and `t()`. One `tf(key, params, locale)` in `src/i18n/index.ts` adds `{placeholder}` interpolation, with the signature the homepage task chose, and the homepage imports it instead of defining its own. | Keeps the existing pattern and tooling, with one interpolation helper. | 3 |
| D14 | Translation staleness is tracked. Per-locale lock files (`src/i18n/locks/<locale>.json`) record a hash of the English value each translation was made from. Content YAML records `translatedFrom`. Tests fail on stale or unconfirmed entries. | English copy changed in January without any locale following (bug B13). | 3 |
| D15 | English-identical values are allowed only when listed in the locale's lock file. The baseline lists today's values, including `pcm`'s 83. The threshold of 5 per locale is removed. | The current threshold silently allows untranslated strings. | 3 |
| D16 | The feature registry is a typed TS module, `src/data/features.ts` (with `use-cases.ts` and `types.ts`). It is English, internal, never rendered verbatim, and transcribed from the registry in the site plan. | Product truth in one checked place. Pages reference feature ids, so depicting a non-available feature fails a test. | 3 |
| D17 | A page registry, `src/site/pages.ts`, lists every page id, path, type, parent, navigation placement and published flag. Routes, navigation, footer, breadcrumbs, sitemap and checks all read it. | One source for site structure, so navigation can only show published pages. | 3 |
| D18 | Slugs are English in every locale (`/fr/features/split-expenses/`). | Stable ids, a trivial switcher and trivial `hreflang`. Localized slugs add translation and redirect work for a marginal gain. | 3 |
| D19 | Keep the `[...locale]` rest-parameter routes and add nested routes under it. Aliases are no longer generated. Enable `experimental.failOnPrerenderConflict`. | No duplicate page files per locale, and any future route collision fails the build. | 2, 6 |
| D20 | Add a `/use-cases/` hub alongside `/features/`. Articles live under `/guides/<slug>/`. | The navigation item and breadcrumbs need a parent page. | 3, 8 |
| D21 | The header has four plain links (Features, Use cases, How it works, Pricing), shown only once the page is published, with no dropdown menus. Mobile navigation is a Popover API panel (`popover` and `popovertarget`) with no script. | Accessible by default, Escape and light dismiss are built in, and links stay visible in browsers without popover support. | 5 |
| D22 | The footer and breadcrumbs are generated from the page registry. Footer group headings are `h2`. Breadcrumbs appear on pages at depth two or more, with matching `BreadcrumbList` JSON-LD from the same data. | No hand-maintained link lists, and the heading order is fixed. | 5 |
| D23 | Reusable `FeaturePageLayout`, `UseCasePageLayout` and `HubLayout` take typed content entries. `WorkedExample` computes balances and transfers from example data at build time. | Numbers in 39 languages cannot drift from the arithmetic. | 5 |
| D24 | Fonts. No third-party font requests and no CSS `@import`.<br>• Latin, Cyrillic and Greek locales use self-hosted Fontsource WOFF2 (Inter variable, Space Grotesk 600 for Latin headings), with exactly two preloads (Inter latin, Space Grotesk latin) and metric-adjusted fallbacks (`size-adjust`, ascent overrides).<br>• Arabic-script (`ar`, `fa`, `ur`) and Indic (`hi`, `bn`, `te`) locales get one self-hosted Noto Sans variable subset each, loaded only on their own locale with no preload.<br>• CJK locales (`ja`, `zh`, `ko`) use system font stacks with no webfont.<br>The homepage task's H4 implements it. | Removes 48 third-party requests and the render-blocking chain. CJK subsets cannot get small: Japanese text touches about 40 unicode-range slices, which is 1.03 MiB on `/ja/`, and per-page glyph subsetting breaks caching and reruns on every copy change. Platform CJK fonts are high quality, and `lang` selects the right glyphs. | 5 |
| D25 | `CanopyBloom`, `FloatingParticles`, `MagicalCursor` and the `--scroll-progress` listener are retired site-wide, together with the tsParticles dependencies. Confetti loads only when first triggered. The homepage task's H4 does this for `EasterEggs`; the old homepage's static import goes when H11 deletes that page, and P31 makes the pricing page's confetti lazy. | 148 KB of script and permanent animation loops for no content value. Both plans agree. | 5 |
| D26 | Screenshots live in `src/assets/screenshots/<shot>/<locale or neutral>.png` and render through `astro:assets` `<Picture>`. A shot marked localized fails the build when the locale's file is missing. | No silent English screenshot in a localized page. | 6 |
| D27 | Social cards are language-neutral 1200×630 PNGs built with `sharp` by `src/pages/og/[card].png.ts` at `/og/<card>-<logoLocale>.png`. They are referenced by absolute URL with `?v=<hash>`, and nginx sends `Cross-Origin-Resource-Policy: cross-origin` for `/og/`. | Text-on-image generators cannot shape Arabic and Indic scripts. `og:title` already carries the localized text. | 6 |
| D28 | No client analytics. Measurement is Search Console plus a first-party launch counter in this repo's nginx: `/go/register/` and `/go/app/` (with `from`, `cta` and `lang`) return a 302 to fixed production URLs, passing only a validated `lang`. They write a separate minimal JSON log line (time, target, `from`, `cta`, `lang`, bot flag) with no IP address, user agent or referrer. Links carry `rel="nofollow"`, and robots.txt disallows `/go/`. This implements site plan D1 and D5. | Keeps the "no analytics" promise while still counting launch clicks by page and position, and no open redirect is possible. | 1, 2, 6 |
| D29 | Output checks are Vitest tests (`vitest.site.config.ts`, `src/__site_tests__/`) that parse `dist/` with `cheerio`. An nginx smoke script replays the legacy URL inventory against the built image. | Vitest imports the TS registries directly. One runner, typed rules. | 2 |
| D30 | `npm run verify` (tests, i18n audit, `astro check`, build, output checks) runs in a CI `verify` job that gates image build and deploy. The Dockerfile builder also runs the output checks, so the manual deploy is gated. On `redesign` it runs in English-first mode (D38). The owner turns on branch protection for `main`. | The translation "merge gate" is not enforced anywhere today (bug B15). | 2 |
| D31 | Unreviewed translations. Agents translate (`machine`). A second, independent agent back-translates each page into English and checks it against the source (`checked`). Only `checked` or `reviewed` content may reach `main`. `checked` pages ship in every locale for visitors but stay `noindex` until a fluent human sets `reviewed`. Rewriting a page's English (the homepage and pricing in the first release) ends its `legacy` status. Once the first release ships, and until reviewers exist, only English is indexed. A locale whose Search Console baseline shows at least 50 clicks a month on legacy pages is first in line for a reviewer. | Follows the rule that financial claims and jokes need fluent review before indexing, without blocking the release. Matches site plan D6 (English first). Back-translation catches wrong numbers, limits, claims and broken jokes before visitors see them. | 6, 7 |
| D32 | Product inputs come from the site plan: feature registry, page set, briefs, the three first feature and use-case pages, pricing promise and proof list. Packages read them there and do not wait for separate owner sign-off. | Owner instruction. | 4 |
| D33 | Product screenshots come from the capture script site plan D14 puts in the app repository: a seeded fictional scenario on a local stack, all 39 locales, desktop and mobile, plus a JSON manifest. This repo owns the shot list (from the site plan), optimization and placement. Manual English captures are allowed only as `placeholder-en` shots, which render on English pages only and are omitted elsewhere. | Reproducible, never real user data, and localized pages never show the wrong language. | 6 |
| D34 | Each package runs on its own branch in its own git worktree. Only the coordinator merges, and only the coordinator edits the task plans in `tasks/*.md`. W0–W1 packages that add no user-facing string merge into `main`; everything else merges into the long-lived `redesign` branch, which reaches `main` once, in W4c (D38). | Parallel agents never share a working tree or a file, the technical SEO repairs reach production early, and `main`, which deploys on every push, never carries untranslated keys. Per-wave integration branches were dropped when translation moved to the end. | Agent plan |
| D35 | Tagalog keeps its `/ph/` URL prefix and the app's `?lang=ph` code. It emits `hreflang="tl"` and `lang="fil"`. No redirect. | Lighthouse SEO fails on every page (92) only because `ph` is not a language code. The prefix is a path, and language is signalled by the tags. Renaming to `/fil/` would cost a redirect and an app-side code mapping for no search benefit. | 2 |
| D36 | Performance and accessibility thresholds are fixed numbers, measured with the baseline method (see [Acceptance criteria](#acceptance-criteria)). | The acceptance criteria referred to "agreed thresholds" that did not exist. | 6 |
| D37 | This task and the homepage task share one schedule and one file-ownership table (see [Joint schedule with the homepage task](#joint-schedule-with-the-homepage-task)). Site-wide chrome, fonts and effects belong to the homepage task's H4. Everything else shared is sequenced there. | Both plans claimed `BaseLayout.astro`, `global.css`, `package.json` and `en.ts`. | Agent plan |
| D38 | Translation is the last step. All English work (pages, shell, homepage, pricing, checks) is finished on `redesign` before T1–T6 translate everything in one pass in W4a. On `redesign`, `translations.test.ts`, `content.test.ts`, `audit` and route generation run in English-first mode (`I18N_MODE=english-first`): a key may be missing from, or extra in, a non-English locale only when it is listed in `src/i18n/pending/keys.json`, and a content entry may be missing only for a page listed in `src/i18n/pending/pages.json`. A locale missing any key, or a page/locale missing its entry, builds no localized route, so no English fallback is built at a localized URL. Layouts are checked before translation in four preview-only pseudo-locales built under `PREVIEW_PSEUDO=1`: `xx-long` (English, accented and 40% longer), and `xx-ar`, `xx-ja` and `xx-hi` (sample text in Arabic, Japanese and Devanagari script at the English length, with that script's `lang`, `dir` and `fontScript`). Every other mode is strict: both manifests must be empty and every locale complete. Only `main` deploys, and it only ever runs strict. | Owner instruction. English copy settles before anyone translates it, so each locale is translated once, in a consistent pass, instead of after every copy change. `main` auto-deploys on push, so English-only work stays off it. Rejected: per-wave integration branches with interleaved translation (more retranslation as copy changes), and feature flags on `main` (English-only code on the deploying branch). | Agent plan, 7 |

## Audit summary

The site plan's technical problems were checked against the code and a real build.

| Claim in the site plan | Verdict | Evidence |
|---|---|---|
| No page emits a canonical URL | Confirmed | 0 of 231 HTML files have `rel="canonical"`. |
| `og:url` is absent | Confirmed | 0 of 231 files. |
| Social image paths are relative | Confirmed, and the image is the wrong shape | `og:image` and `twitter:image` are `/images/<locale>/logo-transparent.png`, a 1200×377 transparent PNG used with `summary_large_image`. |
| Page JSON-LD goes to a head slot that is not rendered | Confirmed | `BaseLayout.astro` has no `<slot name="head" />`. `SoftwareApplication` appears in 0 files and `FAQPage` in 0 files. |
| `og:locale` maps only five languages | Confirmed | 211 files say `en_US`. Arabic is mapped to `ar_AE` while its `intlCode` is `ar-EG`. |
| Regional aliases duplicate content and are in the sitemap but not in `hreflang` | Confirmed | 7 aliases × 5 pages = 35 sitemap URLs. `/en-gb/` is byte-identical to `/` once Astro's scoped-CSS attributes are removed, and the other aliases differ only in the switcher label. Every English choice in the switcher links to an alias URL. |
| Policy text is fetched in the browser | Confirmed, and worse | Crawlers get "Loading policy..." only. 138 of 230 sitemap URLs are policy pages. The app's policy endpoints have no language parameter, so all 38 localized policy pages show English text under a localized title. The fetch ships 67 KB of `marked` and DOMPurify. |
| URL generation mixes slash forms | Confirmed | The sitemap uses the slash form throughout. `hreflang` uses `/ar` for homes and `/ar/pricing/` for subpages. Footer links are `/pricing` and `/fr/pricing`. Switcher links are `/fr` and `/fr/pricing/`. nginx answers 200 for `/pricing`, `/pricing/` and `/pricing/index.html`. |
| The build warns that `[...locale]` routes conflict with root routes for `/`, `/pricing`, `/privacy`, `/terms`, `/cookies` | Not reproduced | `npm run build` (in place and in an isolated copy) and `astro dev` print no router or prerender conflict warning, and every one of the 231 files is generated once. There are no root page files: `/` and `/pricing/` come from `[...locale]/*.astro` with `locale: undefined`. The only warning is Vite's unused-import notice from Astro's own `remotePattern.js`. In dev, `/nope` logs `NoMatchingStaticPathFound` because `[...locale]/index.astro` matches any single segment, which is harmless. A collision would only appear if someone added a root page such as `src/pages/pricing.astro`, or a locale code equal to a page slug. Astro 5 would then keep the higher-priority route and only warn. D19 turns that into a build failure, and a registry test keeps locale codes and top-level slugs disjoint. |
| "Translation keys are complete … `npm run i18n audit` passes" | True, but the gate is weak | `audit` exits 0 even with missing keys, verified on a scratch copy with `cta.button` removed from `fr`. The tests allow 5 English-identical values per locale, or 100 for `pcm`. Stale translations go undetected. CI runs no tests at all. |
| "Firebase application" in the out-of-scope list | Stale | The external app is `wl-bill-splitter`: Postgres and its own API, with Firebase used only for authentication. It has been in production at `app.sidebadger.me` since 14 October 2026 (commit `2f9b773` points this site at it), with staging at `staging.sidebadger.me`. This file now says "the external app". |

The other defects found are listed in [Bugs found during audit](#bugs-found-during-audit).

Counts used in this plan: **39 translated locales** (`en` plus 38 others, one file each in `src/i18n/`) and **7 regional aliases**. That is 46 URL prefixes today. After D3 it is 39.

## Baseline

The local lab baseline is in [baseline measurements](./baseline-measurements.md), taken at `bc01126` on 14 October 2026 with Lighthouse 13.5.0 against the production image behind a local brotli proxy that stands in for the edge. Every later comparison uses the same method (step 1). The coordinator fills the remaining rows from P01 and the owner's exports.

| Measure | Value |
|---|---|
| HTML files built | 231: 46 prefixes (39 locales and 7 aliases) × 5 page types, plus `404.html` |
| Sitemap URLs | 230, including 35 alias URLs and 138 policy URLs |
| Homepage HTML | 75 KB raw, 12 KB brotli |
| Largest scripts | `FloatingParticles` 148 KB raw (on every page), `PolicyPage` 67 KB, confetti 11 KB |
| Translation keys | 196 in `en.ts` |
| Lighthouse mobile, median (`/`, `/pricing/`, `/ja/`, `/ar/`) | performance 78, 79, 73, 75; simulated LCP 5.0, 5.0, 7.3, 6.0 s; CLS ≤ 0.074; TBT ≤ 14 ms |
| Lighthouse desktop, median | performance 97, 99, 96, 96; LCP 1.0 to 1.3 s |
| Lighthouse accessibility and SEO | accessibility 95, 100, 95, 98; SEO 92 on every page (the invalid `ph` `hreflang`, B9) |
| Requests on `/` | 61, of which 48 are third-party (Google Fonts, 42 flags from jsDelivr) |
| Lighthouse for `/privacy/` (same method) | P01 |
| PageSpeed Insights and CrUX on production for `/` and `/pricing/` | Owner |
| Search Console coverage, queries, impressions, clicks (last 3 months) | Owner |
| App-launch conversion | Not measurable before `/go/app/` ships (D28). Counting starts at release. |

## Inputs

### Available

- The current Astro marketing site, its English and localized copy, and the pricing and policy pages.
- This audit.
- The production app at `https://app.sidebadger.me`. It accepts the same 39 locale codes through `?lang=`. Its policy endpoints are `/api/policies/{privacy-policy,terms-of-service,cookie-policy}/text` (Markdown as `text/plain`, English only, with tenant tokens substituted for the requesting host) and `/api/policies/{id}/current` (JSON with `currentVersionHash` and `createdAt`).

### From the site plan

These come from [the site plan](./seo-site-expansion-plan.md) (D32) and are settled there. Packages read them there and do not wait for separate owner sign-off:

- the authoritative feature list, with each feature's status (available, beta, planned, retired or tenant-dependent), limits and prerequisites;
- the primary audience and priority markets;
- the approved page set, including the three first feature pages and the three first use-case pages, with a brief for each;
- the pricing promise, "Free. No ads. No daily limits." (site plan D2), which replaces "free forever" and "free until it isn't";
- the proof list: screenshots, demonstrations and worked examples (there is no customer evidence, and none is published);
- white label stays off the public site (site plan D4).

If a package finds an item missing or contradictory, it finishes the mechanics, stops, and reports it to the coordinator. It does not invent product facts.

### Owner actions and external dependencies

These need accounts, people or another repository that agents cannot reach. None of them blocks implementation or merges. Each has the default the build proceeds with.

| Dependency | Owner action | Default until it arrives |
|---|---|---|
| Search Console | Confirm the domain property, submit the sitemap, export the baseline reports. | Briefs use their query hypotheses; the 4-, 8- and 12-week reviews start once access exists. |
| Production Lighthouse and CrUX | Run PageSpeed Insights on production, or approve an agent running it. | Acceptance uses the local lab method in [baseline measurements](./baseline-measurements.md); the field-data row stays empty. |
| Branch protection | Require the `verify` check and pull requests on `main`. | The coordinator merges only branches whose `verify` job is green; the CI gate still blocks deploys. |
| Policy-sync pull requests | Allow GitHub Actions to create and approve pull requests. | The workflow fails visibly at the PR step; the coordinator runs `npm run policies:sync` and opens the PR by hand before W4c. |
| Loki access | Read access to the edge box's Loki. | The `/go/` counter ships and logs; counts are read once access exists. |
| Fluent reviewers | Find reviewers for priority markets (step 7). | Only English is indexed after the first release (D31). |
| App-repo captures | The capture script and demo scenario in `wl-bill-splitter` (site plan follow-up 9). | P35 waits. P39 releases with `placeholder-en` shots on English pages only and no screenshots on localized pages; the worked examples and HTML diagrams carry the proof. P35 then runs as a follow-up release. |

## Bug handling

Fix bugs discovered while completing this task when the cause and correction are within the marketing site and can be verified as part of the same change. Add a regression test when the defect is likely to recur or affects generated output across many routes.

Create a separate task for a defect when it:

- belongs to the external application or another repository;
- requires a product decision unrelated to the restructuring;
- is large enough to obscure or delay the current milestone;
- cannot be verified safely with the available environment or evidence.

Record the separate task before continuing so the defect is not lost. Security, data-loss, accessibility-blocking, and deployment-blocking defects take priority over the planned sequence.

## Information architecture

Use the structure proposed in [the site plan](./seo-site-expansion-plan.md#recommended-site-structure) as the starting point and its page set as the source (D32). Merge or remove pages that would be repetitive or thin.

URL patterns (D1, D18, D20):

| Page | English URL | Localized URL | Type | Indexing |
|---|---|---|---|---|
| Home | `/` | `/fr/` | `home` | per-locale review (`legacy` today) |
| How it works | `/how-it-works/` | `/fr/how-it-works/` | `how-it-works` | per-locale review |
| Features hub | `/features/` | `/fr/features/` | `hub` | per-locale review |
| Feature | `/features/<slug>/`: first release `split-expenses`, `settle-up`, `multiple-currencies`; release 2 `receipt-scanning`, `groups-and-permissions`, `lists-and-polls` | `/fr/features/<slug>/` | `feature` | per-locale review |
| Use cases hub | `/use-cases/` | `/fr/use-cases/` | `hub` | per-locale review |
| Use case | `/use-cases/<slug>/`: first release `group-trips`, `housemates`, `events-and-celebrations`; release 2 `couples` | `/fr/use-cases/<slug>/` | `use-case` | per-locale review |
| Pricing | `/pricing/` | `/fr/pricing/` | `pricing` | per-locale review (`legacy` until revised) |
| Privacy, Terms, Cookies | `/privacy/`, `/terms/`, `/cookies/` | `/fr/privacy/` … | `legal` | English only; localized versions `noindex` |
| Comparison (release 2) | `/compare/splitwise/` | `/fr/compare/splitwise/` | `comparison` | per-locale review |
| Guide (step 8) | `/guides/<slug>/` | `/fr/guides/<slug>/` | `article` | per-locale review |
| Not found | served for any unknown path | the same page, localized in the browser | none | never |

Slugs come from the site plan's page set (site plan D7, D8, D9). `/use-cases/clubs-teams-and-work/` and `/about/` are dropped. The `comparison` type uses a `comparePages` collection with the same schema rules as feature pages plus an `asOf` date, which `content.test.ts` requires to be under 92 days old for published pages (site plan D16). Locale prefixes are the `localeConfig` keys (`ar`, `nl-BE`, `ph`, …) and do not change. Only the language tags emitted in HTML change (D5).

## Work plan

Each step lists its decisions (with the alternatives that lost), the files to create or change, an ordered checklist, and how to verify it. Package ids (P01, P11 …) refer to the [Agent execution plan](#agent-execution-plan).

### 1. Establish measurement and constraints

#### Decisions

- **Measurement (D28).** Search measures come from Search Console. Page views come from nginx access logs, which already reach the edge box's Loki through container stdout. Launch clicks are counted by the first-party counter in D28 (design in 2.2). The body's primary call to action, "Create a free account", goes through `/go/register/` to `https://app.sidebadger.me/register`. The header's "Open the app" goes through `/go/app/` to `https://app.sidebadger.me/dashboard`. Both follow site plan D1. Weekly, the owner compares `/go/register/` totals with the app's aggregate sign-up count, which is a follow-up in the app repo.
  - Rejected: a cookieless analytics script. It contradicts the "No analytics" copy in `whyFree.trackers.desc` and pricing FAQ 3.
  - Rejected: app-side attribution by `from`. It needs a change in the app repo. If wanted later it is a separate task there, and the `from` parameter is already passed through.
- **Performance baselines.** Lab baselines use the method in [baseline measurements](./baseline-measurements.md):
  - the production Docker image behind a local brotli and gzip proxy standing in for the edge, which compresses while the container does not;
  - Lighthouse 13.5.0 with simulated throttling, three runs per page and device, median per metric.

  Every later comparison (step 6, the homepage task) uses this method, because local numbers are only comparable with local numbers. Field data (CrUX) and production lab data come from PageSpeed Insights, run by the owner.
- **URL policy.** Decided as D1 and D2 and implemented in step 2.

#### Files

- `scripts/lighthouse-local.sh` (new, `scripting` skill): builds the image, starts it behind the brotli proxy from the baseline method (the proxy script moves into `scripts/` from the scratchpad), and runs Lighthouse 13.5.0 three times per URL and device. Raw JSON goes to `tasks/baselines/<date>/lighthouse/`, and a median table goes to stdout.
- `tasks/baselines/2026-10/search-console/*.csv` (new, owner): Search Console exports.
- `src/__tests__/fixtures/legacy-urls.txt` (new): every URL in the current sitemap (230), one per line, used by the nginx smoke test.

#### Checklist

- [ ] Owner: confirm the `sidebadger.me` domain property in Search Console (DNS TXT record) and submit `https://sidebadger.me/sitemap-index.xml`.
- [ ] Owner: export the Performance report (last 3 months, by query, page, country and device) and the Pages indexing report into `tasks/baselines/2026-10/search-console/`.
- [ ] Owner: confirm that Loki retains `side-badger-website-me` container logs, and for how long.
- [x] Local Lighthouse and screenshot baseline for `/`, `/pricing/`, `/ja/` and `/ar/` ([baseline measurements](./baseline-measurements.md)).
- [ ] P01: make the baseline method repeatable as `scripts/lighthouse-local.sh` and add `/privacy/` to the baseline.
- [ ] Owner, or P01 with the owner's go-ahead: run PageSpeed Insights on production `/` and `/pricing/` and record field data if CrUX has any.
- [ ] P01: write `src/__tests__/fixtures/legacy-urls.txt` from the current build's `sitemap-0.xml`.
- [ ] Coordinator: fill in the remaining [Baseline](#baseline) rows.
- [x] Canonical URL and trailing-slash policy confirmed (D1, D2).

#### Verification

```sh
scripts/lighthouse-local.sh --urls /,/pricing/,/ja/,/ar/,/privacy/ --runs 3
wc -l src/__tests__/fixtures/legacy-urls.txt   # 230
```

Pass: the script reproduces the published baseline for `/` and `/pricing/` within run-to-run noise (performance ±3), reports `/privacy/`, and the fixture has 230 lines.

### 2. Repair the technical SEO foundation

#### Decisions

**2.1 URL form (D1).** Every page URL ends with `/`. `astro.config.mjs` sets `trailingSlash: 'always'` and `build.format: 'directory'`. All internal URLs come from `src/seo/urls.ts`:

- `localizedPath(pageIdOrPath, locale)` returns `/`, `/fr/` or `/fr/features/split-expenses/`;
- `absoluteUrl(path)` prefixes `import.meta.env.SITE`;
- `getLocalizedPath()` in `src/i18n/index.ts` keeps its signature but always returns the slash form, so existing callers are fixed without edits.

Rejected: the slashless form, because Astro writes `x/index.html` and the sitemap and Search Console already know the slash form. Rejected: serving both forms, which is today's duplicate.

**2.2 nginx URL policy (D2).** Verified locally against a build. `/pricing` → 301 `/pricing/`, `/pricing?x=1` → 301 `/pricing/?x=1`, `/pricing/index.html` → 301 `/pricing/`, `/en-gb/pricing` → one 301 to `/pricing/`, `/nl-NL/terms` → 301 `/nl-BE/terms/`, unknown → 404 page. `nginx/default.conf` changes:

```nginx
# Launch counter: lang is passed on only when it is a supported locale
map $arg_lang $side_badger_lang_query {
    default "";
    ~^(ar|bn|cs|cy|da|de|el|es|eu|fa|fi|fr|ga|hi|hr|hu|id|is|it|ja|ko|lv|nl-BE|no|pcm|ph|pl|pt|ro|sl|sr|sv|sw|te|tr|uk|ur|zh)$  ?lang=$arg_lang;
}
map $http_user_agent $side_badger_is_bot {
    default 0;
    ~*(bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python|httpclient)  1;
}
log_format side_badger_launch escape=json
    '{"type":"launch","time":"$time_iso8601","target":"$uri","from":"$arg_from",'
    '"cta":"$arg_cta","lang":"$arg_lang","bot":$side_badger_is_bot}';

# Social cards are fetched by other sites' previewers, everything else is ours
map $uri $side_badger_corp {
    ~^/og/   cross-origin;
    default  same-origin;
}

server {
    # … existing listen, root, real-ip, absolute_redirect off, body limit …
    # Replace the fixed CORP header with:
    add_header Cross-Origin-Resource-Policy $side_badger_corp always;

    # Regional alias URLs: one permanent hop to the locale they copied
    if ($side_badger_locale_redirect) {
        return 301 $side_badger_locale_redirect$is_args$args;
    }

    # /x/index.html is a file name, not a page URL
    if ($request_uri ~ "^([^?]*/)index\.html(\?.*)?$") {
        return 301 $1$2;
    }

    location / {
        # Page URLs end in a slash. A directory asked for without one gets
        # nginx's own 301 to the slash form.
        try_files $uri $uri/ =404;
    }

    # Hashed assets only: no directory answers
    location /_astro/ {
        try_files $uri =404;
    }

    # Launch counter (D28). Fixed targets, so no open redirect. Only a
    # validated lang is passed on. One minimal line per click, no address.
    location = /go/app/ {
        access_log off;
        access_log /dev/stdout side_badger_launch;
        return 302 https://app.sidebadger.me/dashboard$side_badger_lang_query;
    }
    location = /go/register/ {
        access_log off;
        access_log /dev/stdout side_badger_launch;
        return 302 https://app.sidebadger.me/register$side_badger_lang_query;
    }

    location = /health { access_log off; default_type text/plain; }
}
```

New `nginx/locale-redirects.conf`, included at `http` level because `conf.d/*.conf` is included inside `http {}`:

```nginx
# Regional aliases share their target's content (src/i18n/index.ts aliasConfig).
# A slashless path gets its slash here, so an old link takes one hop, not two.
map $uri $side_badger_locale_redirect {
    default "";
    ~^/(?:en-us|en-au|en-gb|en-ca|en-ie|en-sc)/?$                  /;
    ~^/(?:en-us|en-au|en-gb|en-ca|en-ie|en-sc)(?<a1>/[^.]*[^/.])$  $a1/;
    ~^/(?:en-us|en-au|en-gb|en-ca|en-ie|en-sc)(?<a2>/.+)$          $a2;
    ~^/nl-NL/?$                                                     /nl-BE/;
    ~^/nl-NL(?<n1>/[^.]*[^/.])$                                     /nl-BE$n1/;
    ~^/nl-NL(?<n2>/.+)$                                             /nl-BE$n2;
}
```

The `Dockerfile` copies `nginx/*.conf` into `/etc/nginx/conf.d/`. The `$uri.html` fallback is dropped: no page uses it. `absolute_redirect off` keeps `Location` headers as paths, as the existing config already does.

Rejected: relying on `rel=canonical` alone, because canonical is a hint and the duplicates stay crawlable. Rejected: Astro `redirects`, which in static output produce meta-refresh pages with status 200, not 301s.

**2.3 Regional aliases (D3, D4).** `getLocalePaths()` drops aliases, so 35 files and 35 sitemap URLs disappear. nginx 301s old alias URLs. The language switcher keeps the alias entries ("English (actual)", "Scotch" and the rest), links each to its target URL, and stores the chosen code in `localStorage['preferred-locale']` so the button can show the chosen flag after navigation. The server-rendered label on English pages stays "English (actual)".

Rejected: alias pages with a canonical to the target, which keeps building 7 × N duplicates and depends on a hint. Rejected: sitemap exclusion only, because the switcher still links to the duplicates. Rejected: distinct regional content, because there is no market evidence for it and it multiplies copy by seven. A regional variant becomes a full locale only when the site plan's priority markets justify it.

**2.4 Locale metadata (D5).** New fields on every `localeConfig` entry. Overrides from the default (the locale code itself):

| Locale | `htmlLang` | `hreflang` | `ogLocale` | `dir` | `browserLanguages` |
|---|---|---|---|---|---|
| `ph` | `fil` | `tl` (ISO 639-1 Tagalog; `ph` is not a language) | `fil_PH` | `ltr` | `fil`, `tl` |
| `zh` | `zh-Hans` (selects Simplified glyphs) | `zh` (all Chinese readers) | `zh_CN` | `ltr` | `zh` |
| `no` | `no` | `no` | `nb_NO` | `ltr` | `no`, `nb`, `nn` |
| `nl-BE` | `nl-BE` | `nl-BE` | `nl_BE` | `ltr` | `nl` |
| `ar`, `fa`, `ur` | code | code | from `intlCode` | `rtl` | code |
| `pcm` | `pcm` | `pcm` (no ISO 639-1 code exists, and Google may ignore it; no better tag) | `en_NG` | `ltr` | `pcm` |
| all others | code | code | `intlCode` with `-` → `_` | `ltr` | code |

`isRTL()` reads `dir`, which removes the stray `he`. `og:locale` comes from `ogLocale`. `LanguageDetection` matches `browserLanguages`.

For `ph` (D35), the URL prefix stays `/ph/` because it is a path, the app already uses `?lang=ph`, and language is signalled by `hreflang="tl"` (valid ISO 639-1, accepted by Lighthouse) and `lang="fil"`. Rejected: renaming to `/fil/` with a 301, which costs a redirect, an app-side code mapping and a fresh crawl for no search benefit.

**2.5 Head and structured data (D6, D7).** `BaseLayout` props:

```ts
interface Props {
  page: PageId | 'not-found';
  locale: Locale;
  title: string;
  description: string;
  ogCard?: OgCardId;         // default 'default'
  jsonLd?: JsonLdNode[];     // page-specific nodes; SeoHead adds the base nodes
}
```

`SeoHead.astro` renders, in this order: charset, viewport, `<title>`, description, robots `noindex` (non-indexable pages only), canonical and `og:url` (indexable pages: absolute, slash form, equal to each other), `hreflang` alternates and `x-default` (indexable pages only, from the cluster), Open Graph (`og:title`, `og:description`, `og:type`, `og:site_name`, `og:locale`, `og:image` absolute with width, height and alt), Twitter (`summary_large_image`, image and alt), theme colour, manifest, icons, one `<script type="application/ld+json">` with an `@graph`, and `<slot name="head" />`. `og:image:alt` is the brand name (`header.logoText`) for the default card. JSON-LD is serialized by `serializeJsonLd()`, which escapes `<` as `<`.

JSON-LD by page type (D7):

| Page type | Nodes in the `@graph` |
|---|---|
| every page except not-found | `WebSite` (`https://sidebadger.me/#website`), `Organization` (`#organization`, absolute logo), `WebPage` (`<canonical>#webpage`, `url`, `name`, `description`, `inLanguage` = `htmlLang`, `isPartOf` the website) |
| home | adds `SoftwareApplication`, exactly as the homepage task's "Structured data" section specifies (`@id` `{canonical}#app`, `featureList` from the depicted features, `publisher` = `#organization`, `offers` with price 0 and `priceCurrency` `GBP`, because site plan D2 says free). The homepage passes it through the `jsonLd` prop rather than the slot, so it joins the `@graph`. |
| pricing | adds `FAQPage` built from the visible FAQ. `WebPage.about` = the same locale's home `{canonical}#app`. |
| hub | `WebPage` becomes `CollectionPage`, plus an `ItemList` of child pages and a `BreadcrumbList` |
| feature, use case | adds `BreadcrumbList`, and `FAQPage` when the page shows a FAQ. `WebPage.about` = the same locale's home `#app`. |
| how it works | adds `BreadcrumbList` |
| legal (English) | `WebPage` with `dateModified` from the snapshot's `publishedAt` |
| legal (localized, `noindex`) | base nodes only |
| guide | adds `Article` (`headline`, `datePublished`, `dateModified`, `inLanguage`, `author` = organization) and `BreadcrumbList` |
| not-found | none |

Rejected: slot-only JSON-LD, which is what silently broke here. Rejected: `HowTo`, retired as a rich result in 2023. Rejected: `AggregateRating` and `Review`, because no genuine data exists.

**2.6 Indexability, sitemap and `hreflang` (D8, D9).** `src/seo/indexability.ts` exports `isIndexable(pageId, locale)`. It is true only when:

- the page is published in the registry;
- the locale's review status is `reviewed` or `legacy` (English is always `reviewed`);
- for `legal` pages, the locale is `en`;
- the page is not the not-found page.

Review status comes from the content entry's `review.status` for collection pages, and from `pages` in `src/i18n/locks/<locale>.json` for pages built from i18n keys (home, pricing).

The `hreflang` cluster for a page is every locale where it is indexable, each pointing at its canonical URL, plus `x-default` → the English URL. Only indexable pages emit a cluster.

`astro.config.mjs` passes `sitemap({ filter })`, where the filter maps the URL back to a page and locale through `src/site/routes.ts` and calls `isIndexable`. `robots.txt` gains `Disallow: /go/`.

Rejected: a hand-written sitemap endpoint, which is more code than the filter for the same result. Rejected: `xhtml:link` alternates in the sitemap, which would be a second source for `hreflang`.

**2.7 Policy pages (D10).**

- Snapshots: `src/content/policies/{privacy-policy,terms-of-service,cookie-policy}.md`. Frontmatter holds `policyId`, `sourceUrl`, `versionHash`, `publishedAt` (the app's `createdAt`) and `fetchedAt`. The body is the `/text` response with its leading `#` heading removed, because the page renders its own visible `h1`.
- `scripts/sync-policies.mjs` follows the `scripting` skill. It takes `--origin` (default `https://app.sidebadger.me`), `--dry-run` and `--help`, uses a 15 s timeout per request, and checks that the response status is 200 with `text/plain`, a non-empty body and a leading heading. It writes atomically and exits 1 on any failure without touching the snapshots. It reads `/current` for `currentVersionHash` and `createdAt`.
- `.github/workflows/policy-sync.yml` runs daily and on demand, runs the script, and opens a PR titled "Update legal policy snapshots" with `peter-evans/create-pull-request@v7` when anything changed.
- A `policies` collection in `src/content.config.ts` (glob loader, Zod schema) is rendered by Astro's Markdown pipeline at build. The build fails if a snapshot is missing or fails the schema. The build never touches the network.
- `PolicyPage.astro` renders a visible `h1` (fixing the `sr-only` title), "Last updated" with the date formatted for the locale through `Intl`, and the body inside `<div lang="en">`. On non-English pages it adds a translated notice, `policy.englishOnly`.
- Keys: add `policy.englishOnly` and `policy.lastUpdated`. Remove `policy.loading` and the five `policy.error.*` keys.
- Dependencies: remove `dompurify`, `@types/dompurify` and `marked-smartypants`. Keep `marked` for build-time rich text (step 3) and `github-markdown-css` for policy styling.

Rejected: fetching at build time, which makes deploys depend on the app's uptime and ships legal changes without review. Rejected: `noindex` for all policy pages, which hides the trust pages. Rejected: 301 from localized to English policy URLs, which breaks in-language navigation and the switcher. Translated legal text is an app-repo matter (see Out of scope).

**2.8 Build-time output checks (D29).** `vitest.site.config.ts` runs `src/__site_tests__/*.test.ts` against `dist/`, parsing with `cheerio`. `npm run check:site` runs them after `npm run build`. `vitest.config.ts` excludes `src/__site_tests__/`, so `npm test` needs no build. The rules:

1. Every HTML file maps to a registry page and locale, or is `404.html`. Every published page and locale has a file, except, in English-first mode, the page/locale pairs D38 excludes. No alias directories exist.
2. Indexable pages have exactly one canonical: absolute `https://sidebadger.me`, slash form, equal to the page's own URL, and equal to `og:url`.
3. Non-indexable pages have `<meta name="robots" content="noindex">`, no canonical and no alternates.
4. Each page has exactly one `h1`, with non-empty text that is not inside `.sr-only`.
5. `<title>` and meta description are present and non-empty, and unique among indexable pages in the same locale.
6. `html[lang]` equals the locale's `htmlLang`, and `dir` equals its `dir`.
7. `hreflang`: every member of a cluster lists the same set, including itself and `x-default`. Every target exists, is indexable, and uses the configured `hreflang` tag.
8. The sitemap URL set equals the set of indexable canonical URLs. `robots.txt` names the absolute sitemap URL and disallows `/go/`.
9. Every internal `href` resolves to a file in `dist/`. Page links are slash form. No link points at an alias prefix. Links stay in the page's own locale, except language-switcher links (marked `data-locale-switch`).
10. `og:image` and `twitter:image` are absolute `https` URLs, the file exists in `dist/`, and it is 1200×630 (checked with `sharp`).
11. Every JSON-LD block parses. The node types required for the page type are present. Every `FAQPage` question appears in the visible text. `BreadcrumbList` items match the visible breadcrumb. `WebPage.url` equals the canonical.
12. No visible text or attribute value (script and style bodies excluded, because bundled code legitimately says `undefined`) contains `__NGINX_HOST__`, `undefined`, `NaN`, `[object Object]`, `TODO`, `TBD`, `{{`, `data-unpublished` or `data-pseudo`. No file at all contains `staging.sidebadger.me`.
13. English fallback: on a non-English page, any visible text node of 25 characters or more that is identical to a text node on the English page must be in that locale's approved-identical list. Content inside `[lang="en"]` (legal bodies) is exempt.
14. Every `img` has an `alt` attribute. Content images have `width` and `height`.
15. Every link to the app goes through `/go/app/` or `/go/register/` with `from`, `cta` and, outside English, `lang`, and carries `rel="nofollow"`.

**2.9 nginx smoke test and CI gate (D30).**

- `scripts/check-nginx.sh` follows the `scripting` skill. It runs the built image, replays `legacy-urls.txt`, and asserts:
  - each English or locale URL returns 200;
  - each alias URL returns exactly one 301 to a 200;
  - the slashless form and `…/index.html` each return one 301 to the slash form;
  - `/nope` returns 404 with the site's 404 page;
  - `/go/app/?from=home&cta=header&lang=fr` returns a 302 to `https://app.sidebadger.me/dashboard?lang=fr`; `lang=evil` and any other parameter are dropped; `/go/register/` goes to `/register`; the launch log line carries no IP address;
  - each of the seven security headers appears once;
  - `/og/default-en.png` has `Cross-Origin-Resource-Policy: cross-origin`.
- `src/__tests__/nginx-config.test.ts` checks that the alias map in `nginx/locale-redirects.conf` matches `localeAliasMap` exactly, that the `lang` map lists exactly the non-English `locales`, and that the `/go/app/` and `/go/register/` targets use `getAppUrl()`'s origin.
- Retention (owner; default in [Owner actions and external dependencies](#owner-actions-and-external-dependencies)): Loki keeps the `"type":"launch"` lines for 30 days. A weekly LogQL query appends daily totals by target, `from`, `cta` and `lang`, excluding bots, to a sheet the owner keeps. The query text lives in `scripts/launch-totals.logql` (P14).
- `package.json`: `verify` runs `npm test -- --run && npm run i18n:audit && astro check && npm run build && npm run check:site`. `I18N_MODE` selects strict (the default) or English-first mode (D38); CI sets English-first only on `redesign` and pull requests into it.
- `.github/workflows/deploy.yml` gets a `verify` job on `push` and `pull_request` (Node 22, `npm ci`, `npm run verify`). `build-and-push` needs `verify`, builds the image with `load: true`, runs `scripts/check-nginx.sh` against it, then pushes.
- The `Dockerfile` builder runs `npm run build && npm run check:site`, which also gates `scripts/deploy.sh`.
- `experimental.failOnPrerenderConflict: true` goes in `astro.config.mjs` (D19).

#### Files

| File | Change | Package |
|---|---|---|
| `astro.config.mjs` | `trailingSlash`, `build.format`, `failOnPrerenderConflict`; sitemap `filter` | P11, then P12 |
| `src/i18n/index.ts`, `src/i18n/pseudo.ts` (new) | locale metadata fields (including `fontScript` for the homepage task's H4); derived maps; `tf()`; slash-form `getLocalizedPath`; `getLocalePaths()` without aliases; `isRTL` from `dir`; English-first route exclusion and the preview pseudo-locales (D38) | P11 |
| `src/site/pages.ts`, `src/site/routes.ts` (new) | page registry with today's five page types; `pathsFor(pageId)`, `pathsForType(type)`, `pageForPath(path)` | P11 |
| `src/seo/urls.ts` (new) | `localizedPath`, `absoluteUrl`, `canonicalFor` | P11 |
| `src/pages/robots.txt.ts` | `Disallow: /go/` | P11 |
| `src/seo/indexability.ts`, `src/seo/alternates.ts`, `src/seo/jsonld.ts` (new) | D8, cluster builder, JSON-LD builders and `serializeJsonLd` | P12 |
| `src/components/layout/SeoHead.astro` (from P03) | full head per 2.5 | P12 |
| `src/layouts/BaseLayout.astro` | new props; passes them to `SeoHead`; `<html lang dir>` from `htmlLang` and `dir` | P12 |
| `src/components/HomePage.astro`, `src/components/PricingPage.astro` | pass `page` and `jsonLd` props; delete the `slot="head"` fragments | P12 |
| `src/pages/404.astro` | `page="not-found"`; slash-form `localePaths`; no alternates | P12 |
| `src/components/LanguageSwitcher.astro`, `src/styles/language-switcher.css`, `src/components/LanguageDetection.astro`, `public/flags/*.svg` (new), `getFlagUrl` in `src/i18n/index.ts` | D3 switcher behaviour, detection via `browserLanguages`, self-hosted flags, keyboard support | P15 |
| `src/components/PolicyPage.astro`, `src/styles/policy.css`, `src/pages/[...locale]/{privacy,terms,cookies}.astro`, `src/content.config.ts` (new), `src/content/policies/*.md` (new), `scripts/sync-policies.mjs` (new), `.github/workflows/policy-sync.yml` (new), `src/i18n/en.ts` (policy keys; translated in W4a) | 2.7 | P13 |
| `src/pages/og/[card].png.ts` (new), `src/assets/og/default.png` (new) | default 1200×630 social card (D27), so output check 10 holds from W1b | P12 |
| `src/seo/urls.ts` `launchHref(pageId, locale)`; `src/components/layout/SiteHeader.astro`, `HomePage.astro`, `PricingPage.astro` launch links | every launch link goes through `/go/app/` from W1b (D28) | P11 (helper), P12 (call sites) |
| `nginx/default.conf`, `nginx/locale-redirects.conf` (new), `scripts/check-nginx.sh` (new), `src/__tests__/nginx-config.test.ts` (new) | 2.2, 2.9 | P14 |
| `vitest.site.config.ts` (new), `vitest.config.ts`, `src/__site_tests__/*.test.ts` (new) | 2.8 | P16 |
| `src/__tests__/site-structure.test.ts` (new) | ids and paths unique; slugs disjoint from locale codes; parents exist | P11 |
| `package.json`, `.github/workflows/deploy.yml`, `Dockerfile`, `scripts/deploy.sh`, `AGENTS.md` | 2.9 wiring, English-first mode in CI; documentation | P05, P19 |

#### Checklist

- [ ] Add canonical URLs to every indexable page (P12).
- [ ] Add `og:url` and absolute social image URLs (P12).
- [ ] Add a rendered head slot and typed SEO props to `BaseLayout.astro` (P12).
- [ ] Restore visible-page-specific JSON-LD for the homepage and pricing page (P12).
- [ ] Generate `og:locale`, `lang`, `dir` and `hreflang` from locale metadata (P11, P12).
- [ ] Stop building alias pages, and 301 alias URLs in nginx (P11, P14, P15).
- [ ] Enforce the slash URL form in Astro, in every generated link, and in nginx (P11, P14).
- [ ] Align sitemap, `hreflang`, canonical and route generation through the indexability module (P12).
- [ ] Pre-render policy pages from committed snapshots, with `noindex` on localized versions (P13).
- [ ] Add output checks for metadata, one `h1`, internal links, schema inclusion and locale alternates (P16).
- [ ] Add the nginx smoke test and the CI `verify` gate (P14, P05, P19).
- [ ] Fix the related defects assigned to step 2 in [Bugs found during audit](#bugs-found-during-audit).

#### Verification

```sh
npm test -- --run          # unit tests, including nginx-config and site-structure
npm run i18n:audit         # exits 0
npm run build              # no warnings beyond Vite's remotePattern notice
npm run check:site         # all output rules pass
scripts/check-nginx.sh     # builds and runs the image; legacy URLs, redirects and headers
grep -c '<loc>' dist/sitemap-0.xml   # 39 × 2 (home, pricing) + 3 English legal = 81 before new pages
```

Pass:

- every command exits 0;
- `dist/` has no `en-*` or `nl-NL` directories;
- on `redesign` (P13), `dist/privacy/index.html` contains the policy text with no client script;
- `dist/pricing/index.html` contains `FAQPage`;
- `dist/index.html` contains `SoftwareApplication`;
- `dist/ph/index.html` has `lang="fil"`;
- `dist/fr/privacy/index.html` has `noindex`.

### 3. Create the content model

#### Decisions

**3.1 Feature registry (D16).** `src/data/types.ts`:

```ts
export type FeatureStatus = 'available' | 'beta' | 'planned' | 'retired' | 'tenant-dependent';
export type ProofKind = 'screenshot' | 'demo' | 'documentation' | 'worked-example';

export interface Claim {
  id: ClaimId;                         // stable, e.g. 'balances.fewer-payments'
  text: string;                        // approved English wording
}

export interface FeatureRecord {
  id: FeatureId;                       // the site plan's ids: 'groups', 'invites', 'expense-splitting', 'settlements', …
  homePage: PageId | null;             // the page that covers it, e.g. 'feature/settle-up'
  capability: string;                  // plain-English statement, internal
  problem: string;                     // the user problem it solves
  audiences: { primary: AudienceId[]; secondary: AudienceId[] };
  status: FeatureStatus | 'not-offered';
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];                  // app-repo paths, read at the commit below
  verifiedAt: string;                  // app commit
  limits: string[];
  prerequisites: string[];
  proof: { kind: ProofKind; ref: string }[];   // ref = ShotId, clip id, URL or example id
  relatedFeatures: FeatureId[];
  useCases: UseCaseId[];
  searchLanguage: string[];
  claims: Claim[];                     // approved
  notApproved: string[];               // wording that must not be used
  release: 1 | 2;                      // content release (site plan D7)
  gate?: string;                       // e.g. 'receipt quality evidence' (site plan D10)
}
```

`src/data/features.ts` exports `features: readonly FeatureRecord[]`. `src/data/substitutions.ts` exports the site plan's "Approved substitutions" table as `{ insteadOf, use }` pairs. `src/data/use-cases.ts` exports `UseCaseRecord` entries (`id`, `audiences`, `features`, `scenarios`). The data is transcribed from the site plan's registry (D32). The registry is English and internal. Pages use its ids and statuses and never print its strings.

Rejected: putting the registry in the content collections, because it is product truth rather than translatable copy. Rejected: JSON, because TS gives typed ids for the page and content references.

**3.2 Page registry (D17).** `src/site/pages.ts`:

```ts
export type PageType = 'home' | 'how-it-works' | 'hub' | 'feature' | 'use-case' | 'comparison' | 'pricing' | 'legal' | 'article';

export interface PageDef {
  id: PageId;                       // 'home', 'pricing', 'features', 'feature/split-expenses', …
  type: PageType;
  path: `/${string}`;               // English path, slash-terminated
  parent?: PageId;                  // breadcrumbs and hub membership
  published: boolean;
  locales: 'all' | readonly Locale[];
  nav?: { order: number; labelKey: TranslationKey };
  footer?: { group: 'product' | 'useCases' | 'legal'; order: number };
  related?: readonly PageId[];
  features?: readonly FeatureId[];  // registry features the page depicts
  content?: { collection: 'featurePages' | 'useCasePages' | 'sitePages'; slug: string };
  indexing: 'per-locale-review' | 'english-only';
}
```

Unpublished pages are not built, except when `PREVIEW_UNPUBLISHED=1` is set for local review. Those pages are then `noindex`, carry `data-unpublished`, and are left out of navigation and the sitemap. Output check 12 fails any build containing them, so the flag can never ship.

**3.3 Long-form content (D11, D12).** Collections in `src/content.config.ts` use the glob loader over YAML:

- `featurePages`: `src/content/features/<slug>/<locale>.yaml`
- `useCasePages`: `src/content/use-cases/<slug>/<locale>.yaml`
- `sitePages`: `src/content/pages/<pageId>/<locale>.yaml` (how it works, features hub, use-cases hub)
- `comparePages`: `src/content/compare/<slug>/<locale>.yaml` (release 2, `/compare/splitwise/`)
- `guides`: `src/content/guides/<slug>/<locale>.yaml` (step 8)
- `policies`: from step 2

Schemas live in `src/content/schemas.ts`, using `z` from `astro/zod`, so Vitest imports exactly what Astro validates. Fields shared by every entry:

```ts
const review = z.object({
  status: z.enum(['machine', 'checked', 'reviewed']),
  checker: z.string().optional(),
  reviewer: z.string().optional(),
  date: z.string().date().optional(),
}).refine(r => r.status !== 'reviewed' || (r.reviewer && r.date), 'reviewed needs reviewer and date')
  .refine(r => r.status !== 'checked' || (r.checker && r.date), 'checked needs checker and date');

const base = z.object({
  translatedFrom: z.string().regex(/^[0-9a-f]{8}$/).optional(),  // required for non-English, checked in tests
  review,
  meta: z.object({ title: z.string().min(1), description: z.string().min(1) }),
  h1: z.string().min(1),
  lead: richText,
  cta: z.object({ heading: z.string().min(1), body: richText, button: z.string().min(1) }),
});
```

- **Feature page** adds: `problem {heading, body}`; `workflow {heading, steps[≥2] {title, body, shot?, shotAlt?}}`; `options {heading, items[] {title, body}}`; `limits {heading, items[≥1]}` (limits are always visible, never hidden in jokes); `faq {heading, items[3..6] {q, a}}`; `useCasesHeading`.
- **Use-case page** adds: `scenario {heading, body}`; `example` (see 3.4); `featuresHeading`; optional `faq`.
- **Hub page** adds: `intro`; `cardsHeading`. Cards come from the registry's child pages and each child's `meta.description`.
- **How it works** adds: `steps[≥4] {title, body, shot, shotAlt}` covering create group, invite, add and split, settle; `requirements {heading, items}` (sign-up, devices).

`richText` is a string of inline Markdown: bold, italic, `[text](page:<pageId>)`, and `[text](https://app.sidebadger.me/…)`. Other link targets fail validation. `src/components/content/RichText.astro` renders it with `marked.parseInline` and a link renderer that resolves `page:` ids through `localizedPath(id, locale)`. An unknown or unpublished id fails the build.

Rejected: Markdown or MDX bodies, because free-form bodies cannot be checked for structural parity across 39 locales and MDX components are fragile in translation. Rejected: typed TS modules, which are awkward to write and review as prose. The Zod schemas give the type safety.

**3.4 Worked examples (D23).** Example data in use-case YAML: `currency` (ISO 4217); `people[] {id, name}`; `expenses[] {label, payer, amount, split: {method: 'equal' | 'exact' | 'percent', shares?}}`. `src/lib/settle.ts` computes balances and the fewest transfers (greedy largest debtor to largest creditor). `WorkedExample.astro` renders inputs and results with `Intl.NumberFormat(intlCode, {style: 'currency'})`. Locales may change names, labels, amounts and currency (site plan [rules for every brief](./seo-site-expansion-plan.md#rules-for-every-brief)). People count, expense count, payers, split methods and the computed number of transfers must match English.

**3.5 Short strings (D13).** Interface strings stay in `src/i18n/*.ts`. `tf(key, params, locale)` (P11) replaces `{name}` placeholders, and the homepage imports it from `@/i18n`. A test (P04) checks that each locale's placeholders match English exactly. The homepage task's H5 therefore does not add its own.

**3.6 Translation locks and staleness (D14, D15).** `src/i18n/locks/<locale>.json`, one per non-English locale, so translators never share a file:

```json
{
  "keys": { "a11y.changeLanguage": "3f2a9c1e" },
  "identicalApproved": ["header.logoText", "hero.titleHighlight"],
  "pages": { "home": "legacy", "pricing": "legacy" }
}
```

`keys` holds the first 8 hex digits of the SHA-256 of the English value the translation was made from. Content YAML carries `translatedFrom`: the same hash, taken over the English entry as canonical JSON with `review` and `translatedFrom` removed.

- `npm run i18n lock <locale> [--keys a,b]` and `npm run i18n content-lock <locale> <entry>` record hashes after translating.
- `npm run i18n stale` lists stale and unconfirmed entries.
- `audit` reports missing, extra and stale entries, and exits 1 when there are any.
- `add-key` adds the key to `en.ts` only, in English key order. `sync` reports and never writes English values into locale files. `writeTranslationFile` keeps English key order instead of sorting.
- Baseline: P04 writes locks from today's values and runs a drift report from `git blame` (English line newer than the locale line). `features.balances.desc` is a known case. The drifted keys are retranslated by T1–T6 in W4a, which then re-lock them.

**3.7 Test extension.** All files in `src/__tests__/` form the gate (`npm test -- --run`):

- `translations.test.ts` (extended by P04): adds lock staleness, the approved-identical rule replacing the 5-value threshold, `{placeholder}` parity, `pages` review statuses being valid, and the two modes of D38 (in English-first mode a key may be missing from or extra in a locale only when `src/i18n/pending/keys.json` lists it under `added` or `removed`; in strict mode both pending manifests must be empty).
- `content.test.ts` (new): loads every YAML entry with `js-yaml` and the shared Zod schemas, then checks that:
  - every published page has an entry in every locale its registry entry lists (in English-first mode, entries may be missing only for pages listed in `src/i18n/pending/pages.json`);
  - non-English entries have `translatedFrom` equal to the current English hash;
  - structural parity holds (same keys, same array lengths, same `shot` ids, same example structure);
  - no string value is identical to English outside `identicalApproved`;
  - no value is empty or contains `TODO` or `TBD`;
  - every `page:` link targets a registered page;
  - `reviewed` entries name a reviewer and date.
- `registry.test.ts` (new) and the claim rules from the site plan's content model: every content entry lists the claim ids it uses (`claims: ClaimId[]`, identical across locales); a page fails when it uses an unknown claim id or a claim whose feature is not `available` or `beta`; and English YAML and `en.ts` values fail when they contain an `insteadOf` phrase from `substitutions.ts`. It also checks that:
  - feature, use-case and page ids are unique;
  - every cross-reference resolves;
  - pages depict only `available` or `beta` features, and a `beta` feature renders a beta label;
  - every feature cluster with a published page has at least one available feature;
  - proof refs exist (screenshot ids in `src/data/screenshots.ts`).

#### Files

`src/data/types.ts`, `src/data/features.ts`, `src/data/use-cases.ts`, `src/data/screenshots.ts`; `src/site/pages.ts` (new entries); `src/content/schemas.ts`; `src/content.config.ts` (extended); `src/components/content/RichText.astro`; `src/lib/settle.ts`; `src/i18n/locks/*.json`; `src/i18n/pending/{keys,pages}.json`; `scripts/i18n-manager.mjs`; `src/__tests__/{translations,content,registry,settle}.test.ts`; `.claude/commands/review-translations.md` (drop the advice to run `sync`, which writes English placeholders).

#### Checklist

- [ ] Harden the existing gate: audit exit code, writer order, no placeholders, locks and the drift report (P04).
- [ ] Create typed registry types, content schemas, `RichText`, `settle.ts` and the tests (P21).
- [ ] Transcribe the feature and use-case registries and the page set from the site plan, with new pages unpublished (P22).
- [ ] Record capability, user problem, audience, status, limits, proof, related use cases and approved claims for each feature (P22, source: site plan).
- [ ] Keep short interface strings in the existing i18n modules (all packages).

#### Verification

```sh
npm test -- --run
npm run i18n audit; echo $?            # 0
npm run i18n stale                     # empty after the W4a translation
npm run build                          # schemas validate
```

Pass: all green in strict mode on `main`, and in English-first mode on `redesign`. A scratch edit to one English value makes `translations.test.ts` fail for all 38 locales and makes `audit` exit 1.

### 4. Confirm positioning and page briefs

The site plan holds this step's product content (D32), settled on 14 October 2026: the validated feature registry, primary audience and differentiators, the page set with a brief per page, the proof each page needs, and the pricing promise. This task consumes it.

#### Checklist

- [ ] P22: transcribe the site plan's registry into `src/data/` and fail the tests on any reference the site plan leaves unresolved.
- [x] Site plan: page briefs, including query hypotheses and result intent for each cluster. Volumes come from Search Console once the owner exports it.
- [x] Site plan: the proof and imagery list per page. It becomes entries in `src/data/screenshots.ts` (P26) and capture jobs (P35).
- [x] Site plan: one pricing promise (site plan D2). It is implemented by P31.

#### Verification

`registry.test.ts` passes with the transcribed data, and every first-release page in `src/site/pages.ts` has a brief in the site plan.

### 5. Build the site shell

#### Decisions

**5.1 Header and primary navigation (D21).** `SiteHeader.astro` has the logo, `<nav aria-label={t('a11y.mainNavigation')}>` with the links from registry entries that have `nav` and `published: true` (Features, Use cases, How it works, Pricing), the language switcher, and the launch-app CTA. The current page gets `aria-current="page"`. Its section ancestor gets `aria-current="true"`.

Rejected: disclosure dropdowns. They need script and keyboard handling, and the hubs already list every child page.

**5.2 Mobile navigation (D21).** Below 768 px a "Menu" button (`popovertarget="site-menu"`) opens `<div id="site-menu" popover>` holding the same links and a close button (`popovertargetaction="hide"`). The header bar keeps the logo, a flag-only language switcher, and a compact launch button. Escape, light dismiss, top layer and focus return come from the browser. Where popover is unsupported, the panel renders as a visible list. RTL mirrors the panel with logical properties.

Rejected: a hamburger driven by script, which means more code and more failure modes for the same result.

**5.3 Footer (D22).** `SiteFooter.astro` builds three groups from the registry (`product`, `useCases`, `legal`) with `h2` headings styled small. Following site plan D2, D3 and D18, the copyright line becomes "© {year} Side Badger" with no joke, and the tagline drops "Totally free. No tracking." for approved wording ("Free. No ads. No daily limits.").

**5.4 Breadcrumbs and related links (D22).** `Breadcrumbs.astro` renders `<nav aria-label={t('a11y.breadcrumb')}><ol>` from the `parent` chain on pages at depth two or more, ending in `aria-current="page"`. The same data feeds the `BreadcrumbList` builder in `src/seo/jsonld.ts`. `RelatedLinks.astro` renders `related` and registry cross-links (feature ↔ use case), published pages only.

**5.5 Launch CTA (D28).** `LaunchAppCta.astro` is the only way to link to the app. Its props are `target: 'register' | 'app'`, `cta` (the position, such as `hero`, `header` or `footer-cta`), `pageId` and `locale`. It renders `launchHref()` (P11), for example `/go/register/?from=feature/settle-up&cta=hero&lang=fr`, with `rel="nofollow"`, an external-link icon and the `a11y.externalLink` text. The header uses `target="app"` ("Open the app"), and page bodies use `target="register"` ("Create a free account"), as in site plan D1. Confetti stays opt-in through `class="btn-confetti"` and respects reduced motion.

**5.6 Layouts (D23).** In `src/layouts/`:

- `FeaturePageLayout.astro`: hero (`h1`, lead, CTA, first shot), problem, workflow steps, options, limits, related use cases, FAQ, final CTA.
- `UseCasePageLayout.astro`: hero, scenario, worked example, features used (registry links), optional FAQ, CTA.
- `HubLayout.astro`: hero, cards of child pages, CTA.
- `HowItWorksLayout.astro`: ordered steps with screenshots, requirements, CTA.

Shared pieces live in `src/components/content/`: `WorkflowSteps`, `FaqList`, `LimitsList`, `WorkedExample`, `Screenshot`, `RichText` and `CardGrid`. Each layout passes `jsonLd` to `BaseLayout` from `src/seo/jsonld.ts`.

**5.7 Fonts and RTL (D24).** Fonts are implemented by the homepage task's H4, which owns `global.css`, `tokens.css` and `public/fonts/`, to this decision:

- `global.css` drops the Google Fonts `@import`.
- Latin, Cyrillic and Greek locales: Inter variable (latin, latin-ext, cyrillic, greek unicode-range files) for body text and Space Grotesk 600 (latin, latin-ext) for headings, self-hosted under `public/fonts/`. `BaseLayout` preloads exactly two files, Inter latin and Space Grotesk latin, on Latin-script locales only. Fallback `@font-face` rules use `size-adjust` and ascent and descent overrides so the swap does not shift layout. `uk`, `sr` and `el` headings use Inter, because Space Grotesk has no Cyrillic or Greek.
- `ar`, `fa`, `ur`: Noto Sans Arabic variable (arabic subset). `hi`: Noto Sans Devanagari. `bn`: Noto Sans Bengali. `te`: Noto Sans Telugu. Each is loaded only on its own locale through a per-locale `<link>` from `BaseLayout`, with no preload.
- `ja`, `zh`, `ko`: system stacks with no webfont. For `ja`: `"Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP", "Noto Sans JP", sans-serif`. `zh` and `ko` follow the same pattern with SC and KR. The homepage task's script-font table matches.
- Line heights by script follow the homepage task's table: 1.25 for Arabic script and CJK headings, 1.35 for Indic headings.
- Budgets (font bytes on the wire per page): ≤ 100 KB for Latin, Cyrillic and Greek locales; ≤ 250 KB for Arabic-script and Indic locales; 0 KB of webfonts for CJK. The baseline is 189 KB on `/`, 338 KB on `/ar/` and 1,053 KB on `/ja/`.

RTL in the shell (P23): physical properties in `layout.css` (`left`, `right`, `margin-left`) become logical properties. Directional icons flip under `:dir(rtl)`. Flags are covered in step 2 (P15).

**5.8 Effects (D25).** The homepage task's H4 retires `CanopyBloom`, `FloatingParticles`, `MagicalCursor` and the `--scroll-progress` listener site-wide, makes confetti load only when first triggered, and replaces `overflow-x: hidden` on `html` and `body` with `overflow-x: clip` (B37). `EasterEggs` stays on every page.

**5.9 Shell and layout strings.** P23 adds these English keys (to `en.ts` and `src/i18n/pending/keys.json`), and this list is final for the shell and layouts. Page-specific headings come from content YAML. T1–T6 translate them in W4a.

| Key | English |
|---|---|
| `nav.home` | Home |
| `nav.features` | Features |
| `nav.useCases` | Use cases |
| `nav.howItWorks` | How it works |
| `nav.pricing` | Pricing |
| `nav.menu` | Menu |
| `nav.closeMenu` | Close menu |
| `a11y.breadcrumb` | Breadcrumb |
| `a11y.logoAlt` | Side Badger logo (replaces the English `+ ' logo'` concatenation) |
| `footer.useCases` | Use cases |
| `related.heading` | Related pages |
| `example.paid` | {payer} paid {amount} for {item} |
| `example.split` | Split {method} between {count} people |
| `example.splitEqual` | equally |
| `example.splitExact` | by exact amounts |
| `example.splitPercent` | by percentage |
| `example.transfers` | Who pays whom |
| `example.transfer` | {from} pays {to} {amount} |
| `example.note` | Example figures. Your group's will be messier. |
| `feature.betaLabel` | Beta |

**5.10 Header height.** `SiteHeader` sets `--header-h` on `:root` per breakpoint in `layout.css`, as static CSS with no script. The homepage's sticky scene stages read it.

#### Files

`src/components/layout/{SiteHeader,SiteFooter,MobileNav}.astro`; `src/components/nav/{Breadcrumbs,RelatedLinks}.astro`; `src/components/cta/LaunchAppCta.astro`; `src/layouts/{FeaturePageLayout,UseCasePageLayout,HubLayout,HowItWorksLayout}.astro`; `src/components/content/*.astro`; `src/styles/{layout,nav}.css` (`global.css` and `tokens.css` belong to the homepage task's H4); `src/i18n/en.ts` (keys above; the 38 locale files and their locks belong to T1–T6 in W4a); `playwright.config.ts`, `e2e/pages/*.ts` (page objects) and `e2e/shell.spec.ts`, following the `browser-testing` skill; `src/pages/[...locale]/{how-it-works.astro, features/index.astro, features/[slug].astro, use-cases/index.astro, use-cases/[slug].astro}` (step 6).

#### Checklist

- [ ] Add global Features, Use cases, How it works and Pricing navigation, driven by the registry (P23).
- [ ] Add a mobile popover navigation with equivalent access (P23).
- [ ] Expand the footer to expose the structure from the registry, with `h2` group headings (P23).
- [ ] Add breadcrumbs, related links and the launch CTA component (P23).
- [ ] Self-host fonts per D24, retire the background effects, and switch to `overflow-x: clip` (homepage task, H4).
- [ ] Fix RTL properties in the shell and set `--header-h` (P23).
- [ ] Add the reusable feature, use-case, hub and how-it-works layouts and content components (P24).
- [ ] Add every shell key to every locale and retranslate the drifted keys (T1–T6, W4a).
- [ ] Preserve accessibility, RTL, reduced-motion and locale behaviour, checked with Playwright and axe (P23, P24).

#### Verification

```sh
npm run verify
npx playwright test e2e/shell.spec.ts   # playwright.config.ts builds with PREVIEW_UNPUBLISHED=1 and PREVIEW_PSEUDO=1 and serves it with `astro preview`
```

`shell.spec.ts` covers, at 375×812 and 1280×800, `en` and the four pseudo-locales (`xx-long` for long strings, `xx-ar`, `xx-ja`, `xx-hi`) from W2a, and the real `en`, `de`, `ja`, `hi` and `ar` once T1–T6 have run (P41, W4b). It checks that:

- every navigation link is reachable by keyboard in order;
- the language switcher opens, moves with the arrow keys and closes on Escape (P15's behaviour);
- the mobile menu opens from its button, closes on Escape and returns focus;
- breadcrumbs match the registry;
- `@axe-core/playwright` reports no serious or critical violations;
- no element overflows the viewport horizontally;
- screenshots are saved to `test-results/shell/` for visual review.

Pass: all green, and the coordinator reviews the screenshots, including RTL mirroring in `xx-ar` and, in W4b, `ar`.

### 6. Build the first release

#### Decisions

**6.1 Routes for nested pages (D19).**

```astro
---
// src/pages/[...locale]/features/[slug].astro
import { getEntry } from 'astro:content';
import FeaturePageLayout from '@layouts/FeaturePageLayout.astro';
import { pathsForType } from '@/site/routes';

export const getStaticPaths = () => pathsForType('feature');
// → [{ params: { locale: undefined, slug: 'split-expenses' }, props: { pageId: 'feature/split-expenses', locale: 'en' } },
//    { params: { locale: 'fr', slug: 'split-expenses' }, props: { pageId: 'feature/split-expenses', locale: 'fr' } }, …]
const { pageId, locale } = Astro.props;
const entry = await getEntry('featurePages', `${Astro.params.slug}/${locale}`);
if (!entry) throw new Error(`Missing content: ${pageId} in ${locale}`);  // never fall back to English
---
<FeaturePageLayout entry={entry} pageId={pageId} locale={locale} />
```

`pathsForType` returns published pages (and unpublished ones under `PREVIEW_UNPUBLISHED=1`) × the page's locales, skips the page/locale pairs that English-first mode excludes (D38), and never aliases. The same pattern serves `features/index.astro`, `use-cases/index.astro`, `use-cases/[slug].astro` and `how-it-works.astro`.

**6.2 Product imagery (D26, D33).**

- `src/data/screenshots.ts` lists `{ id, localized, status: 'captured' | 'placeholder-en', width, height }` for each shot in the site plan's shot list.
- Files live in `src/assets/screenshots/<id>/<locale>.png`, or `neutral.png` when `localized: false`.
- `Screenshot.astro` resolves them through `import.meta.glob` and renders `<Picture formats={['avif', 'webp']} widths={[480, 960, 1440]}>` with explicit dimensions, `loading="lazy"` except for the first shot, and the alt text from content.
- A missing localized file for a `captured` shot fails the build. A `placeholder-en` shot renders on English pages only and is omitted elsewhere, so no localized page shows English UI.
- Capture happens in the app repository (site plan D14 and "Product imagery plan", follow-up 9 there). Its JSON manifest (app release, locale, viewport, seed version) is copied to `src/assets/screenshots/manifest.json`. A content test warns when a capture is older than the latest app release that changed its screen.
- Captures show each locale's home currency, per the site plan's [Demo content](./seo-site-expansion-plan.md#demo-content). The homepage uses no captures: its scenes are an illustrated story with fixed amounts in every locale (the homepage plan's recorded decision 4).

**6.3 Social cards (D27).**

- Source artwork lives in `src/assets/og/<card>.png` at 2400×1260: `default`, `features`, `use-cases`, `how-it-works` and `pricing`.
- `src/pages/og/[card].png.ts` uses `getStaticPaths` over cards × logo locales (`logoLocales`, otherwise `en`), composites the localized wordmark with `sharp`, and returns a 1200×630 PNG at `/og/<card>-<logoLocale>.png`.
- `SeoHead` references the card by absolute URL with `?v=<first 8 hex of the source artwork's hash>`.
- P12 builds the `default` card in W1b from the existing mascot and wordmark on the brand background. It is a real asset, not a placeholder, and every page uses it until its section card exists. P26 adds the section cards.
- Unused `logo-large*.png` files (41 MB) are deleted. The manifest, favicon and apple-touch icon get square 192, 512 and 180 px derivatives (P26).

**6.4 Pricing.** The promise is site plan D2: "Free. No ads. No daily limits." P31 rewrites the `pricing.*` keys, including `pricing.meta.*`; the homepage's `meta.title` and `meta.description` belong to H2. It removes "free forever", "100% free and unlimited", the Pro card and every "zero tracking" or "no tracking" claim (site plan D3). It adds the limits table from the site plan's pricing brief, including the 999,999.99 per-expense cap (site plan D19), and rewrites the FAQ so "Will it always be free?" quotes the terms' notice commitment. It also fixes the hard-coded `aria-label`, routes its launch links through `LaunchAppCta`, and makes the page's confetti load on first use (D25). The `FAQPage` JSON-LD follows the new FAQ. The homepage's `SoftwareApplication` carries the `offers` block (price 0, GBP), because the promise says free. Localized pricing leaves `legacy` when T1–T6 retranslate it in W4a (D31).

**6.5 Content production.** English entries are written from the site plan's briefs, voice and guardrails, and the whole English site is verified (P38) before anything is translated. Translation then fans out once to T1–T6 in W4a (D38). Agents mark translations `machine`, and a different agent's back-translation check moves them to `checked` (D31). Only fluent reviewers set `reviewed`.

**6.6 Release.** Publishing a page means setting `published: true` in `src/site/pages.ts`. P39 does this for every release 1 page in W4c, after T1–T6 and P41, in the PR that brings `redesign` into `main`, so every page has its content in all 39 locales. Navigation and the footer pick it up automatically.

#### Checklist

- [ ] Rebuild the homepage as a concise, scroll-driven overview that routes into deeper content. See [the homepage scroll experience task](./homepage-scroll-experience.md). It passes its JSON-LD through the `BaseLayout` `jsonLd` prop and links to the app through `launchHref()` or `LaunchAppCta`. It is scheduled in the [joint schedule](#joint-schedule-with-the-homepage-task).
- [ ] Add route files for how it works, both hubs, and the feature and use-case pages (P24).
- [ ] Build the screenshot pipeline, the social card endpoint, the icon derivatives, and remove unused logos (P26).
- [ ] Capture product screenshots per the site plan's proof list (P35).
- [ ] Publish `/how-it-works/` with an end-to-end workflow (P32).
- [ ] Publish `/features/` and the three first feature pages from the site plan (P33).
- [ ] Publish `/use-cases/` and the three first use-case pages from the site plan (P34).
- [ ] Update pricing copy and FAQ to the site plan's promise (P31).
- [ ] Add accurate titles, descriptions, structured data and social previews (layouts and content packages; checked by `check:site`).
- [ ] Route every launch CTA through `LaunchAppCta` (P23, P24, P31, homepage task).
- [ ] Add every new content key and entry to every supported locale, after the English site is complete (T1–T6, W4a).
- [ ] Run `npm run verify` in strict mode before `redesign` merges into `main` (P41, P39).

#### Verification

```sh
npm run verify
scripts/check-nginx.sh
scripts/lighthouse-local.sh --runs 3 --urls /,/pricing/,/how-it-works/,/features/,/use-cases/,<one feature page>,<one use-case page>,/ar/features/,/ja/features/
npx playwright test
```

Pass:

- `verify` and the smoke test are green;
- every page meets the [Thresholds](#thresholds), including the revised pricing page;
- the homepage meets its own budgets and is no worse than its baseline (mobile performance 78, LCP 5.04 s);
- after release the owner confirms field data where CrUX has it.

### 7. Expand and maintain translations

#### Decisions

- Statuses: `machine`, written by a translating agent; `checked`, after an independent back-translation check; `reviewed`, set only by a fluent human reviewer, with name and date; and `legacy`, used only for pages that were live before this task and dropped the first time their English changes.
- Back-translation check (D31). It is run by an agent that did not translate the locale. `npm run i18n backcheck <locale> <page>` writes a packet: the English source, the translation, and a blank back-translation. The agent back-translates into English without seeing the source first, then compares the two and fails the page on any of these:
  - a changed number, amount, limit or date;
  - a claim stronger or weaker than its claim id;
  - a missing qualification;
  - an `insteadOf` phrase in the back-translation;
  - a joke whose intent is lost or offensive;
  - text in the wrong script.

  A pass records `checked` with the checker id, date and the source hash in the YAML `review` block, or in the lock file's `pages` for i18n-key pages. `content.test.ts` and `translations.test.ts` fail when any non-English entry is still `machine`, so unchecked translations cannot merge.
- Indexing: `checked` pages are `noindex`. `reviewed` and `legacy` pages are indexable (D8).
- The fluent review order follows the site plan's priority markets. A reviewer reviews a complete locale (all published pages) in one pass.
- The `pcm` baseline (83 English-identical values) goes to a fluent `pcm` reviewer. Values they confirm stay in `identicalApproved`, and the rest are translated.
- An agent may run the `review-translations` command as a pre-review pass. It never sets `reviewed`.

#### Checklist

- [ ] Review early search and conversion evidence at 4, 8 and 12 weeks (site plan success measures, `/go/app/` counts by `from`).
- [ ] Publish the remaining validated pages from the site plan in every supported locale.
- [ ] Translate complete pages, including metadata, examples, alt text and humour.
- [ ] Keep translation parity, freshness and output checks as a merge requirement for every later content change (the `verify` job with branch protection).
- [ ] Require a back-translation check before merge, and fluent review before indexing financial claims and jokes (D8, D31).
- [ ] Owner: find fluent reviewers, starting with any locale over the D31 traffic threshold.

#### Verification

`npm run i18n stale` is empty. No entry is `machine`. Each locale's `reviewed` and `legacy` pages appear in the sitemap and `hreflang` clusters, and its `checked` pages do not (output checks 3, 7 and 8).

### 8. Publish supporting content selectively

#### Decisions

- Guides live at `/guides/<slug>/` (D20). They use the `guides` collection (schema: `meta`, `h1`, `lead`, `sections[] {heading, body}`, `relatedPages[]` of at least two product pages, `owner`, `reviewBy` date) and `Article` JSON-LD.
- `content.test.ts` fails when a published guide's `reviewBy` date has passed, which forces an update or unpublishing.
- A guide may be published in a subset of locales (`locales` in the registry). Its `hreflang` cluster then covers only those locales.

#### Checklist

- [ ] Write a guide only when search data or repeated user questions show a real need, such as splitting holiday costs or choosing a fair split method.
- [ ] Link each guide to relevant product pages and assign an owner and review date.

## Translation and locale requirements

English is the source content. Translation happens once, at the end (D38), but localization is part of the page design from the start: every layout is built for long strings, right-to-left and non-Latin scripts and checked in the pseudo-locales before translation, so the final wave translates rather than redesigns.

- Use `src/i18n/index.ts` as the source of truth for supported locales, aliases and locale metadata (`htmlLang`, `hreflang`, `ogLocale`, `dir`, `browserLanguages`).
- Preserve `t('key', locale)` (and `tf()` for placeholders) for shared interface text and navigation.
- Long-form pages use the Zod-validated content collections, so required fields cannot be omitted silently.
- Never publish English fallback copy at a localized URL as if it were translated content. The only English at localized URLs is legal text, labelled with a translated notice and marked `lang="en"`.
- Generate every new page for every supported locale with its title, description, headings, body, calls to action, image alt text, structured data and internal links translated.
- Make every indexed alternate reciprocal: if page A names page B as an alternate, page B must name page A.
- Regional aliases are redirects, not pages (D3).
- Generate `og:locale`, document language, text direction, dates and localized URLs from locale metadata rather than hard-coded maps.
- Preserve RTL layout and interaction behaviour for Arabic, Persian and Urdu.
- Check line wrapping, navigation length, cards, buttons and heading overflow with the pseudo-locales while building (W2–W3), and with the real translations in W4b.
- Localize screenshots when the visible product interface materially differs by language (`localized: true`). Otherwise use language-neutral imagery.
- Translate examples and humour for cultural meaning. Every translation passes an independent back-translation check before merge. A fluent reviewer must approve financial wording, claims and jokes before a page is indexed (D31).
- Keep checks for exact key parity, empty values, English placeholders, staleness, placeholder parity, page-content completeness and structure, route generation, canonical URLs, reciprocal `hreflang` and sitemap inclusion.
- Run visual checks on representative Latin (`en`, `de`), CJK (`ja`), Indic (`hi`) and RTL (`ar`) locales before release (P41, W4b).

### Translation release gate

No change reaches `main` until every supported locale is complete. `main` deploys on every push, so it is the branch the gate protects. The gate is the `verify` CI job in strict mode, which branch protection makes required on `main`. On `redesign` the same job runs in English-first mode (D38): keys and content entries may be missing only when the pending manifests list them, and a locale or page that lacks them builds no localized route, so even `redesign` never builds English fallback at a localized URL. The strict gate runs on `redesign` in W4b (P41), after T1–T6, and again on the W4c release PR. It runs every test in `src/__tests__/` (including `translations.test.ts` and `content.test.ts`), `npm run i18n audit` (which exits 1 on any missing, extra or stale entry), the build, and the output checks. Every localized content page must meet all of these conditions:

- all required content and metadata fields are present and pass the schema;
- no source-language fallback is visible, apart from approved identical values and labelled legal text;
- no translation is stale against its English source;
- its canonical and alternates resolve successfully;
- its internal links point to available localized pages or, for legal text, deliberately to the English resource;
- layout and direction have been visually reviewed;
- it has passed the back-translation check (`checked`) at least;
- its review status is recorded, and pages not yet fluent-reviewed carry `noindex` and are left out of the sitemap and `hreflang` (D31).

## Editorial direction

Follow the voice and guardrails in [the site plan](./seo-site-expansion-plan.md#voice-and-editorial-rules).

## Agent execution plan

### Rules for every package

- Each package runs on its own branch in its own git worktree (D34) and builds there. Never build in a checkout or a `dist/` another agent is using.
- A package edits only the files it owns. It may read anything. If it needs a change in a file it does not own, it stops and reports to the coordinator. Packages in the same wave never own the same file, and a shared file has one holder at a time, in the order of [Shared files and serialization](#shared-files-and-serialization).
- Only the coordinator edits the task plans, `tasks/*.md` (this file, the site plan, the homepage plan and the baseline). Findings, measurements and translator notes go in the package's handover, and the coordinator records them.
- A package's deliverable is a branch that passes its verification plus `npm test -- --run` and `npm run build` in the mode of its target branch (D38). On `redesign` the only other allowed failure is the unused-key check for keys whose code lands in a later wave (H2's `home.*` keys until H6–H10 merge); the coordinator checks the list. The coordinator merges in wave order, runs `npm run verify` after each merge, and ticks this file.
- Target branch (D34, D38): W0 and W1 packages that add or change no user-facing string merge into `main`. Every other package merges into the long-lived `redesign` branch, never into `main`. A package that adds English keys lists them in `src/i18n/pending/keys.json` in the same change. The coordinator merges `main` into `redesign` after every `main` merge.
- English comes first, but every layout is built for every script: logical properties only, and each layout package checks its pages in the pseudo-locales (`xx-long`, `xx-ar`, `xx-ja`, `xx-hi`, D38) before merge, so W4 translates rather than redesigns.
- Scripts follow the `scripting` skill. Playwright specs and page objects follow the `browser-testing` skill.
- Packages never invent product facts. Product inputs come from the site plan (D32).
- **Model.** Every package names one. "Sonnet" marks clear, mechanical packages (translation groups, mechanical refactors, checks, scripts, transcription) that a Sonnet agent can run. "Default" marks judgement-heavy packages (prototype, copywriting, design, interlocking SEO rules) for the default model.

### Joint schedule with the homepage task

The [homepage task](./homepage-scroll-experience.md#agent-execution-plan) writes its packages as H1 to H16. H12 was folded into T1–T6 and H15 is withdrawn (the homepage stays illustrated), so 14 remain. Both tasks run on this one wave timeline (D37), and this table is the authority. Translation runs once, in W4, after all English work (D38).

| Wave | This task | Homepage task | Target branch |
|---|---|---|---|
| W0 (start now) | P01, P02, P03, P04, P05 (P05 merges after P02) | H1 (prototype, scratch only), H2 (English `home.*` keys, merges after P04), H3 (example-group data) | `main`; H2 → `redesign` |
| W1a | P11, P14 | H4 (site chrome; codes against P11's `fontScript` and merges after P11) | `main` |
| W1b | P12, P13, P15, P16 | none | `main`; P13 → `redesign` |
| W1c | P19 | H5 (homepage foundation) | P19 → `main`; H5 → `redesign` |
| W2a | P21, P23, P26 | H6–H10 (scenes) | `redesign` |
| W2b | P22, P24 | H11 (retire the old homepage) | `redesign` |
| W3a | P31, P32, P33a–c, P33h, P34a–c, P34h, P35 | none | `redesign` |
| W3b | none | H16 (deeper-page link labels; after P31 releases `en.ts`) | `redesign` |
| W3c | P38 (English release candidate) | H13 (homepage verification in English and pseudo-locales), H14 (docs) | `redesign` |
| W4a | T1–T6 (all translation in one pass), then the rotating back-checks | none | `redesign` |
| W4b | P41 (localized verification and the full strict gate) | none | `redesign` |
| W4c | P39 (publish and merge `redesign` into `main`) | none | `main` |

### Shared files and serialization

One holder per file at any moment, across both tasks, in this order. "H" packages belong to the homepage task. Holders on different branches are marked.

| File | Holder sequence |
|---|---|
| `package.json`, `package-lock.json` | P02 (W0: dependencies and scripts below) → H4 (W1a: remove tsParticles, add Fontsource) → P19 (W1c: final `verify`), all on `main`. On `redesign`, P13 (W1b) removes `dompurify`, `@types/dompurify` and `marked-smartypants`. |
| `src/layouts/BaseLayout.astro` | P03 (W0 split) → H4 (W1a: effects out, font links and preloads) → P12 (W1b: props, `lang` and `dir`) → P23 (W2a: shell) |
| `src/components/layout/BackgroundEffects.astro` | P03 (W0, created) → H4 (W1a, deleted with the three effects) |
| `src/styles/global.css`, `src/styles/tokens.css`, `src/styles/easter-eggs.css`, `src/components/EasterEggs.astro`, `public/fonts/` | H4 (W1a) → H13 (W3c) → P41 (W4b, fixes only) |
| `src/styles/layout.css`, `src/styles/nav.css` (new) | P23 (W2a) → P41 (W4b, fixes only) |
| `src/components/layout/SeoHead.astro` | P03 (W0, created) → P12 (W1b) |
| `src/components/layout/SiteHeader.astro` | P03 (W0, created) → P12 (W1b, launch link only) → P23 (W2a) |
| `src/components/layout/SiteFooter.astro` | P03 (W0, created) → P23 (W2a) |
| `src/seo/urls.ts`, `src/i18n/pseudo.ts` | P11 (W1a) only |
| `src/pages/og/[card].png.ts`, `src/assets/og/*` | P12 (W1b, default card) → P26 (W2a, section cards) |
| `src/i18n/index.ts` | P11 (W1a: metadata including `fontScript`, `tf()`, pseudo-locales) → P15 (W1b, `getFlagUrl` only) |
| `src/i18n/en.ts` | H2 (W0) → P13 (W1b) → P23 (W2a) → H11 (W2b) → P31 (W3a) → H16 (W3b). Additions stay in their own key namespaces, so the coordinator's merges are clean. |
| `src/i18n/pending/keys.json` | P04 (W0, created empty) → H2 (W0, after P04) → P13 (W1b) → P23 (W2a) → H11 (W2b) → P31 (W3a) → H16 (W3b) → P41 (W4b, emptied) |
| `src/i18n/pending/pages.json` | P04 (W0, created empty) → P22 (W2b, the new content pages) → P41 (W4b, emptied) |
| `src/i18n/<locale>.ts` and `src/i18n/locks/<locale>.json` (38 each), every non-English `src/content/**/<locale>.yaml` | P04 (W0, locks created) → T1–T6 (W4a) |
| `src/__tests__/translations.test.ts` | P04 (W0, including `{placeholder}` parity and English-first mode) → H11 (W2b: typewriter block, leading-space list, `home.cast` allowance) |
| `src/pages/[...locale]/index.astro` | P11 (W1a) → H5 (W1c) |
| `src/components/HomePage.astro` (old) | P12 (W1b, head hand-off and launch links) → H11 (W2b, deleted) |
| `src/components/PricingPage.astro` | P12 (W1b, head hand-off and launch links) → P31 (W3a) |
| `src/components/home/**`, `src/styles/home/**` | H5 (W1c, created) → H6–H10 (W2a, one scene's files each) → H16 (W3b, `data/links.ts` only) → H13 (W3c) → P41 (W4b, fixes only) |
| `AGENTS.md` | P19 (W1c, `main`) → H14 (W3c, `redesign`) |
| `astro.config.mjs` | P11 (W1a) → P12 (W1b) |
| `src/site/pages.ts` | P11 (W1a) → P22 (W2b) → P39 (W4c, `published: true`) |
| `src/site/preview-pages.ts` | P11 (W1a, created empty) → P24 (W2b) |
| `src/content.config.ts` | P13 (W1b) → P21 (W2a) |
| `scripts/i18n-manager.mjs` | P04 (W0) → P21 (W2a, content commands) |
| `.github/workflows/deploy.yml`, `Dockerfile` | P05 (W0) → P19 (W1c) |
| `src/data/screenshots.ts` | P26 (W2a) → P35 (W3a, statuses) |
| `playwright.config.ts`, `e2e/pages/*.ts`, `e2e/shell.spec.ts` | P23 (W2a). Later packages add only their own spec and page-object files: P24 `e2e/layouts.spec.ts`, P31 `e2e/pricing.spec.ts`, H13 `e2e/home.spec.ts` and `e2e/pages/home*.ts`, P38 `e2e/site.spec.ts`, P41 `e2e/localized.spec.ts`. |
| `nginx/*` | P14 only |

Homepage packages call `launchHref()` (P11) or `LaunchAppCta` (P23) for every link to the app, so the `/go/app/` measurement and any future change of destination stay in one place. P11 adds `fontScript` (`latin`, `cyrillic-greek`, `arabic`, `devanagari`, `bengali`, `telugu` or `cjk`) to `localeConfig` for H4's per-locale font links. H4 codes against that field and merges after P11.

P02 adds:

- dev dependencies: `cheerio`, `js-yaml`, `schema-dts`, `@astrojs/check`, `@playwright/test` (also used by the homepage verification), `@axe-core/playwright`, `sharp`;
- scripts: `check:site` (`vitest run --config vitest.site.config.ts`), `check:nginx` (`scripts/check-nginx.sh`), `policies:sync` (`node scripts/sync-policies.mjs`), `test:e2e` (`playwright test`), and `verify` (initially `npm test -- --run && npm run i18n:audit && npm run build`).

H4 adds the Fontsource packages and removes `tsparticles` and `@tsparticles/slim`.

### Translation fan-out

All translation happens in W4a, once, after the English site is complete (D38). 38 non-English locales in six groups, sized by script complexity so the visual check stays manageable:

| Group | Locales |
|---|---|
| T1 RTL | `ar`, `fa`, `ur` |
| T2 East and Southeast Asia | `zh`, `ja`, `ko`, `id`, `ph` |
| T3 South Asia and Africa | `hi`, `bn`, `te`, `sw`, `pcm` |
| T4 Romance, Celtic, Basque | `fr`, `es`, `pt`, `it`, `ro`, `ga`, `cy`, `eu` |
| T5 Germanic, Nordic, Finnic, Baltic | `de`, `nl-BE`, `da`, `sv`, `no`, `is`, `fi`, `lv` |
| T6 Slavic, Greek, Hungarian, Turkish | `pl`, `cs`, `sl`, `hr`, `sr`, `uk`, `el`, `hu`, `tr` |

- **Model:** Sonnet, for translating and for back-checking.
- **Goal:** every key in `src/i18n/pending/keys.json` (`added` translated, `removed` deleted), the drift keys in `tasks/baselines/translation-drift.txt`, and a translated content entry for every page in `src/i18n/pending/pages.json`, for the group's locales.
- **Owns:** `src/i18n/<locale>.ts`, `src/i18n/locks/<locale>.json` and every `src/content/**/<locale>.yaml` for its locales. Groups never share a file, so all six run in parallel. They never edit the pending manifests or `en.ts`.
- **Depends on:** W3c complete (P38's and H13's reports clean), so English no longer changes.
- **Inputs:** the English keys and entries; the homepage's [translator notes](./homepage-scroll-experience.md#translator-notes); the site plan's [voice rules](./seo-site-expansion-plan.md#voice-and-editorial-rules) and approved claims; 3.4 for worked examples.
- **Deliverable:** translated files with locks, every `review.status` and lock `pages` entry at `machine`, handed over for back-checking. The homepage and pricing leave `legacy` here (D31).
- **Back-check:** after a group hands over, a different group's agent back-checks its locales (D31): T1 checks T2's locales, T2 checks T3's, and so on round to T6 checking T1's. The checker owns only the `review` blocks and lock-file `pages` entries of the locales it checks, after the translator has handed over, and sets `checked` or returns the failures.
- **Verification:** `I18N_MODE=strict npx vitest --run -t "^(ar|fa|ur) "` (tests are named per locale) passes for the group's locales; a `PREVIEW_UNPUBLISHED=1` build contains the group's localized routes, with screenshots of them in the handover.
- The coordinator merges all six, then P41 runs the full gate.

### Waves

**W0. Start now, all in parallel.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P01 | Repeatable Lighthouse script, `/privacy/` baseline, legacy URL inventory | Sonnet | `scripts/lighthouse-local.sh`, `scripts/lighthouse-proxy.mjs`, `tasks/baselines/*/lighthouse/**`, `src/__tests__/fixtures/legacy-urls.txt` | none | the [baseline measurements](./baseline-measurements.md) method; the proxy is rewritten from its description there (brotli quality 6 or gzip 6 by `Accept-Encoding`, for HTML, CSS, JS, JSON, SVG and plain text), because the original script was never committed | script, `/privacy/` values in the handover, fixture | step 1 commands; 230-line fixture |
| P02 | Dependencies and script entries | Sonnet | `package.json`, `package-lock.json` | none | list above | lockfile updated | `npm ci && npm test -- --run && npm run build` |
| P03 | Split `BaseLayout` into `SeoHead`, `SiteHeader`, `SiteFooter` and `BackgroundEffects` with identical output | Sonnet | `src/layouts/BaseLayout.astro`, `src/components/layout/*.astro` (new) | none | current `BaseLayout.astro` | behaviour-neutral split | normalized `dist/` diff before and after is empty (command below) |
| P04 | Translation gate hardening and English-first mode | Sonnet | `scripts/i18n-manager.mjs`, `src/__tests__/translations.test.ts`, `src/i18n/locks/*.json` (new), `src/i18n/pending/{keys,pages}.json` (new, empty), `.claude/commands/review-translations.md`, `tasks/baselines/translation-drift.txt` | none | 3.6, D38 | 3.6 behaviour, `{placeholder}` parity test, `I18N_MODE` support in the test and in `audit`, baseline locks, drift report | tests green; a scratch removal of `cta.button` from `fr` makes `audit` exit 1 in strict mode, and in English-first mode only when the key is not listed in `pending/keys.json`; strict mode fails while either manifest is non-empty; the drift report lists `features.balances.desc` |
| P05 | CI `verify` job gating deploy | Sonnet | `.github/workflows/deploy.yml`, `Dockerfile` (`COPY nginx/*.conf`), `scripts/deploy.sh` (runs `npm run verify` first) | P02 (merge after it, because it calls `npm run verify`) | D30, D38 | workflow with `verify` → `build-and-push` → `deploy`; `verify` runs on push and pull request, with `I18N_MODE=english-first` on `redesign` and pull requests into it and strict mode everywhere else; deploy runs only from `main` | `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` is clean; Docker build succeeds |

P03's normalized diff:

```sh
norm() { (cd "$1" && find . -name '*.html' | sort | while read -r f; do echo "== $f";
  sed -E 's/ data-astro-cid-[a-z0-9]+//g; s#/_astro/[^"]+#/_astro/X#g' "$f"; done); }
diff <(norm before/dist) <(norm after/dist) && echo identical
```

**W1a. After P02 and P03.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P11 | Locale metadata, URL helpers (including `launchHref`), page registry, routes, pseudo-locales, no alias pages, slash policy | Default | `src/i18n/index.ts`, `src/i18n/pseudo.ts` (new), `astro.config.mjs`, `src/site/*` (including an empty `preview-pages.ts`), `src/seo/urls.ts`, `src/pages/[...locale]/{index,pricing}.astro`, `src/pages/robots.txt.ts`, `src/__tests__/site-structure.test.ts` | P02, P03 | D1, D3, D5, D19, D28, D35, D38 | 2.1, 2.3 (build side), 2.4; `pathsFor` and `pathsForType` skip a locale missing any key and a page/locale pair missing its content entry; pseudo-locales under `PREVIEW_PSEUDO=1` | strict build has 39 × 5 + 1 files; every generated link is slash form; a unit test shows `ph` → `htmlLang` `fil`, `hreflang` `tl`; with a scratch key in `pending/keys.json` and `I18N_MODE=english-first`, the build still builds English and has no localized route for a locale missing that key; a `PREVIEW_PSEUDO=1` build adds the four pseudo prefixes |
| P14 | nginx URL policy and smoke test | Sonnet | `nginx/default.conf`, `nginx/locale-redirects.conf`, `scripts/check-nginx.sh`, `scripts/launch-totals.logql`, `src/__tests__/nginx-config.test.ts` | P01 (fixture) | D2, D4, D27, D28 | 2.2, 2.9 smoke | unit test green; `scripts/check-nginx.sh` green against today's build for the URL and header rules, then against `main` once P11 and P12 merge (alias and `/og/` rules) |

**W1b. After P11.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P12 | SEO head, `lang` and `dir` from metadata, JSON-LD, indexability, sitemap filter, 404, default social card, launch links through `/go/app/` | Default | `src/components/layout/SeoHead.astro`, `src/components/layout/SiteHeader.astro` (launch link only), `src/layouts/BaseLayout.astro`, `src/seo/{indexability,alternates,jsonld}.ts`, `astro.config.mjs`, `src/components/{HomePage,PricingPage}.astro` (head hand-off and launch links only), `src/pages/404.astro`, `src/pages/og/[card].png.ts`, `src/assets/og/default.png` | P11 | D5–D9, D27, D28 | 2.5, 2.6, default card | `check:site` rules 2, 3, 6, 7, 8, 10, 11 and 15 green once P16 merges; until then, the greps in the step 2 verification; `dist/ph/index.html` has `lang="fil"` |
| P13 | Policy pre-render and sync, English keys only (translated in W4a) | Sonnet | `src/components/PolicyPage.astro`, `src/styles/policy.css`, `src/pages/[...locale]/{privacy,terms,cookies}.astro`, `src/content.config.ts`, `src/content/policies/*`, `scripts/sync-policies.mjs`, `.github/workflows/policy-sync.yml`, `src/i18n/en.ts`, `src/i18n/pending/keys.json`, `package.json` (on `redesign`) | P11; codes against P12's `BaseLayout` props as specified in 2.5 (merge after P12) | D10 | 2.7 on `redesign` | `npm run policies:sync -- --dry-run` exits 0; built English policy pages contain the text and no client script; in English-first mode no localized policy route is built |
| P15 | Language switcher, detection and flags | Default | `src/components/LanguageSwitcher.astro`, `src/styles/language-switcher.css`, `src/components/LanguageDetection.astro`, `public/flags/*`, `getFlagUrl` in `src/i18n/index.ts`, `src/__tests__/language-detection.test.ts` (new) | P11 | D3, D5, D24 | alias choices link to target URLs, `browserLanguages` matching, local flags loaded only when the dropdown first opens, Escape and arrow-key support (bugs B10, B27, B28, B34) | no `cdn.jsdelivr.net` in `dist/`; the detection unit test (`nl` → `nl-BE`, `nb` → `no`, `fil` → `ph`); the keyboard check is part of P23's `shell.spec.ts` |
| P16 | Output checks | Sonnet | `vitest.site.config.ts`, `vitest.config.ts`, `src/__site_tests__/**` | P11 (registry types) | 2.8, D38 | all 15 rules with focused fixture tests; rule 1 skips page/locale pairs the English-first mode excludes; rule 12 also fails on `data-pseudo` | `npm run check:site` green against a build of P11 + P12 |

**W1c. After every W1a and W1b package.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P19 | Close out the foundation on `main`: wire `check:site`, `check:nginx` and `astro check` into `verify`, CI and the Dockerfile; fix `astro check` errors (P19 may edit any file for this except those held by H5, which runs alongside it); update `AGENTS.md` (URL policy, the `/go/` counter, RTL, the app at `app.sidebadger.me` with staging used only for rehearsals, the `redesign` branch and English-first mode, the new `src/site` and `src/seo` layout, and removal of the stale `CausticRipples`, cursor-aurora and glass-layer text; H14 adds the homepage, content collections and policy snapshots on `redesign`) | Sonnet | `package.json`, `.github/workflows/deploy.yml`, `Dockerfile`, `AGENTS.md`, type fixes anywhere | P11, P12, P14, P15, P16 | 2.9, D30, D38 | full gate on `main` | `npm run verify` and `scripts/check-nginx.sh` green on `main`; a pushed branch shows the `verify` job running, in English-first mode on `redesign` |

**W2a. After W1c. Everything from here merges into `redesign`.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P21 | Content model mechanics | Default | `src/data/types.ts`, `src/content/schemas.ts`, `src/content.config.ts`, `src/components/content/RichText.astro`, `src/lib/settle.ts`, `scripts/i18n-manager.mjs`, `src/__tests__/{content,registry,settle}.test.ts` | P19 | 3.1–3.7, D38 | schemas, tests (including English-first mode in `content.test.ts`), `i18n` content commands including `backcheck` | tests green with an empty registry; `settle.ts` cases include rounding and three-way splits |
| P23 | Site shell | Default | `src/components/layout/{SiteHeader,SiteFooter,MobileNav}.astro`, `src/components/nav/*`, `src/components/cta/LaunchAppCta.astro`, `src/layouts/BaseLayout.astro`, `src/styles/{layout,nav}.css`, `src/i18n/en.ts`, `src/i18n/pending/keys.json`, `playwright.config.ts`, `e2e/pages/*.ts`, `e2e/shell.spec.ts` | P19, H4 | 5.1–5.5, 5.7 (RTL part), 5.9, 5.10 | header, popover menu, footer, breadcrumbs, CTA, RTL, `--header-h`, the English keys in 5.9 | `shell.spec.ts` green in `en` and the four pseudo-locales, including the language switcher's keyboard behaviour; real locales run in W4b (P41) |
| P26 | Imagery mechanics and section-card artwork | Default | `src/data/screenshots.ts`, `src/components/content/Screenshot.astro`, `src/assets/og/*`, `src/pages/og/[card].png.ts`, `public/manifest.json`, `public/images/**` | P19 | D26, D27, 6.2, 6.3 | section cards, icon derivatives, unused logos removed, screenshot component, a `screenshots.ts` entry per shot in the site plan's shot list | `check:site` rule 10 green; `public/images` under 2 MB |

**W2b. After W2a.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P22 | Registry data | Sonnet | `src/data/features.ts`, `src/data/use-cases.ts`, `src/data/substitutions.ts`, `src/site/pages.ts`, `src/i18n/pending/pages.json` | P21 | the site plan's registry (with its transcription notes), page set and approved substitutions | all records; release 1 pages registered with `published: false` and listed in `pending/pages.json` | `registry.test.ts` green |
| P24 | Page layouts and routes | Default | `src/layouts/{FeaturePageLayout,UseCasePageLayout,HubLayout,HowItWorksLayout}.astro`, `src/components/content/*` (except `RichText` and `Screenshot`), the route files in 6.1, `src/content/**/__preview__/en.yaml` fixtures, `src/site/preview-pages.ts`, `e2e/layouts.spec.ts` | P21, P23 | 5.6, 6.1 | layouts render preview fixtures under `PREVIEW_UNPUBLISHED=1`, and pseudo-locale content under `PREVIEW_PSEUDO=1` through `src/i18n/pseudo.ts` | the `PREVIEW_UNPUBLISHED=1` build passes `check:site` except rule 12, and fails rule 12 as intended; `layouts.spec.ts` green in `en` and the four pseudo-locales |

**W3a. English content.** Every package here reads its product input from the site plan and writes English only.

| ID | Goal | Model | Owned files | Depends on | Inputs (site plan) | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P31 | Pricing revision | Default | `src/components/PricingPage.astro`, `src/styles/pricing.css`, `src/i18n/en.ts` (`pricing.*` keys), `src/i18n/pending/keys.json`, `e2e/pricing.spec.ts` | W2b | pricing brief, [Pricing and promise](./seo-site-expansion-plan.md#pricing-and-promise), D2, D3, D19 | 6.4 in English | `check:site` FAQ rule; `pricing.spec.ts` green in `en` and the pseudo-locales |
| P32 | How it works (English) | Default | `src/content/pages/how-it-works/en.yaml` | P22, P24 | brief, proof list, voice rules | entry | `content.test.ts` and `registry.test.ts` (claims) green; the `PREVIEW_UNPUBLISHED=1` build passes `check:site` except rule 12 |
| P33a–c, P33h | `split-expenses`, `settle-up` and `multiple-currencies`, and the features hub (English), one agent each | Default | each owns one file: `src/content/features/<slug>/en.yaml` or `src/content/pages/features/en.yaml` | P22, P24 | briefs | entries | as P32 |
| P34a–c, P34h | `group-trips`, `housemates` and `events-and-celebrations`, and the use-cases hub (English), one agent each | Default | each owns one file: `src/content/use-cases/<slug>/en.yaml` or `src/content/pages/use-cases/en.yaml` | P22, P24 | briefs | entries with worked examples | as P32, plus `settle.ts` results checked by eye against the brief |
| P35 | Import captures | Sonnet | `src/assets/screenshots/**`, `src/data/screenshots.ts` (statuses) | P26; the app repo's capture script (site plan follow-up 9, an external dependency; see [Owner actions and external dependencies](#owner-actions-and-external-dependencies)) | shot list, capture manifest | optimized shots and manifest, `placeholder-en` shots replaced | build passes with every referenced shot present |

**W3b.** H16 only (homepage link labels).

**W3c. English release candidate.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P38 | Verify the complete English site before anything is translated | Sonnet | `e2e/site.spec.ts` | W3a and W3b merged | [Acceptance criteria](#acceptance-criteria), [Thresholds](#thresholds), step 6 verification | a report in the handover: each failure assigned to its owning package for a fix before W4a | `npm run verify` (English-first) and `scripts/check-nginx.sh` green; a `PREVIEW_UNPUBLISHED=1` build passes `check:site` except rule 12; `site.spec.ts` (every page, `en` and pseudo-locales, keyboard and axe) green; English pages meet the thresholds |

**W4a.** T1–T6, as in [Translation fan-out](#translation-fan-out).

**W4b. Localized verification and the full gate.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P41 | Check every locale as visitors will see it, fix layout defects, and pass the strict gate | Default | `src/i18n/pending/*.json` (emptied), `e2e/localized.spec.ts`; fixes to CSS and components in the holder table's "fixes only" slots. Wording problems go back to the owning T group through the coordinator. | T1–T6 and every back-check merged | the [Translation release gate](#translation-release-gate), [Thresholds](#thresholds), the homepage plan's [Verification](./homepage-scroll-experience.md#verification) steps 3 to 7 | screenshots of the shell, every layout, pricing and the homepage in `en`, `de`, `ja`, `hi` and `ar` at 375×812 and 1280×800 for the coordinator's visual review (RTL mirroring, CJK, Indic) | with both manifests empty, `I18N_MODE=strict npm run verify` and `scripts/check-nginx.sh` green; `npx playwright test` green; `/ja/`, `/ar/` and `/hi/` versions of one feature page and of pricing meet the thresholds |

**W4c. Release.**

| ID | Goal | Model | Owned files | Depends on | Inputs | Deliverable | Verification |
|---|---|---|---|---|---|---|---|
| P39 | Publish the release 1 pages and bring `redesign` to `main` | Sonnet | `src/site/pages.ts` (`published: true`) | P41; P35, or the capture default | none | release PR from `redesign` into `main` | step 6 verification in full, in strict mode, before merge; after deploy, `scripts/check-nginx.sh` against production URLs |

### What can start now

- **Safe now:** all of W0 (P01–P05 with H1–H3), then W1 in order. None of them needs product input.
- **Product inputs are settled** in the site plan for P22 (registry and page set), P31 (pricing promise), P32–P34 (briefs) and P35 (proof list). No package waits on the owner.
- **External dependencies** have defaults that let the build proceed: see [Owner actions and external dependencies](#owner-actions-and-external-dependencies). They block measurement and the indexing of reviewed locales, not merges.

## Bugs found during audit

| ID | Defect | Evidence | Disposition |
|---|---|---|---|
| B1 | No canonical or `og:url` on any page | 0 of 231 files | Fix in step 2 (P12) |
| B2 | Social images are relative, and the image is a 1200×377 transparent logo used for `summary_large_image` | `BaseLayout.astro` `socialImagePath`; `sips` on `public/images/en/logo-transparent.png` | Fix in step 2 (P12, absolute URLs) and step 6 (P26, 1200×630 card) |
| B3 | Page JSON-LD is dropped because the head slot is never rendered | no `<slot name="head" />`; 0 files contain `FAQPage` or `SoftwareApplication` | Fix in step 2 (P12) |
| B4 | `og:locale` is a hard-coded five-entry map, and Arabic is `ar_AE` against `intlCode` `ar-EG` | 211 files `en_US` | Fix in step 2 (P11, P12) |
| B5 | 35 alias pages duplicate their target and sit in the sitemap | `/en-gb/` identical to `/` after normalization | Fix in step 2 (P11, P14, P15) |
| B6 | Mixed slash forms; every page answers 200 at three URLs | built links and `hreflang`; local nginx: `/pricing`, `/pricing/` and `/pricing/index.html` all 200 | Fix in step 2 (P11, P14) |
| B7 | Policy text is client-fetched and English under every localized URL; 67 KB of script; visually hidden `h1` | `PolicyPage.astro`; app `PolicyTextHandlers.ts` has no locale | Fix in step 2 (P13) |
| B8 | The 404 page emits 40 `hreflang` links to non-existent `/<locale>/404/` URLs | `dist/404.html` | Fix in step 2 (P12) |
| B9 | Invalid language tag `ph` in `<html lang>` and `hreflang`. Lighthouse SEO is 92 on every page because of it. | `dist/ph/index.html`; baseline `hreflang` audit | Fix in step 2 (P11 metadata, P12 tags; D35) |
| B10 | On a first visit to an alias URL with a non-English browser, `LanguageDetection` redirects to `/fr/en-gb/`, which is a 404, because `isOnEnglishPage` ignores aliases. Browsers set to `nl`, `nb` or `nn`, `fil` or `tl` never match `nl-BE`, `no` or `ph`. The prefix test has no trailing slash (`/eu` matches `/eunice`). | `LanguageDetection.astro` code path | Fix in step 2 (P15) |
| B11 | `npm run i18n audit` exits 0 with missing keys | scratch copy without `cta.button` in `fr`: "Total missing: 1", exit 0 | Fix in step 3 (P04) |
| B12 | The English-placeholder test allows 5 untranslated values per locale (100 for `pcm`) | `translations.test.ts` `MAX_ALLOWED_IDENTICAL` | Fix in step 3 (P04) |
| B13 | Stale translations are undetected. English `features.balances.desc` was rewritten in `4b8af1c` (9 January 2026), and all 38 locales still describe the old copy ("always-visible balance panes … indirect debts"). | `git show 4b8af1c` | Fix in step 3 (P04 locks and drift report; T1–T6 retranslate in W4a) |
| B14 | `i18n add-key` and `sync` write English values into every locale and re-sort files. The `review-translations` command tells agents to run `sync`. | `scripts/i18n-manager.mjs`, `.claude/commands/review-translations.md` | Fix in step 3 (P04) |
| B15 | CI runs no tests or audit. A push to `main` builds and deploys, so the translation gate is not enforced. | `.github/workflows/deploy.yml` | Fix in step 2 (P05, P19); owner turns on branch protection |
| B16 | Locale files are not type-checked (`as Record<Locale, typeof en>` cast), and nothing runs `astro check` | `src/i18n/index.ts` | Fix in step 2 (P19) |
| B17 | Hard-coded English in localized pages: the logo alt appends `' logo'`, the homepage hero has `alt="Side Badger logo"`, and pricing has `aria-label="Pricing plans"` | `BaseLayout.astro`, `HomePage.astro`, `PricingPage.astro` | Fix in step 5 (P23), the homepage task, and step 6 (P31) |
| B18 | Footer headings are `h4` with no `h2` or `h3` above them, on every page | `BaseLayout.astro`; baseline Lighthouse `heading-order` on `/`, `/ja/`, `/ar/` | Fix in step 5 (P23) |
| B19 | Noto Sans Arabic applies only to `:lang(ar)`, not `fa` or `ur`. `AGENTS.md` claims `[dir="rtl"]` styles in `layout.css`, but none exist, and physical properties remain. | `global.css`, `layout.css`, `homepage.css` | Fix in step 5 (P23); docs in P19 |
| B20 | Every page loads Google Fonts through a CSS `@import` (372 KB raw, 94 KB on the wire, render-blocking) and 42 flag SVGs from `cdn.jsdelivr.net`. 48 of 61 requests on `/` are third-party, which sends visitor IPs elsewhere despite the "no tracking" copy. `/ja/` downloads 1.03 MiB of Noto Sans JP in about 40 slices. | `global.css` line 6; `getFlagUrl`; [baseline measurements](./baseline-measurements.md) | Fonts: D24, done by the homepage task's H4 (W1a). Flags: D24 and B34, done by P15 (W1b). |
| B21 | 41 MB of unreferenced `logo-large*.png` files are shipped and publicly served. `ko` has logos but `hasLogo: false`. | `public/images/*/logo-large*.png`; no references in `src/` | Fix in step 6 (P26) |
| B22 | Manifest icons declare 192×192 and 512×512 for a 644×561 image, which is also used as favicon and apple-touch icon | `public/manifest.json` | Fix in step 6 (P26) |
| B23 | The 148 KB raw (40 KB brotli) `FloatingParticles` module loads on every page, even under reduced motion, because the static import runs before the check | `FloatingParticles.astro` | Retired site-wide (D25) by the homepage task's H4 (W1a) |
| B24 | `hero.titleDisclaimer` holds a single U+200C so it passes the non-empty test | `en.ts` | [Homepage task](./homepage-scroll-experience.md) H11 (retires the `hero.*` keys) |
| B25 | `AGENTS.md` lists a non-existent `CausticRipples.astro` and the RTL claim in B19 | `AGENTS.md` | Fix in step 2 close-out (P19) |
| B26 | `pcm` has 83 of 196 values identical to English | value comparison | Baseline in the `pcm` lock (P04); fluent `pcm` review in step 7 |
| B27 | The language switcher uses `role="listbox"` with link options but has no listbox keyboard support and no Escape to close | `LanguageSwitcher.astro` | Fix in step 2 (P15) |
| B28 | English pages show "English (actual)" as the current language, and every English choice links to an alias URL | `LanguageSwitcher.astro` default `en-gb` | Fix in step 2 (P15), with links to target URLs |
| B29 | nginx answers 403 for `/_astro/` | local container | Fix in step 2 (P14) |
| B30 | `isRTL` lists `he`, which has no locale | `src/i18n/index.ts` | Fix in step 2 (P11, `dir` field) |
| B31 | The claimed `[...locale]` route-conflict warning | not reproduced (see the audit summary) | Guard in step 2 (P11, `failOnPrerenderConflict` and the registry test) |
| B32 | Launch links and the policy API pointed at staging | `staging.sidebadger.me` in builds before `2f9b773` | Closed by `2f9b773` on 14 October 2026 |
| B33 | Legal policies exist only in English | app policy endpoints take no locale | Separate task in `wl-bill-splitter` (translated, legally reviewed policies). The coordinator records it before P13 merges. Until then D10 labels English text honestly. |
| B34 | `/flags/iran.png` (216 KB, the largest first-party transfer) and 42 flag SVGs load on every page, although they only appear in the closed language dropdown | [baseline measurements](./baseline-measurements.md), largest transfers on `/` | Fix in step 2 (P15): self-hosted SVG flags under 2 KB each, a 2 KB derivative of the Iran flag, and option images rendered only when the dropdown first opens |
| B35 | "Coming soon" badges fail contrast (2.57:1, `#80a28e` on `#e0fce9`) on `/` and `/ja/` | baseline Lighthouse `color-contrast` | [Homepage task](./homepage-scroll-experience.md): H11 deletes the old homepage and its "Coming soon" section (site plan D12). |
| B36 | White text on the primary button gradient is 2.3:1 down to 1.4:1, and links in `#16a34a` on `#f0fdf4` are 3.15:1. Both fail WCAG AA, and both are in the header CTA and every page's links. | [homepage task defects](./homepage-scroll-experience.md#defects-found), item 3 | Homepage task H4 (owns `tokens.css` and `global.css`, W1a). P23's axe run checks the shell after it. |
| B37 | `overflow-x: hidden` on `html` and `body` makes `body` a scroll container, which breaks `position: sticky` and view timelines | `global.css` lines 53 and 67; homepage task defect 1 | Homepage task H4 (W1a): `overflow-x: clip` |
| B38 | Two English claims overstate the app. "Settle debts with a single tap": the form still needs "Record settlement". "Minimize the number of payments": the app uses a greedy match, which is not guaranteed minimal. | homepage task defect 7 | Approved wording comes from the site plan's registry (P22). The homepage copy (H2) and the retired `features.*.desc` keys (H11) drop the claims. Feature and use-case pages use only registry-approved claims. |

## Out of scope

- Changes to the external app (`wl-bill-splitter`, served at `app.sidebadger.me`), including translated legal policies and app-side attribution. Record these as tasks in that repo.
- A stricter Content-Security-Policy, which stays a separate future change to `nginx/default.conf`.
- Publishing a generic high-volume blog.
- Generating one thin page per product feature.
- Indexing untranslated fallback content, or content not yet fluent-reviewed, under localized URLs.
- Claims that cannot be verified against the product.

## Acceptance criteria

- [ ] Every indexable page has a distinct purpose and substantial original content.
- [ ] Every indexable page has one canonical URL in the slash form, one `h1`, unique metadata within its locale, and valid internal links.
- [ ] Sitemap, canonical and `hreflang` output agree, and include only indexable pages.
- [ ] Visible content and page-specific structured data agree.
- [ ] Navigation exposes the complete published site structure on desktop and mobile.
- [ ] The homepage, feature pages, use-case pages, pricing and how-it-works pages link to relevant neighbours.
- [ ] Product claims are supported by the approved feature registry, and no page depicts a feature that is not `available` or `beta`.
- [ ] Main workflows include real product evidence: captured screenshots, or, until the app-repo captures arrive, the worked examples and HTML diagrams (see [Owner actions and external dependencies](#owner-actions-and-external-dependencies)).
- [ ] Pages meet the performance and accessibility thresholds below (D36), measured with the [baseline method](./baseline-measurements.md): production image, local brotli proxy, Lighthouse 13.5.0, simulated throttling, median of three runs.
- [ ] `npm run verify` and `scripts/check-nginx.sh` pass, and the `verify` CI job gates deployment.
- [ ] Every legacy URL in `legacy-urls.txt` returns 200, or a single 301 to a 200.
- [ ] No incomplete, stale or unreviewed translation is submitted for indexing.
- [ ] Translation ran once, after the English site was complete and verified (D38), and `main` never received English-only work: no localized URL on `main` has ever shown English fallback.
- [ ] Both pending-translation manifests are empty and `verify` passes in strict mode on the release PR.
- [ ] Representative Latin, CJK, Indic and RTL pages pass visual review at mobile and desktop widths: in the pseudo-locales while building, and in `en`, `de`, `ja`, `hi` and `ar` in W4b.
- [ ] Locale aliases redirect, and canonical URLs, sitemap entries and reciprocal `hreflang` links are consistent.
- [ ] No page makes a third-party request for fonts or flags.
- [ ] Bugs found during implementation are fixed and verified, or linked to a separate task with a reason for deferral.

### Thresholds

These apply to how-it-works, both hubs, every feature and use-case page, the revised pricing page and the English legal pages, in every locale checked. The homepage meets its own budgets in [the homepage task](./homepage-scroll-experience.md#performance-strategy) and is never worse than its baseline.

| Measure | Threshold | Baseline (`/pricing/`, today's closest inner page) |
|---|---|---|
| Lighthouse performance, mobile | ≥ 90 | 79 |
| Lighthouse performance, desktop | ≥ 97 | 99 |
| LCP, mobile (simulated) | ≤ 2.5 s | 4.96 s |
| CLS | ≤ 0.05 | 0.000 |
| TBT, mobile | ≤ 150 ms | 14 ms |
| Lighthouse accessibility | ≥ 98, with no `color-contrast` or `heading-order` failures | 100 (95 on `/`) |
| axe-core (Playwright) | no serious or critical violations | not measured |
| Lighthouse SEO, indexable pages | 100 | 92 |
| Lighthouse best practices | ≥ 95 | not measured |
| Third-party requests | 0 | 48 of 61 on `/` |
| Font bytes on the wire | ≤ 100 KB for Latin, Cyrillic and Greek locales; ≤ 250 KB for Arabic-script and Indic; 0 KB of webfonts for CJK | 189 KB (`/`), 338 KB (`/ar/`), 1,053 KB (`/ja/`) |
| Script at load (gzip) | ≤ 10 KB on inner pages | 49 KB |
| Total transfer at load | ≤ 300 KB on inner pages for any locale | 640 KB (`/pricing/`), 1.5 MiB (`/ja/`) |
| Field data (owner, CrUX at p75, once available) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 | none |

The localized checks cover at least `/ja/`, `/ar/` and `/hi/` versions of one feature page and of pricing.

## Initial delivery boundary

The first implementation milestone ends after the technical repairs, navigation and content foundations, revised homepage, how-it-works page, three feature pages, three use-case pages, both hubs, pricing revision, and supporting product imagery are deployed in every supported locale. English and reviewed locales are indexable, and the rest are `noindex` until fluent review.
