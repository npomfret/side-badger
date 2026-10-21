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

### R1. Order of work: all English first, translate once, ship once

- **Decision:** the English for all three waves is built first, on local `main` in English-first mode. Then everything is translated and back-checked in one pass. Then every page is published, and `main` is pushed once the strict gate passes.
  - **Wave 1:**
    - the split-bill calculator;
    - three guides;
    - page art on the existing pages.
  - **Wave 2:**
    - four feature pages;
    - couples;
    - guides 4 to 8;
    - the rent calculator.
  - **Wave 3:**
    - the Splitwise comparison;
    - the help page.
  - **Release step:** the translation pass (P5, P10 and P13 combined), then the publish flip and the registry `homePage` updates, then the push.
- **Evidence:** the owner suggested it on 21 October 2026, after the first wave 1 translators had started: "i suggest leaving the translations until the end". English that changes during later waves (cross-links, art keys, copy tweaks) would otherwise be translated twice. The interface keys that 7 locales had already translated are kept in the scratch directory for reuse.
- **Alternatives considered:** ship each wave when it is translated. Rejected: it needs a translation pass per wave, and pages edited in a later wave go stale.
- **Reopen if:** a wave must go live before the others are written.

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

**Wave 1 guide briefs.** These are settled. The numbers were computed with `computeExample` on 21 October 2026; prose quotes only numbers the example produces. Every guide:
- has `owner: npomfret` and `reviewBy: 2027-04-21`;
- uses claims only from the registry;
- follows site plan D15 and the substitutions;
- states the 999,999.99 cap only where it matters.

1. **`how-to-split-rent-by-room-size`**
   - **H1:** "How to split rent by room size".
   - **Related:** `use-case/housemates`, `feature/split-expenses`.
   - **Answer first:**
     - decide how much of the rent pays for the shared rooms;
     - split that part equally;
     - split the rest by each bedroom's floor area;
     - round to whole percentages;
     - put the percentages on the rent in Side Badger once, and copy the bill each month.
   - **Story:** Priya, Tom and Aisha share a flat for £1,950 a month. Their bedrooms are 16, 12 and 10 m². They agree that 40% of the rent pays for the kitchen, bathroom and lounge.
   - **The method, shown as arithmetic in prose:**
     - 60% × 16/38 + 13.33% gives 38.6%, which rounds to 39%;
     - 32% and 29% come out the same way;
     - check that the three add up to 100.
   - **Worked example** (GBP):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Rent | Priya | 1,950 | percent: Priya 39, Tom 32, Aisha 29 |
     | Energy | Tom | 105 | equal |
     | Broadband | Aisha | 36 | equal |

     Result:
     - balances: Priya +1,142.50, Tom −566.00, Aisha −576.50;
     - payments: Aisha pays Priya 576.50, and Tom pays Priya 566.00.
   - **Sections also cover:**
     - en-suites and box rooms (adjust the split by agreement, then write it down);
     - someone moving out mid-month (an exact split for that month);
     - what Side Badger doesn't do here: no recurring bills (copy last month's), and it never moves money.
   - **FAQ:**
     - "What if someone has a bigger room but less light?";
     - "Should bills be split by room size too?" (usually equal);
     - "Can we change the split later?" (yes, for new expenses).

2. **`how-to-split-a-holiday-villa-when-people-stay-different-nights`**
   - **H1:** "How to split a holiday villa when people stay different nights".
   - **Related:** `use-case/group-trips`, `feature/split-expenses`, `feature/settle-up`.
   - **Answer first:**
     - price the stay per person per night;
     - multiply by each person's nights;
     - enter the villa as one expense with exact amounts.
   - **Story:** Ana books a €2,100 villa for six nights. Ana, Ben and Chloe stay all six; Dev joins for the last three. That makes 21 person-nights at €100 each.
   - **Worked example** (EUR):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Villa, 6 nights | Ana | 2,100 | exact: Ana 600, Ben 600, Chloe 600, Dev 300 |
     | Car hire | Ben | 240 | equal among Ana, Ben and Chloe (Dev came by train) |
     | Groceries | Dev | 180 | equal among all four |

     Result:
     - balances: Ana +1,375, Ben −485, Chloe −725, Dev −165;
     - payments: Chloe pays Ana 725, Ben pays Ana 485, and Dev pays Ana 165.
   - **Sections also cover:**
     - per-room pricing when rooms differ;
     - a deposit paid months earlier;
     - paying in another currency (link to multiple currencies);
     - what Side Badger doesn't do: no money moves, and one payer per expense.
   - **FAQ:**
     - "What if someone cancels?";
     - "Should the person who booked pay less?" (the group decides; record what you agree);
     - "Can we split cleaning fees differently?"

3. **`how-to-split-a-stag-or-hen-weekend`**
   - **H1:** "How to split the cost of a stag or hen weekend".
   - **Related:** `use-case/group-trips`, `feature/split-expenses`, `feature/settle-up`.
   - **Answer first:**
     - the guest of honour pays nothing, so everyone else shares the costs equally;
     - for things someone skips, leave them out of that expense;
     - keep the guest of honour out of the group so the surprise holds.
   - **Story:** Hannah, Isla, Jess and Kat take Grace away for her hen weekend. Grace isn't in the group. Kat skips the spa.
   - **Worked example** (GBP):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Cottage | Hannah | 720 | equal |
     | Spa day | Isla | 360 | equal among Hannah, Isla and Jess (it covers Grace's place too) |
     | Dinner | Jess | 260 | equal |
     | Taxi | Kat | 44 | equal |

     Result:
     - balances: Hannah +344, Isla −16, Jess −116, Kat −212;
     - payments: Kat pays Hannah 212, Jess pays Hannah 116, and Isla pays Hannah 16.
   - **Sections also cover:**
     - collecting a deposit before booking;
     - someone who joins for one night only (an exact split);
     - agreeing a budget with a poll (site plan D11: money-related planning only);
     - what Side Badger doesn't do: it never moves money, and it sends no payment reminders.
   - **FAQ:**
     - "Does the best man or maid of honour pay more?" (only if agreed);
     - "What about drinks some people didn't have?" (exact amounts, or leave them out);
     - "Can the guest of honour see the group later?" (add them as a viewer).
   - **Tone:** celebratory, never crude; no alcohol jokes.

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

### Wave 2 and 3 briefs

These are settled. They extend the site plan's briefs, which still apply where not amended here. Every page follows the cheeky-voice rule: fun and cheeky, never dorky, and translations carry the joke. Numbers come from `computeExample`, run on 21 October 2026. A page with a worked example quotes only its figures, plus the arithmetic shown.

**P6. Four feature pages.** Each has its own `src/content/features/<slug>/en.yaml`, a `feature` registry entry and page art.

- **`groups-and-permissions`**
  - Base: the site plan brief "Groups and permissions".
  - Add these:
    - The preset names are the app's, "Open collaboration" and "Managed group", plus custom permissions.
    - Invite links expire after a period you choose (15 minutes to 5 days).
    - Join approval.
    - Per-group display names and avatars, and the group header image.
    - Archive, lock and close, each in one sentence:
      - archive hides a group from your own dashboard only;
      - lock freezes changes until an admin unlocks it;
      - close is permanent, for everyone.
  - Keep the presets table as the page's "worked example". It is a section with items, not a `WorkedExample`.
  - Tone: "Your group, your rules, within reason."
- **`plan-together`** (replaces the brief's "Lists and polls")
  - H1: "Plan it together, split it after".
  - Sections:
    - comments and reactions next to the numbers;
    - question an expense (it leaves the balances until the question is closed);
    - shared lists;
    - polls (anonymous if you like, one or several choices);
    - the activity feed;
    - push notifications.
  - Everything is framed around shared spending (site plan D11).
  - Worked example: the site plan's villa poll is prose. The `WorkedExample` is the three-housemate dispute example below (guide 7's data), after the question was resolved.
  - Tone: "The shopping list and the shopping bill, finally on speaking terms."
- **`receipt-scanning`**
  - Base: the site plan brief, with R5's gate: no accuracy, speed or language claims. Drop the FAQ "How long does it take?".
  - Keep the disclosure that Google's AI service reads the image.
  - Attachments: photos or PDFs, up to three per expense; PDFs are attached, not read.
  - No `WorkedExample`. The fields filled in (description, total, currency, date, time, place) are a list.
  - Tone: "Let the badger read the receipt. You check its homework."
- **`web-app`**
  - H1: "No app store. No download. Still feels like an app".
  - Sections:
    - it runs in any modern browser on a phone or computer;
    - add it to your home screen or dock (the app offers it after sign-in; Settings shows how on iPhone);
    - push notifications (opt-in; iPhone and iPad from the home screen app only);
    - live updates;
    - 39 languages, each person their own;
    - accessibility;
    - what it doesn't do: no offline use, no app-store app.
  - Queries:
    - "bill splitting app without download";
    - "split expenses online";
    - "splitwise web version alternative" (never name a competitor in an H1).
  - No `WorkedExample`.
  - Tone: "Your phone is full. We get it."

**P7. Couples** (`use-case/couples`)
- The site plan brief, unchanged.
- Worked example:

  | Expense | Paid by | Amount | Split |
  |---|---|---|---|
  | Rent | Sam | 1,500 | Sam 60%, Alex 40% |
  | Groceries | Alex | 90 | equal |

  Alex pays Sam £555.00, one payment.
- Links to guide 4, through `related`.

**P8. Guides 4 to 8.** The same rules as wave 1, with `owner: npomfret`, `reviewBy: 2027-04-21`, and `datePublished` set to the day English is final.

4. **`how-to-split-bills-with-a-partner-who-earns-more`**
   - H1: "How to split bills with a partner who earns more".
   - Related: `use-case/couples`, `feature/split-expenses`.
   - Story: Maya takes home £2,800 a month and Jon £1,700. 2,800 ÷ 4,500 is 62.2%, which rounds to 62/38.
   - Worked example (GBP):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Rent | Maya | 1,400 | Maya 62%, Jon 38% |
     | Energy and broadband | Jon | 180 | Maya 62%, Jon 38% |
     | Takeaway | Jon | 36 | equal |

     Jon pays Maya £402.40, one payment.
   - Sections also cover:
     - 50/50 versus income-based, and agreeing which costs count as shared;
     - what happens when someone's pay changes;
     - the takeaway split equally on purpose (treats can be 50/50).
   - FAQ:
     - "Gross or take-home pay?" The group decides; take-home is common.
     - "Does Side Badger see our incomes?" No; you enter percentages only.
     - "Can we set 62/38 once?" Per expense; copy one that has it.
5. **`how-to-split-a-trip-paid-in-several-currencies`**
   - Related: `feature/multiple-currencies`, `use-case/group-trips`, `feature/settle-up`.
   - Story: Zoe, Kenji and Lucy go to Japan. The hotel was booked at home in pounds. The illustrative rate is ¥1 = £0.005.
   - Worked example (GBP, with JPY at rate 0.005):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Hotel, booked at home | Zoe | £600 | equal |
     | Rail passes | Lucy | ¥90,000 | equal |
     | Ramen night | Kenji | ¥9,000 | equal |

   - Results:
     - kept separate: in pounds, Kenji pays Zoe £200 and Lucy pays Zoe £200; in yen, Zoe pays Lucy ¥33,000 and Kenji pays Lucy ¥24,000;
     - converted: Kenji pays Zoe £235 and Kenji pays Lucy £85.
   - The guide explains both ways and when to choose each. The wording is "a current exchange rate"; never claim live or mid-market rates.
   - States the cap: 999,999.99 per expense in its own currency.
6. **`how-to-collect-for-a-group-gift`**
   - Related: `use-case/events-and-celebrations`, `feature/split-expenses`, `feature/settle-up`.
   - Story: Priya buys a £240 present online. Omar and Priya chip in £60, Lena £80, and Sam £40.
   - Worked example (GBP):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | The gift | Priya | 240 | exact: Priya 60, Omar 60, Lena 80, Sam 40 |
     | Card and wrapping | Omar | 12 | equal |

     Lena pays Priya £83, Omar pays Priya £51, and Sam pays Priya £43.
   - Sections also cover:
     - a budget poll (D11);
     - keeping the recipient out of the group;
     - collecting before or after buying.
7. **`what-to-do-when-someone-disputes-a-shared-expense`**
   - Related: `feature/plan-together`, `use-case/housemates`, `feature/settle-up`.
   - Story: Tom adds £45 of party wine split between all three. Aisha didn't drink and questions it.
     - While the question is open, the wine is out of everyone's balances.
     - They agree it is Tom and Priya's. Tom edits the split and Aisha closes the question.
   - Worked example (GBP), the state after the edit:

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Big shop | Tom | 84 | equal |
     | Cleaner | Priya | 60 | equal |
     | Party wine | Tom | 45 | equal between Tom and Priya |

     Aisha pays Tom £48 and Priya pays Tom £10.50.
   - Sections also cover:
     - how to word a question (with the app's labels);
     - who can close one (the questioner or an admin);
     - questions only work when the group turns them on;
     - an edit keeps the earlier version.
   - Tone: diplomatic, cheeky about the wine, never sides with anyone.
8. **`how-to-settle-up-after-a-group-trip`**
   - Related: `feature/settle-up`, `use-case/group-trips`.
   - Story: five friends, five expenses.
   - Worked example (EUR):

     | Expense | Paid by | Amount | Split |
     |---|---|---|---|
     | Apartment | Mo | 1,000 | equal |
     | Boat trip | Ines | 250 | equal |
     | Big dinner | Raf | 300 | equal |
     | Airport taxi | Tess | 60 | equal among Tess, Uma and Mo |
     | Groceries | Mo | 90 | equal |

     Ten person-to-person debts become four payments, all to Mo: Uma €348, Tess €288, Ines €78 and Raf €28.
   - The part-payment section uses its own stated figures: Uma pays €200 now, and €148 stays on her balance.
   - Sections also cover:
     - when to settle (before everyone scatters);
     - recording each payment;
     - quick-settle;
     - reactions on a payment.

**P9. Rent calculator** (`/rent-split-calculator/`, type `tool`, product footer order 9). It reuses P1's patterns: the fragment link, no network or storage, the script budget, page art and a 500 to 700 word page.
- **Two modes:**
  - **By room size:** the rent, currency, the share for shared rooms (default 40%), and 2 to 10 people with bedroom areas. The unit (m² or ft²) is a label only.
  - **By income:** the rent, plus optional bills, and 2 to 10 people with incomes.
- **Output for each person:**
  - the exact share to two decimals;
  - a whole-percentage share by the largest remainder, so it totals exactly 100;
  - the amount, apportioned in minor units.
- **Under the result:** "In Side Badger, choose **Percentage** and type …", using the app's label.
- **Content:** its worked example is guide 1's flat. It links to guides 1 and 4 through `related`, and guide 1 adds the calculator to its `related`.

**P11. Splitwise comparison.**
- The site plan brief and D16.
- Facts gathered on the day of writing from splitwise.com only, with the date on the page.
- No logos. No claims about Splitwise's daily expense limit.

**P12. Help page** (`/support/` rebuilt, type `support`, English indexable).
- Short answers, each one to three sentences, grouped under:
  - "Signing in";
  - "Joining a group";
  - "Expenses";
  - "Payments";
  - "Notifications and the home screen";
  - "Leaving, archiving, locking and closing";
  - "Still stuck?".
- Each answer links to the page or guide that explains more. Facts come from the app's `docs/user-features.md`.
- The email stays as plain text, not a link.
- `FAQPage` JSON-LD.
- Tone: helpful first, cheeky second: "Forgot your password? It happens to the best badgers."

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
