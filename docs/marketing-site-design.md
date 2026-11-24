# Marketing site design decisions

The marketing-site expansion's two content releases have shipped. This document retains its
durable design guidance and decision numbers. The original research, claim audit and page briefs
remain in Git history through commit `536c922`; they describe dated evidence, not current product
availability. The original app evidence was read at `d2911d837` on 14 October 2026, the site at
`bc01126`, and the exchange-rate service at `25010fc`.

Current copy rules are in [AGENTS.md](../AGENTS.md), implementation contracts in
[site-structure.md](./site-structure.md), and translation mechanics in [i18n.md](./i18n.md).
The code registries below take precedence over the historical research. This is a design reference,
not a work queue or a release-status record.

## Audience and page purpose

Help adults organising shared costs in small groups understand whether Side Badger fits their
situation, then launch the app with accurate expectations. The original audience order was group
trips, shared households, events and gifts, then couples. Search phrases are hypotheses to validate
with Search Console, not measured demand.

Give each landing page one distinct question to answer. Feature pages explain an outcome;
use-case pages explain a recognisable situation. Calculators and guides should solve a useful
problem in their own right. Avoid thin variants and implementation-detail feature directories.
The published page set, routes and relationships belong to `src/site/pages.ts`.

## Decision index

Existing code comments use “site plan Dn” for these decisions. Numbers are preserved so those
references remain meaningful; later owner decisions and the current registries override old claims.

| ID | Durable decision and current qualification |
|---|---|
| D1 | App links target production through `LaunchAppCta` and the URL helpers, with the visitor's language. |
| D2 | Describe what is free today and disclose limits. The original “no ads” promise was superseded on 22 November 2026: ads and a paid tier may come, so promise neither absence nor perpetual free service. |
| D3 | Trust claims must agree with the app's current policies and the approved registry wording. Avoid unsupported privacy or ownership promises. |
| D4 | The public Side Badger site does not offer white-label hosting. |
| D5 | Use Search Console and the first-party launch counter to assess search and app launches. The nginx configuration owns redirect targets and counter fields. |
| D6 | Prioritise adults sharing personal costs, beginning with English-language search and UK vocabulary. Use measured demand before adding market-specific SEO variants. |
| D7 | Build focused feature, use-case, guide, tool and comparison pages. The release sequence is historical; the page registry owns today's published set. |
| D8 | Give balances and settlement a clear home; group related capabilities rather than making a page for every control. |
| D9 | Use group trips, housemates, events and celebrations, and couples. Avoid school-pupil examples and unsupported organisational use. |
| D10 | Receipt scanning fills in details for a person to check. Make no unsupported accuracy or speed claim and expose no provider or processing implementation detail. The dedicated page has shipped. |
| D11 | Frame lists, polls and comments around shared spending, consistent with current policies. |
| D12 | Describe released capabilities rather than publishing a speculative roadmap. Recheck availability and entitlements before advertising integrations or Pro access. |
| D13 | Explain customer outcomes instead of return URLs, focus traps, pagination and other implementation details. |
| D14 | Produce product screenshots from repeatable fictional demo scenarios in the app repository; this site owns the shot specification, optimisation and placement. |
| D15 | Say “fewer payments”, “record a payment” and “a current exchange rate”. Do not imply the mathematically fewest payments, movement of money or real-time rates. |
| D16 | Keep competitor comparisons dated, sourced from the competitor's own pages and rechecked quarterly. Do not invent unpublished limits or infer unsupported capabilities. |
| D17 | Keep one English source; use housemates/flatmates/roommates and holiday/vacation/trip where they fit the reader's question. |
| D18 | Use the Side Badger brand and current year for the site copyright. |
| D19 | Disclose real amount limits and keep worked examples valid. The original single-cap assumption is superseded: consult the current currency-aware evidence and claims in `src/data/features.ts`. |

## Product feature registry

`src/data/features.ts` owns feature status, evidence, limits and approved claim IDs;
`src/data/use-cases.ts` owns supported scenarios. Pages reference those IDs and never print the
internal registry strings. `src/data/substitutions.ts` owns banned English phrases and replacements.
Do not copy a dated feature count, currency count, availability claim or policy promise from the
historical plan into new copy.

## Rules for every brief

- State the reader's question, the intended outcome and the product facts that support it.
- Reference approved feature and claim IDs; establish evidence before introducing a new claim.
- Compose existing layouts and content blocks. The page registry owns related links and parents;
  URL helpers own internal destinations and launch links.
- Keep visible FAQ answers and their JSON-LD identical. The content schemas own structural limits.
- Use computed worked examples. Localise names and appropriate currencies while preserving people,
  payers, split methods and payment count. Mark example exchange rates as illustrative; preserve
  currencies when conversion is the point of the example.
- Retain real qualifications and limits in the copy. Do not hide them in jokes or imagery.

## Shot list

`src/data/screenshots.ts` is the canonical inventory of S01–S21, including screen state,
localisation, viewport, dimensions and capture status. Page content owns translated alt text.
The inventory covers dashboard and group setup, invitations, expense entry and conversion,
receipt scanning, balances and payment history, permissions, lists, polls, questioned expenses,
notifications, installation and an Arabic mobile group page.

The clip specifications remain:

| ID | Demonstration | Duration | Placement |
|---|---|---|---|
| C1 | Upload a fictional receipt and show fields filling in for checking. | 6–8 seconds | Group trips and receipt scanning |
| C2 | Enter a yen amount, choose pounds and show the rate and converted amount. | About 5 seconds | Multiple currencies |
| C3 | Record a payment in one window and show the other window's balance update. | About 6 seconds | How it works and settle up |

The app repository owns capture tooling and demo seeding. Reuse its current stack, API driver
and page objects after checking their implementation; the old plan's commands and configuration
names are historical evidence. Seed fixed fictional scenarios matching the page examples, with
translated names, descriptions and appropriate home currencies. Conversion demonstrations need
two different currencies. Record the app release, locale, viewport and seed version with captures.

Manual English captures may use `placeholder-en`; localised pages must not fall back to those
images. Scripted localised captures require the correct language. S21 is intentionally the Arabic
RTL example shared across locales. Review RTL and long-string captures by eye. Keep all necessary
facts in HTML as well as imagery; alt text explains what the image proves.

The homepage remains an illustrated story using its fixed example-group amounts and currencies.
Product screenshots belong to feature, use-case and how-it-works pages.

| Asset | Format and size | Budget |
|---|---|---|
| Desktop still | AVIF with WebP fallback; 1440×900 CSS pixels captured at 2×, served at 480/960/1440px widths | 150 KB largest AVIF |
| Mobile still | AVIF with WebP fallback; 390×844 CSS pixels captured at 2×, served at 390/780px widths | 90 KB |
| Clip | WebM with MP4 fallback; muted, inline; 960px desktop or 390px mobile, 24fps | 1 MB, eight seconds maximum |
| Clip poster | AVIF at the clip's dimensions | 60 KB |
| Social card | PNG, 1200×630, language-neutral artwork with localised wordmark | 200 KB |

Set image dimensions explicitly and lazy-load images below the first view. Reduced-motion
visitors get a poster and play control rather than autoplaying clips. Use CSS framing for captures.

## Voice and editorial rules

Write like a capable friend who has survived a disastrous group-holiday spreadsheet: specific
situations, short dry asides and restrained badger references. Keep actions plain. Translate
intent and humour rather than word order.

Never hide qualifications inside jokes, mock people who owe money or have less money, or invent
testimonials, ratings, user counts or press mentions. Competitors belong on the dated comparison
page. Explain what the person gets; keep internal providers, regions and processing details out
of public copy.

## Measurement and review

Review search and conversion at four, eight and twelve weeks after a release when access and
data exist. Track indexed versus submitted pages, non-branded impressions and clicks by landing
page, query hypotheses, crawl/translation errors, and pages with poor click-through or few launches.
Compare launch-counter totals by page and position with aggregate tenant sign-up counts; do not
treat that comparison as individual attribution or proof of causation.

Use lab performance checks and available field data for page speed and Core Web Vitals. The goal
is an informed visitor who reaches the app, rather than traffic alone.
