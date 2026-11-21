# Site structure, content and components (moved verbatim from AGENTS.md)

Read before changing pages, layouts, content blocks, registries, the shell, or the homepage. The invariants that must be known before acting stay in AGENTS.md.

## Site structure

- `src/site/routes.ts`: `pathsFor(pageId)` / `pathsForType(type)` for `getStaticPaths()`. Route files live in `src/pages/[...locale]/`.
- `src/site/cross-links.ts`: the page ids a page links to automatically (its `related` list, the features a use case depicts, the use cases that depict a feature). Callers filter by publication.
- `src/seo/`: `urls.ts` (paths, canonicals, launch links), `alternates.ts` (hreflang), `indexability.ts` (noindex rules), `jsonld.ts` (typed JSON-LD graph).
- `src/components/layout/`: `SeoHead`, `SiteHeader`, `MobileNav`, `SiteFooter`. `BaseLayout.astro` composes them with `src/components/nav/Breadcrumbs.astro` and `RelatedLinks.astro`.

### Shell

- `SiteHeader` is sticky; `--header-h` (`tokens.css`) is its height and drives `scroll-padding-top` and the pinned homepage scenes. Use it instead of a literal.
- `MobileNav` is a native Popover API menu (`popovertarget`, `popover`): Escape, light dismiss and focus return come from the browser, so add no JS for them.
- Breadcrumbs come from the registry `parent` chain and match the BreadcrumbList JSON-LD.

### Registries and content

- Content is YAML, one file per page per locale: `src/content/{features,use-cases,pages,guides}/<slug>/<locale>.yaml`. `src/content/schemas.ts` (zod) defines every shape; `content.test.ts` checks structural parity between locales (same keys as English).
- A worked example is data, not prose: `computeExample` (`src/lib/settle.ts`) computes the settlement, `content/money.ts` formats it and `WorkedExample` shows it. Locales may change names, labels and amounts, but people, payers, split methods and payment count must match English. `exampleAfter` places the example after N sections; `navLabel` (max 32 characters) is the short label used in navigation.

### Layouts and content blocks

- `src/layouts/`: `FeaturePageLayout`, `UseCasePageLayout`, `HubLayout` (the features, use-cases and guides indexes), `HowItWorksLayout`, `GuidePageLayout`, plus `BaseLayout`. The route files in `src/pages/[...locale]/` load the collection entry and pass it in.
- `GuidePageLayout` (guides: page type `article`, id `guide/<slug>`, path `/guides/<slug>/`) composes the hero, sections, `WorkedExample` (by `exampleAfter`), `FaqList`, `RelatedPages` and `CtaBand`, and emits `Article` JSON-LD. A guide's `owner`, `reviewBy` and dates are structural, and it names at least two product pages in `related` (restructure D20); those pages list it back.
- `ToolPageLayout` (page type `tool`, the calculators) composes the hero, the calculator named for the page in its `TOOLS` map, the sections, `WorkedExample`, `FaqList`, `RelatedPages` and `CtaBand`, and emits `WebApplication` JSON-LD.
- `src/components/tools/` holds the in-browser calculators (`SplitCalculator`, `RentCalculator`). Each has pure logic (`*-engine.ts`, over `src/lib/settle.ts`), a share-link codec (`*-fragment.ts`, on `fragment-codec.ts`: the state in the URL fragment, no network, no storage) and one page script, with `calculator.css`, `CurrencyField`, `ToolResultFooter` and `tool-dom.ts` shared. A page's scripts must stay under 10 KB gzipped at load.
- `src/components/content/` holds the building blocks: `PageHero`, `PageArt`, `ContentSection`, `ExtraSections`, `CardGrid`, `WorkflowSteps`, `WorkedExample`, `Screenshot`, `FaqList`, `LimitsList`, `RelatedPages`, `CtaBand`, `BetaLabel`, `RichText`. Compose these rather than writing page-specific markup.
- Page art: `PageHero` shows `PageArt` (two to four homepage props in one of five layouts: `cluster`, `stack`, `row`, `chat`, `flank`) beside the h1 on wide screens and as a strip under the call to action on phones. What goes in it is `src/data/page-art.ts`, keyed by registry page id; its words come only from the page's worked example, existing keys or short `art.<page>.<slot>` keys (at most six words), and `page-art.test.ts` checks every reference. It is `aria-hidden` and still. A product shot with an image takes the art's place in the hero. The props paint with `src/styles/props.css` (the paper palette), scoped to `.home`, `.page-art` and `.worked-example`. `WorkedExample` is styled like the app's ledger (till slips, a "who pays whom" card), and `WorkflowSteps` underlines each step title with a `Doodle`.

## Components

- `PricingPage.astro` - pricing body
- `PolicyPage.astro` - The legal page shell: title, translated loading/failure/retry UI and a `<noscript>` link to the source text. `src/components/policy/` fetches the policy in the browser (`policy-source.ts`, 10 s timeout, publication date from `/current` only), turns Markdown into a safe element tree (`policy-markdown.ts` over `policy-tree.ts`: no raw HTML, link allowlist, headings shifted under the single h1, tables in labelled scroll regions) and builds it with DOM calls, never `innerHTML`. The Markdown parser is a separate chunk fetched with the request. The text stays English (`lang="en" dir="ltr"`); non-English locales show a translated notice. Legal pages have no Markdown alternate (`hasMarkdownAlternate`)
- `LanguageSwitcher.astro`, `LanguageDetection.astro` - language picker and first-visit detection
- `EasterEggs.astro` - Konami code, disco mode, hidden interactions

### Homepage (`src/components/home/`)

A scroll-driven set of scenes. Styles are in `src/styles/home/` (`tokens.css`, `scenes.css`).
- `HomePage.astro` composes the scenes; `ScrollScene.astro` is the scene wrapper (its `data-*` contract is documented in `scene-controller.ts`); `AppFrame.astro` frames app-like content.
- `scenes/` has one component per scene (`SceneChaos`, `SceneTangle`, `SceneGroup`, `SceneExpenses`, `SceneCurrencies`, `SceneSettle`, `SceneWorlds`, `ScenePricing`, `SceneTrust`).
- `props/` is the illustration kit (`Paper`, `Receipt`, `Polaroid`, `StickyNote`, `Stamp`, `Doodle`, `Avatar`, `ChatBubble`, `Money`, `SceneLink`) with `chaos/`, `expenses/` and `worlds/` sub-kits.
- `tangle/layout.ts` lays out the debt tangle; `data/` holds the scene data (`example-group.ts`, `home-features.ts`, `links.ts`, `worlds.ts`); `format.ts` formats money.
- `scene-controller.ts` is the only homepage script: no scroll listeners and no permanent animation loop. It picks the engine: `native` (CSS view timelines), `stages` (fallback for browsers without them; sets `data-stage` from hidden regions) or `static` (reduced motion or a viewport under 560 px high: nothing pinned, scenes rest at `data-static-stage`). `?scenes=stages` forces the fallback for testing. Ambient loops stop 5 s after a scene activates.
- The hero (`SceneChaos`) keeps its copy still and scans the messy table's taxi receipt once: receipt/mess → scanning → fields land → filled form marked for checking. `ScrollScene`'s `play="once"` and `duration={3000}` use stage boundaries as percentages of time. Desktop starts after paint; phones observe the visual's `[data-scene-entry]` (25% entry). Timed scenes bypass scroll stages in both engines. Setup cancels timers/observers, and a started pass never replays after a breakpoint or motion change. Static/reduced motion and no-JS show the filled review form. Normal-flow props reserve its space; only transforms and opacity animate.
- `props/expenses/ScanReceipt` owns the receipt and camera frame; `AddExpenseForm` is filled by default and optionally exposes scanning/review messages and field markers. They consume inherited semantic `--scan-*` state hooks; the caller owns the mapping from its stage numbers to those hooks. Inactive messages use visibility as well as opacity, and the default/no-JS state exposes only the review cue. The hero stacks its receipt column above the mess. `SceneExpenses` starts with the filled form at stage 0 and drops ledger cards at stage 1 (desktop pinned, phone entry); it no longer scans.
- Confetti is lazy: `canvas-confetti` is dynamically imported on first use (`[data-confetti]`, the `home:confetti` event, easter eggs, pricing) and never under reduced motion.
- Homepage text is `home.*` keys in `en.ts`; app links go through `LaunchAppCta`.
