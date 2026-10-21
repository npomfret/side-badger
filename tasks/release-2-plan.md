# Release 2: tools, guides, more features and a livelier look

Settled plan, written 21 October 2026. The owner asked how to improve the site's look, cover more of the app's features and do better in search, suggesting use cases, user stories and example usages. Claude chose the path; each decision below gives the evidence, the alternatives considered and what would reopen it. Implementation agents apply the decisions without asking again.

This plan extends [the site plan](./seo-site-expansion-plan.md), which still holds the editorial rules, the feature registry, the page briefs and decisions D1 to D19; it cites them as "site plan Dn". It cites the decisions kept in [follow-ups](./follow-ups.md) as "restructure Dn". Its own decisions are R1 to R12.

## Evidence base

- **App features:** `docs/user-features.md` in `wl-bill-splitter`, reviewed 21 October 2026 at app revision `eb4e6b3e5`. The app was at `70e9de297` when this plan was written.
- **Production check, 21 October 2026:** `https://app.sidebadger.me/sw.js` is served as JavaScript, so push notifications are live in production.
- **Site measurements, 21 October 2026** (built English pages, inside `<main>`):

| Page | Words | Images or illustrations |
|---|---|---|
| Homepage | 1,074 | 2 images, 27 SVG props |
| How it works | 825 | 0 |
| Features hub | 616 | 0 |
| Split expenses | 1,182 | 0 |
| Settle up | 1,047 | 0 |
| Multiple currencies | 1,104 | 0 |
| Use cases hub | 505 | 0 |
| Group trips | 920 | 0 |
| Housemates | 1,058 | 0 |
| Events and celebrations | 858 | 0 |
| Pricing | 528 | 6 icons |
| Support | 11 | 0 |

Every screenshot in `src/data/screenshots.ts` is still `missing` (restructure D33).

## What changed in the app since the site plan

- **Push notifications ship.** They are opt-in for each account and each device. They need a browser that supports them and the browser's permission. On iPhone and iPad they work only in the app added to the Home Screen. The site plan's statements "no push notification" and "notifications are in-app only" are superseded. The registry (`live-updates`, `home-screen`, `email-alerts`) and the features page were corrected on 21 October 2026.
- **The app offers installation itself.** The app root owns the install prompt, and Chrome's installability check passes on staging and production (app commits `276634759`, `683b85b1b`). The follow-up asking the app for this is closed.
- **A connected-app (ChatGPT) integration exists** as a personal OAuth connection. Its public plugin listing is not published.
- **Receipt extraction quality is deferred, with no date** (`tasks/deferred/receipt-extraction-quality-and-cost.md` in the app). This affects site plan D10; see R5.
- **The features doc confirms these, with no page of their own on the site:**
  - roles: admin, member and viewer;
  - Open and Managed permission presets, and custom permissions;
  - join approval;
  - lock, which is reversible, as distinct from close (irreversible) and archive (per member);
  - expense questions, which hold an expense out of balances until the question is closed;
  - copying an expense, list or poll;
  - anonymous and multi-choice polls;
  - per-group display names and avatars, and header images;
  - labels, location, notes and several attachments on an expense;
  - settlement history and its edit rules;
  - reactions;
  - feedback with replies.

## Decisions

### R1. Order of work: tools, then guides, then feature pages

- **Decision:** wave 1 has three parts:
  - the split-bill calculator;
  - the first three guides;
  - illustrated page art on the existing pages.

  Wave 2 has:
  - four feature pages;
  - the couples use case;
  - five more guides;
  - the rent calculator.

  Wave 3 has the Splitwise comparison and the full support page. Every wave reaches `main` only when all 39 locales are complete and `checked` (restructure D31, D38).
- **Evidence:** every new page costs 38 translations and 38 back-checks, so pages are ordered by expected search value per page. Calculators and question-shaped guides answer searches the current product pages cannot reach: people searching for a way to work out a split, rather than for an app. Page art improves ten existing pages without adding any.
- **Alternatives considered:**
  - Feature pages first. Rejected: they compete for "app" searches that the existing pages already target.
  - Ship English pages before their translations. Rejected by restructure D38, which keeps `main` strict.
- **Reopen if:** Search Console data at the 4-week review shows feature searches outperforming the guides.

### R2. Calculators live at top-level URLs

- **Decision:** `/split-bill-calculator/` in wave 1 and `/rent-split-calculator/` in wave 2. Each has page type `tool` (new in `PageType`), parent `home` and footer group Product. There is no `/tools/` hub until there are three tools.
- **Alternatives considered:** `/tools/<slug>/`. Rejected while the hub would hold one or two items: either `/tools/` would 404 (bad for people who trim the URL) or it would be a thin page.
- **Reopen if:** a third tool is planned. Then add `/tools/` and 301 the old URLs.

### R3. What the split-bill calculator does

- **Decision:**
  - **Inputs:** 2 to 20 people by name; any number of expenses, each with a payer, an amount and an equal, exact or percentage split across chosen people; one currency per calculation, chosen from a list.
  - **Outputs:** each person's balance, and the short list of payments that settles everyone. It uses the same greedy simplifier as the app and the worked examples (`src/lib/settle.ts`).
  - **Wording:** "fewer payments", never "fewest" (site plan D15).
- **Privacy:** the calculation runs in the browser. The page makes no network request and uses no storage. A "copy link" button puts the state in the URL fragment (`#…`), which browsers never send to a server, so a group can share a result. The page says so in one sentence. Fragment state is validated and size-capped, and invalid state is ignored.
- **Script budget (restructure D36: at most 10 KB gzip at load):**
  - The UI is vanilla TypeScript in an Astro `<script>`; no framework.
  - It imports only what it needs from `settle.ts`.
  - If the gzip total at load goes over 10 KB, the engine is loaded with `import()` on the first input.
- **Without JavaScript:** the page still shows its explanation, a worked example computed at build time with `computeExample` and the FAQ. A `<noscript>` line explains the calculator needs JavaScript.
- **Page content:** 500 to 700 words around the tool:
  - how the calculation works;
  - why the payments list is short;
  - what the calculator doesn't do (no money moves, one currency);
  - a FAQ.
- **Call to action:** the closing band reads, in substance, "Keep the count going in a group" with the shared "Start a group" button. A second launch link sits under the result, with `cta=tool-result`.
- **JSON-LD:** `WebApplication` with `applicationCategory: FinanceApplication`, `isAccessibleForFree: true`, `offers` price 0, plus the usual breadcrumbs. Add `tool` to the required types in `rule11-jsonld`.
- **Alternatives considered:**
  - Several currencies with conversion. Rejected for v1: it needs exchange rates, which means a network request or stale rates baked into the page.
  - Saving drafts in `localStorage`. Rejected: the fragment link covers sharing, and storage adds a privacy line for little gain.
- **Reopen if:** visitors ask for several currencies (feedback or support email), or the result link sees heavy use (`/go/` counts for `cta=tool-result`).

### R4. Guides: the gate in restructure D20 opens now

- **Decision:** guides ship now, under `/guides/<slug>/`, with page type `article`, `articleNode` JSON-LD and a `/guides/` hub once three are published. Restructure D20 waited for search data or repeated user questions; the owner's request of 21 October 2026 replaces that gate. D20's other conditions stand:
  - each guide links to at least two product pages;
  - each has an `owner` and a `reviewBy` date.
- **Shape of a guide:** a user story told through one realistic fictional group.
  - The H1 is the reader's question.
  - The answer comes in the first paragraph.
  - Then the group's situation, the worked example and the method in the app, with the screens named as the app names them.
  - Then the edge cases, "what Side Badger doesn't do" where relevant, and a closing call to action.
  - 700 to 1,200 words.
  - The worked example is data computed by `computeExample` (the content rules for worked examples apply).
  - Names and amounts may be localized; people, payers, split methods and payment count may not.
- **Wave 1 guides:**
  1. `how-to-split-rent-by-room-size`: housemates, percentage split. It links to the rent calculator once that ships.
  2. `how-to-split-a-holiday-villa-when-people-stay-different-nights`: group trips, exact amounts.
  3. `how-to-split-a-stag-or-hen-weekend`: the guest of honour pays nothing; equal split among the others.
- **Wave 2 guides:**
  4. `how-to-split-bills-with-a-partner-who-earns-more`: couples, percentage split.
  5. `how-to-split-a-trip-paid-in-several-currencies`: multiple currencies, with and without converting.
  6. `how-to-collect-for-a-group-gift`: events; exact amounts when people chip in different sums.
  7. `what-to-do-when-someone-disputes-a-shared-expense`: expense questions, and the expense held out of balances.
  8. `how-to-settle-up-after-a-group-trip`: settle up and part payments.
- **Not written:**
  - "Best bill-splitting apps" round-ups, because we would be judging our own entry.
  - Guides about clubs, teams, school trips or work expenses (site plan D9).
  - Guides about to-do lists or non-money planning (site plan D11).
- **No `HowTo` markup:** Google stopped showing HowTo rich results in 2023, and since then FAQ rich results go mainly to government and health sites. The existing `FAQPage` markup stays where the pattern exists, with no expectation of rich results.
- **Reopen if:** a guide gets no impressions within 12 weeks. Then merge it into the nearest use-case page and 301 the URL.

### R5. Four new feature pages; the receipt-scanning gate opens without accuracy claims

- **Decision:** wave 2 publishes these four pages.
  - `/features/groups-and-permissions/`: the site plan's brief, extended with:
    - the Open and Managed presets and custom permissions;
    - the viewer role and join approval;
    - lock versus close versus archive, each explained in one sentence;
    - invite link expiry and QR codes.
  - `/features/plan-together/`: comments, reactions, expense questions, lists, polls, the activity feed and push notifications. It takes over the site plan's "Lists and polls" brief. It is framed around shared spending only (site plan D11, terms section 7.1).
  - `/features/receipt-scanning/`: receipt scanning and attachments.
  - `/features/web-app/`: no app store; works in the browser; add it to the home screen; push notifications; 39 languages; accessibility.
- **The gate on receipt scanning:** site plan D10 held this page until extraction quality was recorded. The app has since deferred that work with no date, so the gate would hold the page indefinitely. The page ships with only the claims already approved and live elsewhere:
  - "fills in the details for you to check";
  - "read by Google's AI service";
  - "keep the receipt with the expense", with the attachment limits.

  No accuracy, speed or language-coverage claim may appear until the app records evidence.
- **Expense questions** get a section on plan-together and on settle-up, plus guide 7. They do not get a page of their own, which would be thin.
- **Alternatives considered:**
  - A page for every registry feature (about 20). Rejected: thin, overlapping pages and 760 translations.
  - Merging groups and plan-together into one page. Rejected: two different search intents (running a group, agreeing things in it).
- **Reopen if:** the app records extraction-quality evidence (add accuracy claims), or a page's topic proves too broad at the 8-week review.

### R6. One new use case: couples

- **Decision:** publish `/use-cases/couples/` from the site plan's brief in wave 2. No other use-case pages:
  - student houses become a section of housemates, plus guide 1;
  - stag and hen weekends, villas and ski trips are guides or sections of group trips;
  - gifts are guide 6.
- **Evidence:** the site plan's goal of no thin or duplicate pages. A page per occasion would compete with group trips for the same searches.
- **Reopen if:** Search Console shows a distinct high-volume occasion that the existing pages rank poorly for.

### R7. The look: illustrated art on inner pages, reusing the homepage props

- **Decision:**
  - **Page art.** A new `src/components/content/PageArt.astro` composes 2 to 4 props from `src/components/home/props/`: `Receipt`, `StickyNote`, `Polaroid`, `Avatar`, `ChatBubble`, `Stamp`, `Paper`, `Doodle`, `Money`, and the `expenses/` cards. Each composition is a small fixed layout in the page hero, beside the H1 on wide screens and below the lead on phones.
    - Each page's art is data in `src/data/page-art.ts`, keyed by page id: a layout name and its props. It is not a field in the YAML entries: adding one to English would break locale parity until every translation existed.
    - Prop texts come from the page's worked example (names, labels and amounts formatted for the locale), from existing translated keys, or from new `art.*` keys in `en.ts` of at most six words each, translated with the wave.
  - **Worked example.** `WorkedExample` keeps its table semantics but is styled as the app's ledger: expense rows as receipt slips, and the payments list as a "who pays whom" card, using the `LedgerCard` look.
  - **Workflow steps.** `WorkflowSteps` gets one `Doodle` per step.
  - **Every feature, use-case, tool and guide page** gets page art in its wave. The ten existing inner pages get it in wave 1.
- **Constraints:**
  - No new client JavaScript.
  - Inline SVG and CSS only; no raster images.
  - The LCP element stays text.
  - CLS 0.
  - The art is `aria-hidden` unless it carries information that the text doesn't.
  - Logical CSS properties throughout; check `/ar/`.
  - Motion only through existing scene-free CSS, and none under `prefers-reduced-motion`.
  - Restructure D36 thresholds hold on every page type.
- **Evidence:** the props carry no homepage tokens (no `--home-*` variables), so they can be used on any page. The ten inner pages have no images at all (see the measurements table).
- **Alternatives considered:**
  - Product screenshots. Best for trust, but blocked: the capture script in the app repo does not exist (restructure D33). Kept as an owner action; screenshots replace or join the art when they land.
  - Stock or AI-generated images. Rejected: off-brand, raster weight, and nothing in them is true about the product.
  - New bespoke illustrations. Rejected for now: the props already define the look the owner likes.
- **Reopen if:** screenshots become available. Then each feature page shows its real screen next to the art.

### R8. Comparisons start with Splitwise

- **Decision:** `/compare/splitwise/` ships in wave 3 from the site plan's brief and site plan D16:
  - facts only from Splitwise's own pages, with an "as of" date;
  - checked again every quarter;
  - no logos.

  Tricount follows only after the Splitwise page has been through one quarterly check.
- **Reopen if:** keeping the facts current every quarter proves too costly, in which case withdraw the page.

### R9. The support page becomes a help page

- **Decision:** wave 3 rebuilds `/support/` into short answers drawn from the app's features doc:
  - signing in, verifying your email and resetting a password;
  - joining a group from a link, and pending approval;
  - adding, copying and questioning an expense;
  - recording and correcting a payment;
  - notifications and the home screen;
  - leaving, archiving, locking and closing;
  - sending feedback from inside the app.

  The email address stays plain text, not a link. Each answer links to the feature page or guide that explains more. `FAQPage` markup, English indexable.
- **Evidence:** the owner said on 21 October 2026 that a full support page is coming. Visitors already arrive looking for sign-in help.

### R10. Not advertised

- **Decision:** the site does not mention:
  - the ChatGPT or connected-app integration, until its public listing is live and the owner says so;
  - search, export or payment requests, which are planned or deferred (site plan D12);
  - anything that implies notifications are guaranteed (registry `live-updates` limits).

  The trust and wording rules in site plan D3, D11, D15 and D19 apply to every new page.

### R11. Translation and back-check process

- **Decision:**
  - English is written and reviewed first; it can be built locally with `I18N_MODE=english-first`.
  - Translator agents work in batches of at most ten locales.
  - Back-checks go to separate agents, also in batches of at most ten.
  - A back-checker writes its blind English back-translations to a scratch file containing English only, then compares, then runs `npm run i18n backcheck <locale> <page> --pass --checker <id>`. Its report must paste the back-translations.
  - The orchestrating agent re-checks any locale where a report admits a shortcut.
- **Evidence:** on 21 October 2026 a back-check agent given 19 locales, which wrote the foreign text back into its packet, was stopped partway by a safety classifier. Smaller batches with English-only output files completed.
- **Reopen if:** a fluent human reviewer takes over a locale (restructure D31: only humans write `reviewed`).

### R12. Measurement

- **Decision:**
  - Every new launch link goes through `launchHref()`, using the `cta` values `tool-result`, `guide-end` and `footer-cta`.
  - The 4, 8 and 12-week search reviews (follow-ups) start from the wave 1 release date and compare:
    - guides and tools against feature pages, by impressions and by `/go/` clicks;
    - pages with art against before, by engagement proxies: `/go/` clicks per page.

  No analytics script (restructure D28).

## Work packages

Each package owns its files exclusively; agents build in a private copy, never the shared `dist/`. Browser tests run with `--workers=1`, and no more than two browser-heavy agents run at once. Sonnet implements and the default model reviews each package before it merges, one at a time, with the checks run after each merge.

### Wave 1

**P1. Split-bill calculator** (R2, R3)
- Owns:
  - `src/pages/[...locale]/split-bill-calculator.astro`
  - `src/components/tools/`
  - `tools.split.*` keys in `src/i18n/en.ts`
  - the registry entry in `src/site/pages.ts`
  - `tool` in `PageType` and in `rule11-jsonld`
  - `e2e/tools.spec.ts` and `e2e/pages/toolsPage.ts`
- Reads `src/lib/settle.ts`; any change to it is made in this package only and keeps `settle.test.ts` green.
- **Done when:**
  - Unit tests cover the fragment round-trip, invalid fragments, 20 people and the amount cap (`MAX_EXPENSE_AMOUNT`).
  - The e2e test adds three people and two expenses and sees the balances and payments, following the browser-testing skill.
  - Script at load is at most 10 KB gzip, as measured.
  - Lighthouse passes the restructure D36 thresholds on the page.
  - `/ar/` is checked.
  - Network requests: none beyond the page's own assets.

**P2. Guides infrastructure** (R4)
- Owns:
  - the `guides` collection in `src/content/schemas.ts`, with `owner`, `reviewBy` and the worked-example fields shared with features;
  - `src/layouts/GuidePageLayout.astro`;
  - `src/pages/[...locale]/guides/[slug].astro` and `guides/index.astro`;
  - registry entries with `published: false`;
  - cross-links, so guides list their product pages and product pages list their guides;
  - `rule11` for `article`;
  - the e2e layout fixture for guides.
- **Done when:** a preview guide renders under `PREVIEW_UNPUBLISHED=1`, and the verify gate and layouts e2e pass.

**P3. Three guides, English** (R4), one agent per guide after P2 merges.
- Owns `src/content/guides/<slug>/en.yaml`.
- Writes to the editorial rules in the site plan (voice, guardrails, substitutions), with claims only from the registry.
- **Done when:** the default model's editorial review passes, and the content and registry tests pass.

**P4. Page art** (R7)
- Owns:
  - `src/components/content/PageArt.astro`
  - `src/data/page-art.ts` and the `art.*` keys in `en.ts`
  - the art slot in `PageHero`
  - `WorkedExample` and `WorkflowSteps` styling
- **Done when:**
  - Desktop, phone and `/ar/` screenshots of all ten pages have been reviewed.
  - CLS is 0 and LCP is text.
  - Axe shows no violations.
  - The verify gate passes.

**P5. Wave 1 translations and back-checks** (R11)
- Covers everything P1, P3 and P4 added: keys, the tool page and guide entries, and `art.*` keys.
- **Done when:** the strict audit and verify gate pass with every locale `checked`.

Then flip `published: true`, merge, push to `main`, and check production.

### Wave 2

- **P6.** Four feature pages (R5), one agent each, using the existing briefs as amended here.
- **P7.** The couples use case (R6), from the site plan's brief.
- **P8.** Guides 4 to 8 (R4).
- **P9.** Rent calculator (R2), reusing P1's components:
  - split by room size, with an optional share for common space;
  - split by income;
  - output as each person's percentage and amount for rent and for bills.
- **P10.** Page art for every wave 2 page, then translations and back-checks (R11).

### Wave 3

- **P11.** `/compare/splitwise/` (R8), with Splitwise facts gathered on the day and dated.
- **P12.** Help page (R9).
- **P13.** Translations and back-checks.

## Owner actions

| Action | Why | Until then |
|---|---|---|
| Confirm the Search Console property and submit the sitemap | Shows which guides and tools actually get searched (R12) | The reviews compare `/go/` clicks only |
| Find fluent reviewers for two or three large locales | Only English is indexed; each reviewed locale is another site Google can rank | Localized pages stay `noindex` |
| Approve a screenshot capture-script task in `wl-bill-splitter` | Real screens are the strongest proof (R7, restructure D33) | Page art only |
| Decide whether the ChatGPT connection is marketed once its listing is public | R10 | Not mentioned |

## Done on 21 October 2026, before wave 1

- Every page's closing button and the pricing card say "Start a group". `CtaBand` and `PricingPage` use the shared `home.hero.ctaPrimary` key. `cta.button` was removed from the content schema and every entry, and `pricing.free.cta` was deleted.
- On the features page:
  - push notifications are listed as available;
  - "email or text alerts" stays in "doesn't do";
  - the registry's `live-updates`, `home-screen` and `email-alerts` records were updated.
