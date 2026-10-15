# Side Badger marketing site expansion plan

This document is the design reference for the marketing site restructure. It holds the review findings, the product evidence, the decisions taken, the feature registry, the page briefs and the editorial rules. The sequenced work, checklists, translation gate and acceptance criteria are in [the restructure task](./restructure-marketing-site.md). The homepage rebuild is in [the homepage scroll experience task](./homepage-scroll-experience.md).

## Status and evidence base

Settled plan, updated 14 October 2026. Every decision is recorded in [Decisions](#decisions) with its evidence, the alternatives considered, and what would reopen it. Decision numbers here are this plan's own; the other task files cite them as “site plan Dn”, and this file cites the restructure task's as “restructure Dn”. “Release 1” (the first release) and “release 2” are content releases; the execution waves W0 to W4 are in [the restructure task](./restructure-marketing-site.md#agent-execution-plan).

- **App evidence:** the app repository (local clone `wl-bill-splitter_1`) at commit `d2911d837`, 14 October 2026. App paths in this document are relative to that repository's root, for example `webapp-v2/src/pages/DashboardPage.tsx`.
- **Marketing site evidence:** this repository at commit `bc01126`. Paths in this repository are marked "(site)", for example (site) `src/i18n/en.ts`.
- **Exchange-rate service evidence:** the separate `f-eggs` repository at commit `25010fc`, marked "(f-eggs)".
- **Market evidence:** competitor pages and search results read on 14 October 2026. No keyword tool data is available, so every query listed here is a hypothesis to validate in Search Console.

Confidence labels used throughout:

- **High:** read in code and covered by an end-to-end test or a recorded production check.
- **Medium:** read in code, with only mocked browser tests or no tests found.
- **Low:** inferred from code structure or documents, not traced end to end.

## Goal

Turn the current marketing site into a focused static product site that:

- explains the app's breadth without becoming a feature directory;
- creates useful landing pages for distinct search intent;
- moves visitors from a relevant problem to launching the app;
- retains Side Badger's dry, slightly chaotic voice;
- supports localization without publishing thin or duplicate pages.

## Product facts that change the plan

These facts come from the app repository and override assumptions in earlier drafts.

- **The app is no longer a Firebase app.** It runs as Postgres 18, an Express API, a graphile-worker process and nginx under Docker Compose on the shared Snowmonkey host. Firebase is used only for sign-in. Google Vertex AI (Gemini) reads receipts, Google Secret Manager holds secrets, and backups go to a Google Cloud Storage bucket (`docs/postgres-docker-architecture.md`, `docs/deployment.md` section 1, `docs/guides/runtime-and-local-stacks.md`). The other task files describe the app this way; none calls it a Firebase application.
- **Production exists.** `https://app.sidebadger.me` was first installed on 14 October 2026 and is the only tenant host in production (`docs/deployment.md` section 1). Receipt scanning was verified there the same day (`tasks/verify-receipt-scanning-production.md`).
- **The site sent visitors to a rehearsal environment.** At `bc01126` every launch link pointed at `staging.sidebadger.me` ((site) `src/i18n/index.ts`, `appOrigin`). Staging is the agreed environment for disruptive upgrade, rollback and restore rehearsals (`tasks/verify-schema-upgrade-and-rollback.md`, "Agreed Rehearsal Environment"). Commit `2f9b773` moved the links and the policy API to production. See [D1](#d1-launch-links-go-to-production).
- **Web only.** There is no native app and no plan for one. The app serves a web app manifest and Settings explains how to add it to a home screen or dock (`server/src/manifest/ManifestHandlers.ts`, `webapp-v2/src/components/settings/InstallAppSection.tsx`). There is no service worker, so there is no offline use and no push notification.
- **Everyone needs an account.** Sign-up is email and password only. Viewing a group, even from an invite link, requires signing in (`webapp-v2/src/App.tsx`, protected routes). Nothing can be added until the email address is verified (`server/src/auth/middleware.ts:159`). Users must be 18 or over (`config/policies/terms-and-conditions.md` section 2).
- **No money moves.** Settlements are records of payments made elsewhere (`config/policies/terms-and-conditions.md` section 3.5).
- **Notifications are in-app only.** Live updates arrive over server-sent events; the only emails are welcome, verification, password reset and email change (`server/src/services/email/EmailTemplateService.ts`).
- **39 languages.** The app ships the same 39 locales as this site, including right-to-left Arabic, Persian and Urdu, and honours `?lang=` (`webapp-v2/src/locales/`, `webapp-v2/src/utils/languageDetection.ts`).
- **Side Badger is one tenant of a white-label platform** called The Expense Hub (`README.md`, `config/tenants/sidebadger/config.json`). Tenants differ in branding only; no product feature is switched per tenant (`packages/shared/src/types/branding.ts`).
- **The legal policies are global, and they constrain marketing claims.** The privacy, cookie and terms text shown on this site's `/privacy/`, `/cookies/` and `/terms/` pages comes from `config/policies/*.md` in the app repository and is the same for every tenant. It reserves promotional use of account data, affiliate offers and partner data sharing, and says group data is owned by the platform. See the [current-claims audit](#current-claims-audit) and [D3](#d3-trust-claims-match-the-policies).
- **One amount cap for every currency.** An expense or payment cannot exceed 999,999.99 in its own currency (`packages/shared/src/constants.ts`, `MAX_ALLOWED_AMOUNT`; `packages/shared/src/schemas/apiRequests.ts:102`). That is roughly £5,000 in yen and under £50 in Indonesian rupiah, which matters for the `id` and `ko` locales. See [D19](#d19-the-amount-cap-is-disclosed).

## Decisions

Each decision is final for this plan. Implementation agents apply them without asking again.

### D1. Launch links go to production

- **Decision:** every launch link points to `https://app.sidebadger.me`, through the launch counter in [D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter). The page body's primary call to action, "Create a free account", opens `/register`. The header's "Open the app" opens `/dashboard`, which sends signed-out visitors to sign in and then back. Non-English pages add `?lang=<locale>`. Commit `2f9b773` already points the site at production; the counter ships with the restructure task's technical repairs (step 2: P11, P12, P14), without waiting for the content release.
- **Evidence:** production was installed on 14 October 2026 with `app.sidebadger.me` as its only tenant host (`docs/deployment.md` section 1). Receipt upload and analysis were verified in-app there (`tasks/verify-receipt-scanning-production.md`). Staging is the agreed rehearsal environment for disruptive drills (`tasks/verify-schema-upgrade-and-rollback.md`). Protected routes redirect with a return URL (`webapp-v2/src/App.tsx`), and `?lang=` overrides stored language (`webapp-v2/src/utils/languageDetection.ts`).
- **Alternatives considered:** keep staging until the production drills in `tasks/verify-production-network-and-monitoring.md` pass. Rejected, because a rehearsal can wipe staging data, which is worse for a real user than an unrehearsed production. Use `demo.sidebadger.me`. Rejected, because no environment or DNS serves it.
- **Reopen if:** production is withdrawn or declared closed to the public.

### D2. The pricing promise is "Free. No ads. No daily limits."

- **Decision:** drop "free forever", "100% free and unlimited", "free until it isn't", the Pro plan card and the "all rights reserved (but not really)" joke. Say "Free. No ads. No daily limits." Publish the real limits as a table on the pricing page. Answer "Will it always be free?" with the terms' own commitment: everything is free today, and any change to that comes with notice first. Full reasoning is in [Pricing and promise](#pricing-and-promise).
- **Evidence:** there is no billing, plan or subscription code (searched for Stripe, subscription, premium, paywall, plan and checkout across server, migrations, shared, webapp and config). The terms say "The Service is currently provided free of charge" and reserve the right to introduce fees "with reasonable notice" (`config/policies/terms-and-conditions.md` section 1). There is no expense-count limit and no receipt-scan quota; the only caps are size and count limits in `packages/shared/src/constants.ts` and a per-account rate limit of 1,000 changes a minute (`server/.env.instanceproduction`, `__RATE_LIMIT_ACTIONS_PER_MINUTE`).
- **Alternatives considered:** "Everything you can do today stays free" is a stronger promise, but it needs the terms amended in the app repository first. Adopt it the day that amendment lands. "Free forever" was rejected because it contradicts terms section 1. "Free during early access" was rejected because no early-access programme exists and the phrase implies a coming charge.
- **Reopen if:** the terms change, a paid tier is built, or receipt-scanning costs force a quota.

### D3. Trust claims match the policies

- **Decision:** the site may say "No ads", "No third-party analytics or ad trackers", "Only the cookies needed to keep you signed in", "We don't sell your personal data" and "Only members of a group can see it". It must not say "zero tracking", "no tracking", "privacy first", "your data stays yours", "we only collect what's needed", "no 'we may share with partners'" or "no catch".
- **Evidence:** the app has no analytics or ad code, and its content security policy allows scripts only from itself and Cloudflare Turnstile (`server/src/csp.ts`). Cookies are the session and remember-me cookies only (`server/src/auth/session-cookie.ts`). The privacy policy says "We do not sell your personal data" (`config/policies/privacy-policy.md`, summary and section 4). The same policy also reserves promotional targeting, affiliate recommendations and sharing with affiliate partners (sections 2.2, 3 and 4.7). The terms say group data "is owned by us, not by any individual user" (section 6.1) and allow sponsored offers (section 1.1).
- **Alternatives considered:** keep the stronger claims and have the policies cut back to match. That is the better end state for the brand, but the policies live in the app repository and are shared by every tenant. Until they change, the stronger claims are contradicted by documents this site itself publishes at `/privacy/` and `/terms/`.
- **Reopen if:** the policies drop the promotional and affiliate clauses (then "no partner sharing" can return), or affiliate offers ship (then "No ads" must go the same day).

### D4. White label stays off the public Side Badger site

- **Decision:** no page, navigation item or footer line offers white-label hosting. Full reasoning is in [White label](#white-label).
- **Reopen if:** the owner wants Side Badger to generate business leads for The Expense Hub.

### D5. Measurement uses Search Console and a first-party launch counter

- **Decision:** use Search Console for search data, and a first-party redirect on this site's nginx for launch clicks. Compare launch clicks with daily sign-up totals from the app database. Add no analytics script, cookie, pixel or real-user monitoring. Self-host the fonts and flag images that the site currently loads from Google Fonts and jsDelivr. Full design is in [Measurement](#measurement).
- **Evidence:** the site makes no measurement today. It does load `fonts.googleapis.com` ((site) `src/styles/global.css:6`) and flag images from `cdn.jsdelivr.net` ((site) `src/i18n/index.ts`), which hand every visitor's address to third parties. Current copy promises "No analytics" ((site) `src/i18n/en.ts`, `whyFree.trackers.desc`).
- **Alternatives considered:** self-hosted cookieless analytics such as Plausible or Umami. That gives richer data but breaks the "no analytics" promise and needs policy updates. Rejected for now.
- **Reopen if:** launch-counter data proves too coarse to choose between page variants.

### D6. Primary audience and market

- **Decision:** the primary audience is adults (18+) who organise shared costs in small groups of 2 to 50 people. In priority order: group trips, shared households, events and gifts, couples. English-language search comes first, with UK vocabulary as the default and US terms ("roommates", "vacation") used where they are the reader's word. The other 38 locales get full translations under the translation gate, made once, after the English site is complete (restructure D38), but no locale-specific keyword research until Search Console shows demand.
- **Evidence:** the product's own examples centre on trips and shared homes. The create-group placeholder is "e.g., Apartment Expenses, Trip to Paris" (`webapp-v2/src/locales/en/translation.json`, `createGroupModal.groupNamePlaceholder`). The suggested labels lead with food, travel and housing (`expenseBasicFields.suggestedLabels`). The demo data generator's groups are beach house, birthday party, concert tickets, dinner club, game night, lunch crew, road trip, roommates, ski trip and weekend trip (`scripts/dev/test-data-generator.ts`). UK-first is inferred: the app footer names "Pomo Corp ltd.", the receipt fixtures are in GBP, and the owner's documents use UK English.
- **Reopen if:** Search Console shows most impressions coming from another market or language at the 8-week review.

### D7. Page set and release order

- **Decision:** the first release is the homepage, `/how-it-works/`, `/features/`, `/features/split-expenses/`, `/features/settle-up/`, `/features/multiple-currencies/`, `/use-cases/`, `/use-cases/group-trips/`, `/use-cases/housemates/`, `/use-cases/events-and-celebrations/` and `/pricing/`. Wave 2 is `/features/receipt-scanning/`, `/features/groups-and-permissions/`, `/features/lists-and-polls/`, `/use-cases/couples/` and `/compare/splitwise/`. Dropped: `/use-cases/clubs-teams-and-work/` and `/about/`. Reasoning per page is in [Recommended site structure](#recommended-site-structure).
- **Reopen if:** 8-week Search Console data shows demand for a dropped page that the product can genuinely serve.

### D8. Feature clusters

- **Decision:** add `/features/settle-up/`. The earlier plan had no balances or settlement page, although that is the product's core and the homepage's centrepiece. Rename `receipts-and-scanning` to `receipt-scanning` and `lists-polls-and-comments` to `lists-and-polls`. Comments, reactions and expense questions become supporting sections on the pages they serve. `groups-and-permissions` absorbs invites and locking.
- **Reopen if:** a release-2 page underperforms because its topic is too broad, in which case split it.

### D9. Use cases

- **Decision:** rename `holidays-and-group-travel` to `group-trips`, `parties-weddings-and-gifts` to `events-and-celebrations` and `couples-and-families` to `couples`. Stag and hen weekends are a section of group trips. Drop clubs, teams and work. Drop school-trip and school-club examples everywhere.
- **Evidence:** the clubs and teams results are dominated by payment-collection tools that take money and send reminders, such as Spond, SportMember and Collctiv. Side Badger does neither. The terms grant a licence for "personal, non-commercial purposes" (`config/policies/terms-and-conditions.md` section 8.2), which rules out office reimbursements and offsites, and require users to be 18 or over (section 2), which rules out school pupils. Families with children are dropped for the same age reason; adult family members are covered on the couples and housemates pages.
- **Reopen if:** the app gains payment requests (`tasks/deferred/payment-requests.md`) and the terms allow organisational use.

### D10. Receipt scanning is shown, disclosed, and gets its own page later

- **Decision:** the homepage, how-it-works and feature pages may show receipt scanning as available, worded as "fills in the details for you to check". Every page that mentions it says plainly that the receipt image is read by Google's AI service. The dedicated page waits for release 2, gated on the extraction-quality evidence still open in `tasks/verify-receipt-scanning-production.md`. No accuracy claim is made anywhere until then. Receipt attachments (photos or PDFs, up to three per expense) are not gated: attaching involves no extraction, so they ship in release 1 on the split-expenses page (decided 2026-10-15).
- **Evidence:** production verification passed on 14 October 2026 (direct Vertex check, in-app upload, 3/3 smoke runs). Extraction quality across currencies, languages and poor photos is unrecorded, and heavy blur has already caused a misread year. Images are processed by Vertex AI Gemini in the US multi-region (`server/src/services/ai/VertexAIGeminiClient.ts`, `server/.env.instanceproduction`). The privacy policy does not name this processor.
- **Reopen if:** the verification task records extraction-quality evidence, at which point the page ships. If quality is poor, the feature moves to "beta" in the registry.

### D11. Lists and polls are framed around shared spending

- **Decision:** examples for lists, polls and comments stay on money-related planning, such as the shared shopping list, choosing the villa or agreeing the gift budget. Never use to-do lists, project checklists or "where should we eat?" for its own sake.
- **Evidence:** the terms say "Comments, messages, and uploads must be directly related to group finances" and that "Any non-financial communication is strictly prohibited" (`config/policies/terms-and-conditions.md` section 7.1). Privacy policy section 2.1 repeats it.
- **Reopen if:** the terms are amended to allow general group planning. That amendment is listed in [Follow-ups outside this repository](#follow-ups-outside-this-repository).

### D12. No roadmap on the public site

- **Decision:** remove the "Coming soon" section (export, native apps) and the Pro card. Describe what exists today. The features index gets a plain "What Side Badger doesn't do" list instead.
- **Evidence:** native apps have no code and no task anywhere. Export is deferred with no date (`tasks/deferred/data-export.md`). Pro has no code and no task.
- **Reopen if:** a feature reaches staging with a committed release date.

### D13. "Little things that matter" is retired

- **Decision:** remove the section. Re-home its facts as customer outcomes: map-link parsing on split expenses, leave and lock rules on groups and permissions, reactions on settle up, feedback in the pricing FAQ, and accessibility and languages on how it works. Drop the implementation details: return URLs, focus traps, pagination, toasts and modal history.

### D14. Product imagery comes from scripted captures

- **Decision:** real screenshots and short clips are produced by a capture script in the app repository. It seeds a fixed, fictional Side Badger scenario on a local stack and captures every shot in all 39 locales at desktop and mobile sizes. Manual captures are allowed only as English placeholders and are listed as such. Full plan is in [Product imagery plan](#product-imagery-plan).
- **Evidence:** no screenshot tooling exists; the only captures are failure screenshots and ad hoc images with test-stack banners and default-tenant branding (`e2e-tests/playwright.config.ts`, `tmp/*.png`). The building blocks do exist: `ApiDriver`, page objects and host-based tenant selection (`packages/test-support/src/ApiDriver.ts`, `server/src/services/tenant/TenantRegistryService.ts`).
- **Reopen if:** the capture script cannot be agreed in the app repository, whose rules forbid new patterns until agreed (`AGENTS.md`). Then capture English manually from a dedicated production demo account and keep localized pages free of screenshots that would show the wrong language.

### D15. Debt and settlement wording

- **Decision:** say "fewer payments" or "a short list of payments", never "the fewest possible" or "minimise". Say "record a payment", never "pay" or "settle with one tap". Say "a current exchange rate", never "real-time" or "mid-market".
- **Evidence:** the simplifier is a greedy match per currency, which settles everyone in at most one payment fewer than the number of people with a balance, but does not guarantee the true minimum (`server/src/utils/debtSimplifier.ts`). Settlements are records only (terms section 3.5). Rates come from the owner's f-eggs service, which polls the 1Forge market-data API on a schedule ((f-eggs) `server/src/services/one-forge-client.ts`, `docker-compose.prod.yml`), and freeze when saved.

### D16. One comparison page, in release 2

- **Decision:** publish `/compare/splitwise/` in release 2. Competitor facts come only from the competitor's own pages, carry an "as of" date and are rechecked every quarter. No logos and no unpublished figures, such as Splitwise's daily expense cap, which Splitwise does not publish.
- **Evidence:** Splitwise's own Pro page sells unlimited daily expenses, ad-free use, currency conversion and receipt scanning (https://www.splitwise.com/pro). All four are free in Side Badger. Third-party roundups rank "Splitwise alternative" pages for exactly this gap. Tricount already runs one (https://www.tricount.com/).
- **Reopen if:** Splitwise changes its free tier, or the page cannot be kept accurate quarterly.

### D17. English vocabulary

- **Decision:** keep one English source with the site's existing spelling. Name the reader's own word on each page: housemates, flatmates and roommates on the housemates page; holiday, vacation and trip on the group-trips page. Slugs use the most international term.

### D18. Use the brand name for copyright

- **Decision:** the footer reads "© {year} Side Badger", matching the tenant's legal name (`config/tenants/sidebadger/config.json`, `legal.companyName`).

### D19. The amount cap is disclosed

- **Decision:** the pricing limits table, the multiple-currencies page and the group-trips page state the 999,999.99 cap per expense, in the expense's currency. Localized pages for currencies with large unit values (`id`, `ko`, `ja`) use examples under the cap and suggest entering large costs in another currency and converting. A currency-aware cap is listed in [Follow-ups outside this repository](#follow-ups-outside-this-repository).
- **Evidence:** `packages/shared/src/schemas/apiRequests.ts:102` applies one cap to every currency.

### Defaults where the answer cannot be known yet

| Unknown | Why it cannot be known now | Default the build uses |
|---|---|---|
| Real search demand and phrasing | No Search Console history or keyword data | Build on the query hypotheses in each brief; review at 4, 8 and 12 weeks |
| Launch and sign-up conversion | Nothing is measured today | Ship the [D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter) counter with the first release; no conversion targets until 4 weeks of data exist |
| Receipt extraction quality | Evidence task still open | [D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later): no accuracy claims; dedicated page gated |
| Testimonials and customer evidence | None exist in either repository | Publish no testimonials, ratings, user counts or press quotes until real, consented ones exist |
| Production exchange-rate refresh interval | Production overrides of the f-eggs schedule are not readable here | Claim "a current exchange rate" only, never an interval |

## Current-site review

Reviewed from the Astro source, a production build, and the public homepage on 5 October 2026. Extended on 14 October 2026 with the app evidence above.

### What exists

The public site is larger than a single HTML page at build time, but the product marketing experience is effectively one homepage plus pricing. Privacy, terms, and cookie pages are also generated. Localization expands those five route types to 231 HTML files.

The homepage contains roughly 1,077 visible words and already mentions many product capabilities. Most of those capabilities have no dedicated URL, so search engines and visitors cannot enter through a page that fully answers one need.

### Strong foundations

- Astro produces crawlable static HTML.
- The homepage has one clear `h1` and a sensible heading hierarchy.
- Page titles and descriptions exist and are localized.
- A sitemap and `robots.txt` are generated.
- Core locale pages have `hreflang` links and an `x-default`.
- The homepage copy covers real use cases and differentiators.
- Pricing includes a visible FAQ and clear calls to action.
- Translation keys are complete across every core locale (`npm run i18n audit` passes).
- The brand voice is distinctive. Lines such as "No drama" and "Just vibes and badgers" are memorable.
- The site's 39 locales match the app's 39 locales exactly, so every localized page can launch the app in the same language.

### Main problems to solve

#### 1. Product content has no useful information architecture

The header only offers the language switcher and app launch button. The footer only links to pricing and legal pages. Features, use cases, and the explanation of how the app works are sections inside the homepage rather than navigable destinations.

The filterable use-case cards make the homepage easier to scan, but they do not create focused landing pages. The same issue applies to high-value capabilities such as multi-currency splitting, receipt scanning, settlements, lists, polls, and permissions.

#### 2. Some copy describes implementation details rather than customer value

The "Little Things" section includes return URLs, focus traps, modal history, pagination, and optimistic behaviour. These are useful product qualities, but the current wording reads like release notes. [D13](#d13-little-things-that-matter-is-retired) retires the section.

There is also a promise conflict between "free forever" and the disclaimer "It's free until it isn't." The joke weakens a core commercial claim. [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) resolves it.

#### 3. Important technical SEO elements are missing or incomplete

- No page emits a canonical URL.
- `og:url` is absent.
- Open Graph and Twitter image paths are relative rather than absolute.
- Homepage `SoftwareApplication` schema and pricing `FAQPage` schema are passed into a named head slot that `BaseLayout.astro` does not render. The built pages contain only the global Organization and WebSite schema.
- `og:locale` is explicitly mapped for only five languages and falls back to `en_US` for the rest.
- Regional aliases such as `/en-gb/`, `/en-us/`, and `/nl-NL/` are placed in the sitemap, but are omitted from the page's `hreflang` set. They duplicate the target locale's copy.
- Legal policy content is fetched in the browser. A crawler initially receives a loading message rather than the policy text.
- URL generation mixes slash and non-slash forms. One consistent canonical form should be enforced.

#### 4. The homepage carries too much of the product story

The homepage is about 75 KB of HTML before assets. It tries to cover audience, use cases, features, workflow, product polish, roadmap, pricing philosophy, and conversion. This dilutes the primary story and makes navigation harder.

The site also ships a 148 KB uncompressed visual-effect JavaScript chunk. That is not automatically a performance problem, but Core Web Vitals should be measured on production before adding more visual work. Large source logo files should not be used directly for social previews or page imagery without optimized derivatives.

#### 5. The site lacks product proof

There are no product screenshots, short demonstrations, worked examples, testimonials, or concrete scenarios showing how a group gets from expense to settlement. Claims such as "balances you can trust" need visible supporting evidence. The [product imagery plan](#product-imagery-plan) and the worked example in each brief address this.

#### 6. Several current claims are unsupported or contradicted

The audit covers 69 claims on the current site. 28 are supported, 19 are true only with qualification, 18 conflict with the app or its published policies, and 4 describe things the app does not do. The biggest problems are "free forever", "zero tracking", "your expense data stays yours", "no catch", "Pro coming soon" and native mobile apps. See the [current-claims audit](#current-claims-audit).

#### 7. Launch links went to a rehearsal environment

At `bc01126` every call to action opened `staging.sidebadger.me`, which can be reset by rehearsals. Commit `2f9b773` moved them to production, and [D1](#d1-launch-links-go-to-production) routes them through the launch counter.

#### 8. The site leaks visitor addresses to third parties

Google Fonts and jsDelivr receive a request from every visitor, which sits badly with the site's privacy claims and adds connection setup to every page. [D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter) self-hosts both.

## Product feature registry

This is the registry that the typed content registry in step 3 of [the restructure task](./restructure-marketing-site.md) is transcribed from (`src/data/features.ts`, restructure D16; package P22). Page copy may use only the approved claims. Statuses:

- **available:** works in production today.
- **beta:** works but is labelled as unfinished in the app. No feature is beta today.
- **planned:** has a task in the app repository but no shipped code.
- **retired:** removed from the app. None today.
- **tenant-dependent:** differs between tenants. None today; tenant configuration changes branding only (`packages/shared/src/types/branding.ts`). The only per-group switch is expense questions (`GroupFeatures` in `packages/shared/src/shared-types.ts`).

Shot IDs (S01 to S21) and clip IDs (C1 to C3) refer to the [product imagery plan](#product-imagery-plan).

Transcription notes for P22, so it never has to ask:

- **Page ids:** the "Home page" column maps to page ids `feature/<slug>`, `how-it-works` and `pricing`. "Pricing FAQ" is `pricing`; where two pages are listed, the first is `homePage`; "none" is `null`.
- **Statuses:** "available (per-group opt-in)" is `available`. Rows in [What Side Badger does not do](#what-side-badger-does-not-do) are recorded with status `planned` where that table says planned, otherwise `not-offered`, and never get a page.
- **Claim ids:** each approved claim gets the id `<feature id>.<short kebab-case summary>`, for example `balances.short-list-of-payments`, in the order listed.
- **Release:** a feature's release is that of its home page in [D7](#d7-page-set-and-release-order); `receipt-scanning` and `receipt-attachments` carry the gate "receipt quality evidence" ([D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)).
- **Audiences:** the audience words become ids: `organisers`, `everyone`, `group-trips`, `housemates`, `events`, `couples`.

### Registry summary

| ID | Capability | Status | Confidence | Home page |
|---|---|---|---|---|
| `groups` | Groups for each house, trip or event | available | high | groups-and-permissions |
| `invites` | Invite links with expiry, QR codes, in-app invites | available | high | groups-and-permissions |
| `permissions` | Roles, presets, custom permissions, approval, locking | available | high | groups-and-permissions |
| `expense-splitting` | Equal, exact and percentage splits with details | available | high | split-expenses |
| `expense-questions` | Raise a question; expense held out of balances | available (per-group opt-in) | high | split-expenses |
| `balances` | Per-currency balances and simplified debts | available | high | settle-up |
| `settlements` | Record payments, quick settle, history | available | high | settle-up |
| `multi-currency` | 140 currencies, per-currency balances, group rules | available | high | multiple-currencies |
| `currency-conversion` | Convert at a current rate; editable; auto-convert | available | high (mechanics), medium (rate source) | multiple-currencies |
| `receipt-attachments` | Attach up to three receipts per expense | available | medium | receipt-scanning |
| `receipt-scanning` | AI fills in an expense from a receipt photo | available | high (works), low (accuracy) | receipt-scanning |
| `comments` | Comments with attachments on groups, expenses, lists, polls | available | high | split-expenses, lists-and-polls |
| `reactions` | Six emoji reactions on expenses, payments and comments | available | medium | settle-up |
| `lists` | Shared checklists inside a group | available | high | lists-and-polls |
| `polls` | Group polls with anonymous and multi-choice options | available | high | lists-and-polls |
| `live-updates` | Live changes, activity feed, notifications bell | available | high | how-it-works |
| `dashboard` | All groups, balances per currency, quick actions | available | high | how-it-works |
| `direct-links` | Links straight to a group or expense | available | medium | none (supporting detail) |
| `languages` | 39 languages, right-to-left support | available | high | how-it-works |
| `home-screen` | Add the web app to a home screen or dock | available | medium | how-it-works |
| `accounts` | Email sign-up, verification, bot protection | available | high | how-it-works |
| `feedback` | In-app feedback and help with replies | available | medium | pricing FAQ |
| `privacy-posture` | No ads, no third-party trackers, essential cookies only | available | high (code), constrained by policy | pricing |
| `accessibility` | Keyboard, screen-reader and colour-independent cues | available | medium | how-it-works |

### Feature records

#### `groups`: groups for each house, trip or event

- **Capability:** create a group with a name, optional description, your own display name in that group, an optional header image and a per-group photo. Hide it from your dashboard by archiving it, and close it permanently when it's done.
- **Problem solved:** costs from different parts of life get mixed up in one spreadsheet or chat.
- **Audiences:** primary, organisers; secondary, every member.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/core-features.e2e.test.ts`).
- **Limits and prerequisites:**
  - Group name 2 to 100 characters; description up to 500.
  - Display name 2 to 50 characters, unique within the group.
  - Header image JPEG, PNG, GIF or WebP up to 10 MB.
  - Up to 50 members per group; no limit on number of groups was found.
  - Archiving is per person and only hides the group from that person's dashboard.
  - Closing is admin-only, needs the group name typed to confirm, and makes the group inaccessible to everyone.
  - You cannot leave while you owe or are owed money in any currency, while an open question involves you, or if you are the last admin or only member.
- **Evidence:** `webapp-v2/src/components/dashboard/CreateGroupModal.tsx`, `webapp-v2/src/components/group/GroupSettingsModal.tsx`, `server/src/services/GroupService.ts`, `server/src/services/GroupMemberService.ts`, `packages/shared/src/constants.ts` (`MAX_GROUP_MEMBERS`).
- **Proof:** S01, S02.
- **Related:** `invites`, `permissions`; every use case.
- **Search language to validate:** "shared expenses group", "create a group to split costs".
- **Approved claims:** "Make a group for each house, trip or event." "Choose the name people see in each group." "Up to 50 people in a group." "Nobody can leave a group while they still owe or are owed money."
- **Not approved:** "unlimited groups" (no limit was found, but nothing proves it at scale; say "no set limit" only on the pricing page).

#### `invites`: invite links, QR codes and in-app invites

- **Capability:** share a join link or QR code that expires after 15 minutes, 1 hour, 1 day or 5 days. Or invite people you already share another group with, from inside the app. People see a preview of the group before joining.
- **Problem solved:** getting everyone into the group without collecting phone numbers or email addresses.
- **Audiences:** primary, organisers.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/user-and-access.e2e.test.ts`).
- **Limits and prerequisites:**
  - The person joining needs an account and must verify their email before adding anything.
  - When the group requires approval, joiners wait for an admin.
  - Who may invite depends on the group's permissions.
  - In-app invites list people from your 10 most recent active groups.
  - No invitation emails are sent.
  - Generating a new link does not cancel older links; they last until they expire.
- **Evidence:** `webapp-v2/src/components/group/InviteModal.tsx`, `webapp-v2/src/components/group/ViaLinkContent.tsx`, `webapp-v2/src/components/group/SelectPhase.tsx`, `server/src/services/GroupShareService.ts`, `server/src/services/InvitationService.ts`, `webapp-v2/src/pages/JoinGroupPage.tsx`.
- **Proof:** S03, S04.
- **Related:** `groups`, `permissions`, `accounts`; events and celebrations, group trips.
- **Search language to validate:** "invite friends to split expenses", "QR code group expenses".
- **Approved claims:** "Invite people with a link or a QR code." "Links can expire in as little as 15 minutes or last up to 5 days." "Turn on approval and an admin lets each person in."
- **Not approved:** "join instantly", "no sign-up needed", "invite by email or text".

#### `permissions`: roles, presets and locking

- **Capability:** each member is an admin, a member or a viewer, who can see everything and change nothing. Pick the "Open collaboration" or "Managed group" preset, or set seven permissions individually: who can edit expenses, delete expenses, edit lists, invite, approve new members, change settings and change the header image. Admins can lock a group so nothing changes until it is unlocked.
- **Problem solved:** in bigger or more formal groups, one person needs to keep the numbers tidy.
- **Audiences:** primary, organisers of events and larger groups; secondary, housemates.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/core-features.e2e.test.ts`, `e2e-tests/src/__tests__/integration/locking.e2e.test.ts`).
- **Limits and prerequisites:**
  - New groups start on Open collaboration.
  - Only admins can change permissions and roles, and the last admin cannot be demoted.
  - "Managed group" sets expense editing, expense deletion and list editing to creators and admins; inviting, settings and header image to admins; and new members to admin approval.
  - Setting expense editing to "Admins only" also means only admins can add expenses.
  - A locked group refuses every permission-controlled change.
  - Every permission or role change appears in the activity feed.
  - Low-confidence finding: ordinary members of an Open group can open the Security tab, but the server rejects their changes (see [follow-ups](#follow-ups-outside-this-repository)).
- **Evidence:** `packages/shared/src/shared-types.ts` (`GroupPermissions`, `SecurityPresets`, `ViewerBlockedActions`), `server/src/permissions/permission-engine.ts`, `server/src/permissions/permission-engine-async.ts`, `webapp-v2/src/components/group/settings/security/`.
- **Proof:** S13, S14, S15.
- **Related:** `groups`, `invites`; events and celebrations, housemates.
- **Search language to validate:** "expense group admin permissions", "read-only member shared expenses", "approve members group expenses".
- **Approved claims:** "Make someone a viewer: they see everything and change nothing." "In a managed group, admins approve new members and only creators and admins can change expenses." "Lock the group when it's over so the numbers stay put."
- **Not approved:** "anyone can manage permissions", any claim that viewers can add expenses.

#### `expense-splitting`: add and split expenses

- **Capability:** record who paid and split the cost between everyone or only the people involved, equally, by exact amounts or by percentage. Add a date and optional time, up to three labels, a place, notes and up to three attachments. Copy an expense to reuse it. Edit or delete it within the group's permissions.
- **Problem solved:** not every cost is shared equally, and the details get forgotten.
- **Audiences:** everyone.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/expense-and-balance-lifecycle.e2e.test.ts`).
- **Limits and prerequisites:**
  - One payer per expense. No split by shares and no split by receipt line.
  - Percentages must add up to 100.
  - In equal splits, a leftover cent goes to one person chosen at random (`calculateEqualSplits` in `packages/shared/src/split-utils.ts`).
  - Amounts up to 999,999.99, with each currency's own decimal places: none for yen, three for Bahraini or Kuwaiti dinar.
  - Description up to 200 characters; notes up to 5,000 with formatting; labels up to 3 of 50 characters each.
  - Dates cannot be in the future or more than 10 years ago. Shortcuts: today, yesterday, this morning, last night.
  - Pasting a link from Google Maps, Apple Maps, Waze, Bing Maps, OpenStreetMap, HERE, Baidu, Yandex, Kakao or Naver fills in the place name.
  - An edit keeps the earlier version.
  - Expenses involving someone who has left become read-only.
  - No recurring expenses; copy last month's instead.
- **Evidence:** `webapp-v2/src/components/expense-form/`, `server/src/services/ExpenseService.ts`, `packages/shared/src/split-utils.ts`, `packages/shared/src/constants.ts`, `webapp-v2/src/app/utils/google-maps-parser.ts`, `server/src/utils/UrlRedirectHandlers.ts`.
- **Proof:** S05, S06, S08; worked example on split expenses.
- **Related:** `balances`, `receipt-scanning`, `multi-currency`, `expense-questions`; every use case.
- **Search language to validate:** "split bill by percentage", "split bill unequally", "split costs exact amounts", "split expenses app".
- **Approved claims:** "Split equally, by exact amounts or by percentage." "Leave people out of the costs they weren't part of." "Copy last month's rent instead of typing it again." "Paste a map link and the place name fills itself in." "The odd penny goes to one person at random, not always the same one."
- **Not approved:** "split any way you like", "split by item", "split by shares", "several people paid", "recurring bills", "spending reports".

#### `expense-questions`: questions on expenses

- **Capability:** when a group turns it on, anyone included in an expense can mark it "I have a question" and explain why. The expense stays out of everyone's balances until the person who asked, or an admin, closes the question. The expenses list can show only questioned expenses.
- **Problem solved:** disputing an expense without an awkward message, and without the disputed amount counting meanwhile.
- **Audiences:** housemates, larger groups.
- **Status:** available, off by default; an admin turns it on per group. **Confidence:** high (`e2e-tests/src/__tests__/integration/expense-and-balance-lifecycle.e2e.test.ts`).
- **Limits and prerequisites:**
  - Only participants of the expense can raise a question.
  - Turning the feature off clears every open question.
  - An open question stops the people involved from leaving the group.
- **Evidence:** `server/src/services/ExpenseService.ts` (`openQuestion`, `closeQuestion`), `server/src/repositories/PostgresBalanceRepository.ts:20`, `webapp-v2/src/components/expense/QuestionExpenseModal.tsx`.
- **Proof:** S18.
- **Related:** `balances`, `comments`; housemates.
- **Search language to validate:** "dispute shared expense", "query a bill housemates".
- **Approved claims:** "Not sure about an expense? Raise a question, and it stays out of the balances until it's sorted."
- **Not approved:** "approve every expense before it counts" (only questioned ones are held).

#### `balances`: balances and simplified debts

- **Capability:** Side Badger keeps a running balance for each currency and turns the web of who-owes-whom into a short list of suggested payments, currency by currency.
- **Problem solved:** everyone owing everyone a bit, and too many bank transfers.
- **Audiences:** everyone.
- **Status:** available. **Confidence:** high.
- **Limits and prerequisites:**
  - Balances are separate per currency. Currencies are never netted against each other unless expenses were converted when entered.
  - The method settles everyone in at most one payment fewer than the number of people with a balance in that currency. It is not guaranteed to be the absolute minimum.
  - Simplification cannot be switched off.
  - The default view shows the debts that involve you; "Show all" shows the whole group.
  - Questioned expenses are left out.
- **Evidence:** `server/src/utils/debtSimplifier.ts`, `server/src/services/balance/balance-projection.ts`, `webapp-v2/src/components/group/BalanceSummary.tsx`, `webapp-v2/src/components/group/sections/BalancesSection.tsx`.
- **Proof:** S10; the six-into-two worked example on settle up.
- **Related:** `settlements`, `multi-currency`; every use case.
- **Search language to validate:** "simplify debts", "who owes who", "minimise payments group expenses".
- **Approved claims:** "See who owes whom at a glance." "Side Badger suggests a short list of payments that settles everyone." "In our housemates example, six payments become two."
- **Not approved:** "the fewest possible payments", "minimises", "one total across all your currencies".

#### `settlements`: record payments

- **Capability:** record a payment between two members. Quick-settle buttons fill in your suggested payments. Side Badger warns about paying too little or too much. Add a note such as "bank transfer", convert the payment into another currency, and see the history with reactions.
- **Problem solved:** knowing who has actually paid back.
- **Audiences:** everyone.
- **Status:** available. **Confidence:** high.
- **Limits and prerequisites:**
  - Records only: Side Badger never moves money and has no payment links or requests.
  - Dates cannot be in the future; notes up to 500 characters.
  - Recording needs expense-editing permission. Only the person who recorded it can edit it; they or an admin can delete it.
  - A payment involving someone who has left is locked.
- **Evidence:** `webapp-v2/src/components/settlements/`, `server/src/services/SettlementService.ts`, `config/policies/terms-and-conditions.md` section 3.5.
- **Proof:** S11, S12, C3.
- **Related:** `balances`, `currency-conversion`, `reactions`.
- **Search language to validate:** "settle up group expenses", "record payment shared expenses".
- **Approved claims:** "Pay each other however you like, then record it." "Quick-settle buttons fill in the amount." "Pay part of what you owe; the rest stays on the balance."
- **Not approved:** "pay in the app", "settle with one tap", "send payment requests", "reminders".

#### `multi-currency`: 140 currencies

- **Capability:** enter any expense or payment in any of 140 currencies. Balances are kept separately per currency. A group can restrict which currencies may be used and set a default. Your recently used currencies come first.
- **Problem solved:** trips and international groups pay in more than one currency.
- **Audiences:** primary, group trips; secondary, international households and couples.
- **Status:** available. **Confidence:** high (end-to-end tests cover yen, Bahraini dinar and Kuwaiti dinar).
- **Limits and prerequisites:**
  - 140 ISO currencies; no cryptocurrencies or metals.
  - Each currency's decimal places are respected.
  - The 999,999.99 cap applies in each currency ([D19](#d19-the-amount-cap-is-disclosed)).
- **Evidence:** `packages/shared/src/currency-data.ts`, `server/migrations/0002_identity.sql:32-44`, `server/migrations/0006_finance.sql`, `webapp-v2/src/components/group/settings/GroupCurrencySettings.tsx`, `webapp-v2/src/components/dashboard/create-group-modal/CurrencyRestrictionsSection.tsx`.
- **Proof:** S02, S10.
- **Related:** `currency-conversion`, `balances`; group trips.
- **Search language to validate:** "split expenses multiple currencies", "group travel expenses different currencies".
- **Approved claims:** "140 currencies." "Yen without decimals, dinars with three: every amount follows its currency's rules." "Limit a group to the currencies you're actually using."
- **Not approved:** "any currency", "crypto".

#### `currency-conversion`: convert at a current rate

- **Capability:** convert an expense or payment into another currency as you enter it. Side Badger fetches a current exchange rate, which you can change to the rate you actually got. Both the original and the converted amounts are kept and shown. A group can auto-convert new expenses into one currency.
- **Problem solved:** settling once, in one currency, after paying in several.
- **Audiences:** group trips.
- **Status:** available. **Confidence:** high for the mechanics (cross-currency settlement end-to-end test); medium for the rate source.
- **Limits and prerequisites:**
  - The rate is fixed when the expense is saved; old expenses are never revalued.
  - Auto-convert applies to new and copied expenses only, not to edits or existing expenses.
  - Rates come from the owner's f-eggs service, which polls the 1Forge market-data API ((f-eggs) `server/src/services/one-forge-client.ts`). Not every pair is guaranteed a fetched rate; a typed rate always works.
  - The server rejects a converted amount more than 0.5% away from amount times rate.
- **Evidence:** `server/src/services/fx/FxService.ts`, `webapp-v2/src/components/expense-form/useConversionState.ts`, `webapp-v2/src/components/settlements/settlement-form/useCurrencyConversion.ts`, `packages/shared/src/split-utils.ts`, `webapp-v2/src/components/expense/expense-detail-modal/ConversionNote.tsx`.
- **Proof:** S07, S08, C2; the Japan worked example on multiple currencies.
- **Related:** `multi-currency`, `settlements`; group trips.
- **Search language to validate:** "currency conversion split bill", "split bill euros pounds", "splitwise currency conversion free".
- **Approved claims:** "Convert as you go at a current exchange rate, or type the rate you actually got." "The original amount stays on the expense." "Pick a group currency and new expenses convert automatically." "Owe euros, pay in pounds."
- **Not approved:** "real-time rates", "mid-market rate", "bank-beating rates", "rates update automatically".

#### `receipt-attachments`: keep the receipt with the expense

- **Capability:** attach up to three files to an expense, visible to group members.
- **Status:** available. **Confidence:** medium (mocked browser tests only; no end-to-end coverage).
- **Limits:** JPEG, PNG, WebP, HEIC or PDF, up to 10 MB each.
- **Evidence:** `server/src/validation/asset-validation.ts`, `webapp-v2/src/components/expense-form/ExpenseAttachmentsField.tsx`, `packages/shared/src/constants.ts` (`MAX_ATTACHMENTS_PER_ITEM`, `MAX_RECEIPT_SIZE_BYTES`).
- **Proof:** S08.
- **Approved claims:** "Keep the receipt with the expense: photos or PDFs, up to three per expense."

#### `receipt-scanning`: fill in an expense from a receipt photo

- **Capability:** when adding a new expense, photograph or upload a receipt. Side Badger's AI reads it and fills in a description, the total, the currency, the date, the time and the place, and puts a text copy of the receipt in the notes, for you to check.
- **Problem solved:** typing receipts on a phone in a taxi queue.
- **Audiences:** primary, group trips; secondary, events.
- **Status:** available. **Confidence:** high that it works in production; low on accuracy.
- **Limits and prerequisites:**
  - Images only: JPEG, PNG, WebP, and HEIC once converted. PDFs are stored but not read.
  - New expenses only. It fills only fields you haven't touched, and the currency only if the group allows it.
  - A result took about 6 seconds in the production smoke test; the app waits up to 2 minutes.
  - Images are read by Google Vertex AI (Gemini) in the US multi-region.
  - It does not assign line items to people.
  - No quota was found.
- **Evidence:** `server/src/services/ai/VertexAIGeminiClient.ts`, `server/src/services/ai/ai-types.ts`, `server/src/worker/process-asset.ts`, `webapp-v2/src/app/hooks/useExpenseForm.ts`, `tasks/verify-receipt-scanning-production.md`.
- **Proof:** C1, S09.
- **Related:** `receipt-attachments`, `expense-splitting`; group trips, events.
- **Search language to validate:** "scan receipt to add expense", "receipt scanner split bill app". Results for "split bill from photo" are dominated by item-by-item restaurant splitters, which this is not.
- **Approved claims:** "Snap the receipt and Side Badger fills in the total, date and place for you to check." "Free, with no scan credits." "Receipt images are read by Google's AI service."
- **Not approved:** any accuracy claim, "split by item", "works with PDFs", "on-device" or "private" processing.

#### `comments`: comments next to the numbers

- **Capability:** comment on the group, on any expense, list or poll, with formatting and up to three attachments.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/comments.e2e.test.ts`).
- **Limits:**
  - 500 characters per comment.
  - Attachments are images or PDF, 5 MB each.
  - Only the author can delete a comment.
  - Content must relate to group finances (terms section 7.1, [D11](#d11-lists-and-polls-are-framed-around-shared-spending)).
- **Evidence:** `webapp-v2/src/components/comments/`, `server/src/services/messages/`.
- **Proof:** S08.
- **Approved claims:** "Keep the conversation next to the expense it's about."
- **Not approved:** "group chat", "messaging".

#### `reactions`: emoji reactions

- **Capability:** react with thumbs up, heart, laugh, wow, sad or celebrate on expenses, payments and comments.
- **Status:** available. **Confidence:** medium (`webapp-v2/src/__tests__/integration/playwright/comment-reactions.test.ts`, mocked).
- **Evidence:** `webapp-v2/src/components/reactions/`, `server/src/routes/route-config.ts` (`/reactions` routes).
- **Proof:** S12.
- **Approved claims:** "Celebrate a payment when it lands."

#### `lists`: shared lists

- **Capability:** checklists inside a group. Tick items off, drag to reorder, watch progress, archive, copy and comment.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/group-lists.e2e.test.ts`).
- **Limits:**
  - 100 lists per group and 200 items per list; items up to 500 characters.
  - Group permissions decide who creates, edits and deletes lists.
  - Framing per [D11](#d11-lists-and-polls-are-framed-around-shared-spending).
- **Evidence:** `server/src/services/ListService.ts`, `webapp-v2/src/components/group/lists/`.
- **Proof:** S16.
- **Approved claims:** "Keep the shared shopping list next to the shopping bills."

#### `polls`: group polls

- **Capability:** ask the group with 2 to 10 options. Allow up to 10 votes each, optionally hide who voted for what, change your vote, close and reopen, and see the winner once closed.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/group-polls.e2e.test.ts`).
- **Limits:**
  - 50 polls per group.
  - No deadlines or automatic closing.
  - Settings can only change before the first vote.
  - Framing per [D11](#d11-lists-and-polls-are-framed-around-shared-spending).
- **Evidence:** `server/src/services/PollService.ts`, `webapp-v2/src/components/group/polls/`.
- **Proof:** S17.
- **Approved claims:** "Put the villa shortlist to a vote, anonymously if you like."

#### `live-updates`: live changes and the activity feed

- **Capability:** when someone adds or changes something, everyone's screen updates without a refresh. Each group has an activity history, and a notifications bell shows activity across all your groups.
- **Status:** available. **Confidence:** high (`e2e-tests/src/__tests__/integration/live-updates-real-stack.e2e.test.ts`).
- **Limits:**
  - In-app only, with no email, text or push notifications.
  - Activity is kept for 90 days (`ACTIVITY_RETENTION_DAYS` in `server/src/repositories/IActivityRepository.ts`).
- **Evidence:** `server/src/realtime/RealtimeBroker.ts`, `webapp-v2/src/app/gateways/event-stream-connection.ts`, `webapp-v2/src/components/layout/NotificationsDropdown.tsx`.
- **Proof:** C3, S19.
- **Approved claims:** "Add an expense and everyone sees it straight away." "See what changed, and who changed it."
- **Not approved:** "notifications on your phone", "email alerts", "payment reminders".

#### `dashboard`: all your groups at a glance

- **Capability:** see every group with what you owe or are owed in each currency, accept or decline invitations, filter active and archived groups, and use quick actions: create group, scan receipt, add expense, record a payment, add list and add poll.
- **Status:** available. **Confidence:** high.
- **Evidence:** `webapp-v2/src/pages/DashboardPage.tsx`, `webapp-v2/src/components/dashboard/`.
- **Proof:** S01.
- **Approved claims:** "Every group, and where you stand in each, on one screen."

#### `direct-links`: links to a group or expense

- **Capability:** share a link that opens straight to a group or expense for its members, using the phone's share sheet where available.
- **Status:** available. **Confidence:** medium.
- **Limits:** works only for signed-in members of the group.
- **Evidence:** `webapp-v2/src/constants/routes.ts`, `webapp-v2/src/components/expense/expense-detail-modal/useExpenseDetail.ts`.
- **Approved claims:** supporting detail only: "Send someone a link straight to the expense in question."

#### `languages`: 39 languages

- **Capability:** the whole app in 39 languages, including right-to-left Arabic, Persian and Urdu. Each person picks their own language, and receipt descriptions follow it.
- **Status:** available. **Confidence:** high in code; mocked tests (`webapp-v2/src/__tests__/integration/playwright/language-switching.test.ts`).
- **Evidence:** `webapp-v2/src/locales/`, `packages/shared/src/languages.ts`, `webapp-v2/src/utils/languageDetection.ts`, `webapp-v2/src/App.tsx`, `server/src/attachments/AttachmentHandlers.ts:69-76`.
- **Proof:** S21.
- **Approved claims:** "Use Side Badger in 39 languages. Everyone in the group can pick their own."

#### `home-screen`: add it to your home screen

- **Capability:** add the web app to a phone's home screen or a computer's dock, where it opens in its own window. Settings explains how for each platform.
- **Status:** available. **Confidence:** medium.
- **Limits:** no app-store app, no offline use and no push notifications (`tasks/deferred/pwa-installation-and-push-notifications.md`).
- **Evidence:** `server/src/manifest/ManifestHandlers.ts`, `webapp-v2/src/components/settings/InstallAppSection.tsx`.
- **Proof:** S20.
- **Approved claims:** "No app store needed: add Side Badger to your home screen and it opens like an app."
- **Not approved:** "native app", "works offline", "push notifications".

#### `accounts`: sign-up and security

- **Capability:** sign up with an email address and a password of at least 12 characters. Verify the email before adding anything. A Cloudflare Turnstile check stops bots at sign-in and sign-up. Secure session cookies, optional "remember me", and change or reset your email and password.
- **Status:** available. **Confidence:** high.
- **Limits:**
  - Email and password only. Google and Apple sign-in are planned (`tasks/apple-and-google-sign-in.md`).
  - 18 or over.
  - No self-service account deletion; closure is by request (`config/policies/privacy-policy.md` section 8.5).
- **Evidence:** `webapp-v2/src/pages/RegisterPage.tsx`, `server/src/auth/middleware.ts:159`, `server/src/auth/turnstile.ts`, `server/src/auth/session-cookie.ts`.
- **Approved claims:** "All you need is an email address."
- **Not approved:** "sign in with Google or Apple", "delete your account any time", "no sign-up".

#### `feedback`: help and feedback inside the app

- **Capability:** send feedback, a feature request, a bug report or a help request with attachments, and read the team's replies in a thread.
- **Status:** available. **Confidence:** medium.
- **Evidence:** `webapp-v2/src/components/feedback/FeedbackModal.tsx`, `webapp-v2/src/pages/FeedbackHistoryPage.tsx`, `server/src/feedback/FeedbackHandlers.ts`.
- **Approved claims:** "Found a bug? Tell us from inside the app and see our reply there."

#### `privacy-posture`: trust facts

- **Capability:** no ads; no third-party analytics or advertising trackers in the app; only essential cookies; no sale of personal data; group content visible only to group members.
- **Status:** available as a description of today's app. **Confidence:** high in code, but constrained by the policies ([D3](#d3-trust-claims-match-the-policies)).
- **Third parties the app does use:**
  - Google: Firebase Authentication, and Vertex AI for receipts.
  - Cloudflare Turnstile on sign-in pages.
  - Postmark for account emails.
  - Google Fonts, through the tenant theme.
  - The owner's f-eggs rate service.
- **Evidence:** `server/src/csp.ts`, `server/src/auth/session-cookie.ts`, `config/policies/privacy-policy.md`, `config/policies/cookie-policy.md`, `server/src/services/tenant/ThemeArtifactService.ts:427`.
- **Approved claims:** "No ads." "No third-party analytics or ad trackers." "Only the cookies needed to keep you signed in." "We don't sell your personal data." "Only members of a group can see it."
- **Not approved:** "zero tracking", "privacy first", "your data stays yours", "we only collect what's needed", "end-to-end encrypted" (privacy policy section 6.1 says it is not).

#### `accessibility`: built for more people

- **Capability:** skip links, keyboard focus management in dialogs, labelled controls, right-to-left layouts, and member colours with patterns so people can be told apart without relying on colour.
- **Status:** available. **Confidence:** medium (`e2e-tests/src/__tests__/integration/site-quality.e2e.test.ts` runs accessibility checks).
- **Evidence:** `packages/shared/src/user-colors.ts`, `webapp-v2/src/components/ui/Modal.tsx`.
- **Approved claims:** "Built with keyboard and screen-reader users in mind." "Member colours come with patterns, so you don't have to tell green from red."
- **Not approved:** "fully accessible", any named conformance level such as WCAG AA.

### What Side Badger does not do

Pages and FAQs may state these plainly. None may be described as "coming soon" ([D12](#d12-no-roadmap-on-the-public-site)).

| ID | Capability | Status | Evidence | What copy may say |
|---|---|---|---|---|
| `payments` | Moving money, payment requests, payment-app links | planned (payment requests only) | `tasks/deferred/payment-requests.md`; terms section 3.5 | "Side Badger never touches your money. Pay each other however you like." |
| `recurring-expenses` | Repeating bills | not planned | none found | "Copy last month's bill in two taps." |
| `itemised-splits` | Split by receipt line, by shares, or with several payers | not planned | `webapp-v2/src/components/expense-form/SplitTypeSelector.tsx` | "One payer per expense. Split equally, exactly or by percentage." |
| `native-apps` | iOS and Android apps | not planned | no code or task | "Works in your browser; add it to your home screen." |
| `offline` | Use without a connection | not planned | no service worker | "Needs a connection." |
| `push-email-alerts` | Push, email or text notifications for activity | planned (push only) | `tasks/deferred/pwa-installation-and-push-notifications.md` | "Notifications appear in the app." |
| `export` | CSV, Excel or PDF export | planned | `tasks/deferred/data-export.md` | Not mentioned on marketing pages. |
| `search` | Search across expenses | planned | `tasks/deferred/add-postgres-search.md` | Not mentioned. |
| `reports` | Spending charts, budgets, totals | not planned | none found | Do not imply "budget tracking". |
| `social-sign-in` | Google or Apple sign-in | planned | `tasks/apple-and-google-sign-in.md` | "Sign up with email." |
| `guest-access` | Join or view without an account | not planned | `webapp-v2/src/App.tsx` | "Everyone in the group needs a free account." |
| `account-deletion` | Self-service account deletion | not planned | privacy policy section 8.5 | Not mentioned on marketing pages. |
| `dark-mode` | App-wide dark mode switch | not planned | `webapp-v2/src/app/stores/theme-store.ts` | Not mentioned. |
| `ai-assistants` | ChatGPT or Claude connectors | planned | `tasks/deferred/chatgpt-claude-mcp-plugins.md` | Not mentioned. |
| `affiliate-offers` | Sponsored offers based on spending | planned | `tasks/deferred/affiliate-recommendation-engine.md`; terms section 1.1 | Its launch ends the "No ads" claim ([D3](#d3-trust-claims-match-the-policies)). |

### Competitive context

Read on 14 October 2026 from each company's own pages, with secondary roundups noted.

- **Splitwise** sells Pro with unlimited daily expenses, no ads, currency conversion, receipt scanning with itemisation, search, charts and default split settings (https://www.splitwise.com/pro). Its free tier is reported by third parties to cap daily expenses at about three to five (https://getfinny.app/blog/splitwise-pricing-2026); Splitwise does not publish the figure.
- **Tricount** says it is free, has no ads and no limits, can be tried without signing up, works offline, has iOS and Android apps, and connects to bunq cards (https://www.tricount.com/).
- **Settle Up** emphasises minimising transactions, with apps and a web app (https://settleup.io).

Side Badger's defensible differences are free currency conversion and receipt scanning, planning tools inside the group (lists, polls, expense questions), organiser controls (viewer role, managed preset, locking), and 39 languages. Its honest weaknesses against Tricount are the required account, no offline use, no native apps, no itemised splits and no recurring bills. Copy must not claim superiority on any of those.

## Current-claims audit

Every claim in (site) `src/i18n/en.ts`, (site) `src/components/HomePage.astro` and (site) `src/components/PricingPage.astro`, plus the homepage task's story lines. Verdicts:

- **supported:** true and evidenced.
- **unsupported:** describes something the app does not do.
- **conflicts:** contradicted by the app, its policies or another claim.
- **unclear:** partly true, or true only with qualification.

### Hero, metadata and footer

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `hero.badge` | "100% free and unlimited" | conflicts | Terms section 1 reserves fees; 50-member, attachment and rate limits exist | "Free. No ads. No daily limits." ([D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits)) |
| `hero.disclaimer` | "Fair usage, and many other limitations apply. It's free until it isn't." | conflicts | Contradicts "free forever" on the same page; real limits are specific | Remove; publish the limits table |
| `hero.subtitleStatic` | "Free forever, no ads, and built with your privacy in mind." | conflicts | "Free forever" against terms section 1; "privacy in mind" against privacy policy sections 2.2, 3 and 4.7 | Keep "no ads"; drop the rest |
| `hero.typewriterWords` | Split dinner, household, holiday, gifts, party, wedding, renovation, subscriptions | supported | `expense-splitting` | Keep |
| `hero.typewriterWords` | "Collect team dues." | unsupported | No collection or payments (`payments`) | Remove |
| `hero.typewriterWords` | "Split work lunches." | unclear | Personal use only (terms section 8.2) | Remove ([D9](#d9-use-cases)) |
| `meta.description` | "totally free, no-tracking, no-ads bill splitter" | conflicts | `privacy-posture` | "Free bill splitting with no ads, no daily limits and no third-party trackers." ([D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits), [D3](#d3-trust-claims-match-the-policies)) |
| `meta.title` | "Free bill splitting, expense sharing and side-badgers" | supported | none needed | Keep or refine per the homepage brief |
| `cta.subtitle` | "It's free, it's private, and it's slightly chaotic" | unclear | "Private" holds only as "only members see a group" | "Free, and only your group can see it." |
| `footer.tagline` | "Totally free. No tracking. No ads." | conflicts | `privacy-posture` | "Free. No ads. No daily limits.", the [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise, so one line is repeated everywhere |
| `footer.copyright` | "All rights reserved (but not really, it's free)" | unclear | A joke inside a legal notice | "© {year} Side Badger" ([D18](#d18-use-the-brand-name-for-copyright)) |
| `footer.madeWith` | "Made with chaos and coffee" | supported | Brand voice; no factual claim | Keep |
| JSON-LD | `SoftwareApplication`, price 0, operating system "Web" | supported | No billing code; web only | Keep once the head slot renders |

### Features section

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `features.groups` | Live dashboard, active and archived groups, "instant notifications" | unclear | `dashboard`, `live-updates`: in-app only | Say "in-app notifications" |
| `features.invites` | Link or QR code; "join instantly from any device" | unclear | `invites`: account, email verification and possible approval needed | "Join with a link or QR code" |
| `features.roles` | Presets or custom rules; control who adds expenses, edits settings, invites | supported | `permissions` | Keep; name the viewer role |
| `features.edit` | Display name per group, manage members, security rules | supported | `groups`, `permissions` | Keep |
| `features.lists` | "Shopping lists and to-dos … project checklists" | conflicts | Terms section 7.1 | Keep shopping lists; drop to-dos and projects ([D11](#d11-lists-and-polls-are-framed-around-shared-spending)) |
| `features.polls` | "Can't decide on dinner or a destination?" | unclear | `polls`; terms section 7.1 | Frame as spending decisions |
| `features.participants` | Comments, attachments on comments, emoji | supported | `comments`, `reactions` | Keep |
| `features.receipts` | "Attach photos of receipts to any expense" | supported | `receipt-attachments` | Add the limit: up to three |
| `features.splits` | Equal, exact, percentages; receipts, locations, currencies | supported | `expense-splitting` | Keep |
| `features.currency` | "Use any currency you need. Admins can set defaults or restrict" | unclear | 140 currencies; settings permission, not always admins | "140 currencies; groups can set a default or restrict them" |
| `features.fxConversion` | "Convert … automatically using real-time rates. Split in euros, settle in dollars" | unclear | `currency-conversion`: rate fixed at entry, editable; auto only with the group setting | "Convert at a current rate as you go" ([D15](#d15-debt-and-settlement-wording)) |
| `features.ai` | "Let AI extract the details … more accuracy" | unclear | `receipt-scanning` works; no accuracy evidence | Drop "more accuracy"; add "for you to check" and Google disclosure |
| `features.balances` | "Simplified debts that minimize the number of payments" | unclear | Greedy method, not a guaranteed minimum | "Fewer payments" |
| `features.settle` | "Settle debts with a single tap" | conflicts | Records only; the form must be submitted | "Record a payment" |
| `features.activity` | Links that open a specific expense, group or settlement | unclear | `direct-links`: group and expense routes; members only | Supporting detail only |
| `features.noTracking` | "No ads, no tracking pixels, no data selling. We only collect what's needed" | conflicts | First three supported; last sentence contradicted by privacy policy section 2.2 | Keep the first three; drop the last |
| `narrative.step1` | "Create groups, invite friends, and set the rules." | supported | `groups`, `invites`, `permissions` | Keep |
| `narrative.step2` | "Add expenses, receipts, and comments. In any currency." | unclear | 140 currencies | "In 140 currencies" |
| `narrative.step3` | "See who owes who and pay back efficiently." | supported | `balances` | Keep |

### Little things, coming soon and why free

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `littleThings.dates` | Deep links open dialogs; Escape restores history | supported | `direct-links` | Retire ([D13](#d13-little-things-that-matter-is-retired)) |
| `littleThings.amounts` | Return URLs, policy checkboxes, "keep freeloaders out" | supported | `accounts` | Retire; the joke is aimed at people |
| `littleThings.names` | Focus traps, skip links, RTL layouts | supported | `accessibility` | Re-home on how it works |
| `littleThings.archive` | Archive, leave-group warnings about balances, locked banners | supported | `groups`: leaving is blocked, not only warned | Re-home on groups and permissions |
| `littleThings.celebrations` | Banners, toasts, notification dropdowns | supported | `live-updates` | Retire |
| `littleThings.everywhere` | Paging, mobile controls, instant refreshes | supported | `live-updates` | Retire |
| `littleThings.maps` | "Paste a Google Maps URL … extract the location name and address" | unclear | Place name yes; address not confirmed | "Fills in the place name" |
| `littleThings.reactions` | React to payments and expenses | supported | `reactions` | Re-home on settle up |
| `littleThings.feedback` | Report bugs, track history, "chat with our team" | unclear | `feedback`: threaded replies, not chat | "See our replies in the app" |
| `comingSoon.export` | "Download your expenses as Excel, CSV, or PDF" | unsupported | Deferred, no date; PDF is an open question in `tasks/deferred/data-export.md` | Remove ([D12](#d12-no-roadmap-on-the-public-site)) |
| `comingSoon.mobile` | "iOS and Android apps" | unsupported | No code or task | Remove; describe home-screen install |
| `whyFree.subtitle` | "Splitting bills shouldn't cost money" | supported | Brand opinion | Keep in pricing tone |
| `whyFree.trackers` | "No analytics. No tracking pixels. No 'we may share with partners.' Your expense data stays yours." | conflicts | Privacy policy section 4.7 and terms section 6.1 contradict the last two sentences | "No third-party analytics or ad trackers" only |
| `whyFree.ads` | No ads | supported | No ad code; `server/src/csp.ts` | Keep ([D3](#d3-trust-claims-match-the-policies)) |
| `whyFree.badgers` | "Privacy-first … No hidden agenda" | conflicts | Privacy policy sections 2.2 and 3 reserve promotional use | Remove |

### Use-case cards

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `whatsItFor.billSplitting`, `.expenseSharing`, `.travel`, `.gifting`, `.celebrations`, `.weddings`, `.renovations` | Split these costs fairly | supported | `expense-splitting` | Map to approved use cases |
| `whatsItFor.subscriptions` | Streaming bundles, shared accounts | supported | No recurring bills; copy instead | Mention on housemates only |
| `whatsItFor.budgetTracking` | "Group spending … No more spreadsheets" | unclear | No budgets or spending reports (`reports`) | Remove the "budget" framing |
| `whatsItFor.reduceTransactions` | "We optimize who pays whom, so you settle up less often" | unclear | Fewer payments, not less often | "Fewer transfers when you do settle" |
| `whatsItFor.sports` | Team dues, gear, tournament fees | unclear | Tracking only; no collection | Drop ([D9](#d9-use-cases)) |
| `whatsItFor.work` | Office meals, offsites, shared reimbursements | conflicts | Terms section 8.2, personal use | Drop |
| `whatsItFor.school` | Field trips, club dues | conflicts | Terms section 2, 18 and over | Drop |

### Pricing page

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `pricing.hero.title` | "It's Free" | supported | No billing code; terms section 1 | Keep |
| `pricing.hero.subtitle` | "No credit card. No hidden fees. Just free." | supported | No billing code | Keep |
| `pricing.free.price`, `pricing.meta.title` | "Free forever" | conflicts | Terms section 1 | "Free" |
| `pricing.free.feature3` | "Add friends" | unclear | No friends list; you invite people to groups | "Invite people to groups" |
| `pricing.free.feature4` | "No tracking" | conflicts | `privacy-posture` | "No third-party trackers" |
| `pricing.free.feature6` | "Privacy first" | conflicts | Privacy policy sections 2.2, 3 and 4.7 | Remove |
| `pricing.faq.q1` | "No premium features locked behind a paywall" | supported | No paid tier exists | Keep, in the present tense |
| `pricing.faq.q2` | "No catch … That's it." | conflicts | Terms section 1.1; privacy policy section 3 | Replace with the [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) answer |
| `pricing.faq.q3` | "Absolutely not [sell data]. … Zero trackers, zero analytics pixels, zero interest in your habits." | conflicts | The first sentence is supported; the rest is contradicted by privacy policy section 2.2 | Keep "we don't sell your personal data" |
| `pricing.faq.q5`, `pricing.pro.*`, `pricing.meta.description` | Pro plan coming; "free plan will always remain free with all current features" | unsupported and conflicts | No Pro anywhere; terms section 1 | Remove ([D12](#d12-no-roadmap-on-the-public-site)) |
| `pricing.faq.q6` | Report bugs | supported | `feedback` | Keep; mention in-app feedback |
| `pricing.faq.q4` | "Why a badger?" | supported | No factual claim | Keep |

### Policy page metadata

| Key | Claim | Verdict | Evidence | Direction |
|---|---|---|---|---|
| `policy.privacy.meta.description` | "we don't track you, sell your data, or show ads" | conflicts | The policy on the same page reserves promotional and affiliate use | "How Side Badger collects, uses and protects your data." |
| `policy.cookies.meta.description` | "we don't use tracking cookies" | supported | `config/policies/cookie-policy.md` | Keep |
| `policy.terms.meta.description` | "be cool, don't do illegal stuff, enjoy the free ride" | unclear | Understates an 18+, finance-only, no-refunds contract | Plain description |

### Homepage task story lines

| Scene | Claim | Verdict | Direction for [the homepage task](./homepage-scroll-experience.md) |
|---|---|---|---|
| A group forms | Invite link or QR code; people drop in | supported | Joiners need an account; don't show instant joining by strangers |
| Expenses land | Equal, exact, percentage; receipt details lift out of the image | supported | Show the fields being checked, not trusted blindly ([D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)) |
| Currencies collide | "Convert at live rates" | unclear | "A current rate, which you can change" |
| The tangle | "Simplifies into the fewest payments" | conflicts | "Fewer payments"; the homepage uses its own Japan-trip example (ten debts into three payments), and the six-into-two example stays on settle up |
| Settle up | "One tap" | conflicts | "Record the payment"; no money moves |
| Trust | "No ads, no tracking, no data selling" | conflicts | "No ads, no third-party trackers, we don't sell your data" |
| Worlds | Clubs, teams and work world | conflicts | Drop the world ([D9](#d9-use-cases)); show the four approved use cases |
| Couples and families | Children's activities | conflicts | Adults only (terms section 2) |

## Recommended site structure

Validated against the registry, the search evidence and the policies. A page exists only when it answers a distinct question with original material.

```text
/
├── how-it-works/                          first release
├── features/                              first release (index)
│   ├── split-expenses/                    first release
│   ├── settle-up/                         first release (new)
│   ├── multiple-currencies/               first release
│   ├── receipt-scanning/                  release 2 (renamed; gated by D10)
│   ├── groups-and-permissions/            release 2 (absorbs invites and locking)
│   └── lists-and-polls/                   release 2 (renamed)
├── use-cases/                             first release (index)
│   ├── group-trips/                       first release (renamed)
│   ├── housemates/                        first release
│   ├── events-and-celebrations/           first release (renamed)
│   └── couples/                           release 2 (renamed)
├── compare/
│   └── splitwise/                         release 2
├── pricing/                               first release (rewritten)
├── privacy/
├── terms/
└── cookies/
```

### Page decisions

| Proposed page | Decision | Reason | Thin-content risk |
|---|---|---|---|
| `/how-it-works/` | Keep, first release | Answers the "what does using it involve" question that blocks sign-up: account, verification, settling outside the app | Low |
| `/features/` | Keep, first release | Navigation target and honest "doesn't do" list | Medium; needs the limits and the "doesn't do" list to carry weight |
| `/features/split-expenses/` | Keep, first release | Core capability; target of most use-case links; distinct split-method intent | Low |
| `/features/settle-up/` | Add, first release | The core outcome had no page; "simplify debts" is a distinct intent; strongest visual proof | Low |
| `/features/multiple-currencies/` | Keep, first release | Clear differentiator: free conversion against Splitwise Pro; strong proof and test coverage | Low |
| `/features/receipts-and-scanning/` | Rename to `receipt-scanning`, release 2 | Live but quality unproven ([D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)); search intent leans toward itemised splitting, which needs careful framing | Medium |
| `/features/groups-and-permissions/` | Keep, release 2 | Organiser intent is real but smaller; rich material (presets, viewer, approval, locking, invites) | Low |
| `/features/lists-polls-and-comments/` | Rename to `lists-and-polls`, release 2 | Distinctive, but weak standalone search intent and constrained by terms section 7.1; comments move to the pages they serve | Medium; one page, never two |
| `/use-cases/` | Add, first release | Navigation target for "Use cases"; short chooser with each scenario's teaser | Medium; keep it short and useful |
| `/use-cases/holidays-and-group-travel/` | Rename to `group-trips`, first release | Highest feature fit: currencies, conversion, scanning, polls, lists, simplification | Low |
| `/use-cases/housemates/` | Keep, first release | High demand; results are informational guides, so the page must carry real guidance on fair splitting | Low if the guidance is real |
| `/use-cases/parties-weddings-and-gifts/` | Rename to `events-and-celebrations`, first release | Shows the differentiators (polls, exact splits, managed groups) best | Medium; needs two strong scenarios |
| `/use-cases/couples-and-families/` | Rename to `couples`, release 2 | Real demand, weaker fit: no default split and no recurring bills | Medium; needs the income-split guidance |
| `/use-cases/clubs-teams-and-work/` | Drop | Intent is payment collection; terms limit use to personal, 18 and over ([D9](#d9-use-cases)) | Not built |
| `/compare/splitwise/` | Add, release 2 | Proven query pattern; honest comparison is useful ([D16](#d16-one-comparison-page-in-release-2)) | Low with the dated table |
| `/about/` | Drop | No real founding story or team evidence in either repository | Not built |

### Page responsibilities

- **Homepage:** answer what Side Badger is, who it helps, why it is different and what to do next, then route to deeper pages. Built as a scroll-driven story; see [the homepage scroll experience task](./homepage-scroll-experience.md) and the [homepage brief](#homepage).
- **How it works:** one end-to-end story from group to settlement, including requirements and what "settle" means.
- **Feature pages:** answer capability-led searches with the problem, workflow, options, limits, product evidence, related use cases, a short FAQ and a launch call to action.
- **Use-case pages:** answer situation-led searches in the reader's words with a concrete scenario, a worked example, practical guidance and links to the feature pages.
- **Pricing:** state the current offer and limits precisely.

## Page briefs

### Rules for every brief

- **Calls to action:**
  - Body: "Create a free account" opens `https://app.sidebadger.me/register`.
  - Header: "Open the app" opens `/dashboard`.
  - Both go through the launch counter and carry `?lang=` on localized pages ([D1](#d1-launch-links-go-to-production), [D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter)).
  - Every page has one call to action above the fold and one at the end.
- **Claims:** only the approved claims of the registry IDs listed in the brief. A page that needs a claim not listed adds it to the registry first.
- **FAQ:** visible on the page and mirrored in `FAQPage` JSON-LD with identical text. Three to six questions; answers in two or three sentences.
- **Internal links:** every page links to how it works and pricing. Feature pages link to at least two use cases, and use cases to at least two features. Links to release-2 pages are added only once those pages exist.
- **Worked examples:** English uses the exact numbers given below; they have been checked against the app's rules. Rates are labelled illustrative. Names are localized with the page. Single-currency examples are shown in the locale's home currency, with the English amounts scaled to round figures under the [D19](#d19-the-amount-cap-is-disclosed) cap; the people, expenses, payers, split methods and number of suggested payments stay the same, and the build computes the results (restructure 3.4). Examples about conversion (multiple currencies, group trips) keep their currencies in every locale, because the currencies are the point.
- **Length:** feature and use-case pages run 700 to 1,200 words of original text. The index and pricing pages run 400 to 700.

### Homepage

[The homepage plan](./homepage-scroll-experience.md) owns the scenes, copy deck, worked example, motion and layout, and it is authoritative where this brief and it differ. This brief fixes intent, claims and links.

- **Target visitor and intent:** people searching the brand or the category, and people arriving from a friend's invite link who want to know what this is.
- **Primary query hypotheses:** "bill splitting app", "split expenses with friends".
- **Secondary query hypotheses:** "free bill splitting app no ads", "expense sharing app", "Side Badger".
- **The one question:** "What is this, and is it right for my group?"
- **Outline:** the homepage plan's nine scenes: the chaos hero with the `h1` and call to action; a group forms; expenses land (three split methods, receipt scanning with the Google disclosure); currencies (140 currencies, a current exchange rate you can change); the tangle (who owes whom, fewer payments); settle up (record the payment); the four approved use cases; trust (no ads, no third-party trackers, no selling of personal data); the pricing promise and the final call to action.
- **Required proof:** the homepage's illustrated app frames and the tangle diagram (HTML and SVG). The homepage shows no screenshots; real captures live on the deeper pages.
- **Worked example:** the homepage plan's Japan trip: five friends paying in yen, dollars and euros, whose ten debts become three payments. Its amounts and currencies are fixed in every locale, because the homepage is an illustrated story. The housemates six-into-two example stays on [settle up](#settle-up); the [housemates](#housemates) page keeps its own example with a different cast.
- **FAQ candidates:** none on the homepage; link to pricing and how it works.
- **Links out:** how it works, the three release 1 feature pages, the three release 1 use cases, pricing.
- **Links in:** every page through the logo.
- **Claims:** `groups`, `invites`, `accounts`, `expense-splitting`, `receipt-scanning`, `multi-currency`, `currency-conversion`, `balances`, `settlements`, `reactions`, `lists`, `polls`, `comments`, `privacy-posture`, and the [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise.
- **Tone samples:** "Shared costs, sorted. Badger optional." "For groups who have had enough of the spreadsheet."

### How it works

- **Target visitor and intent:** a considering visitor who wants to know what using Side Badger involves before signing up; people asking how group expense splitting works.
- **Primary query hypotheses:** "how to split expenses in a group", "how does a bill splitting app work".
- **Secondary query hypotheses:** "who owes who", "what does settle up mean", "do my friends need an account".
- **The one question:** "What happens between 'someone paid' and 'we're square'?"
- **Outline:**
  - H1 "How Side Badger works"
  - H2 "Create a group"
  - H2 "Invite your people"
  - H2 "Add expenses as they happen"
  - H2 "Watch the balances"
  - H2 "Settle up outside the app, record it inside"
  - H2 "What you need": a free account with a verified email; 18 or over; a modern browser on a phone or computer; add it to your home screen; a connection is needed.
  - H2 "39 languages, and built for more people"
  - H2 "Questions"
- **Required proof:** S02, S03, S05, S10, S11, S20, S21, C3.
- **Worked example:** three friends after a night out.

  | Expense | Paid by | Split | Ana | Ben | Cara |
  |---|---|---|---|---|---|
  | Dinner £90 | Ana | Equally | £30 | £30 | £30 |
  | Taxi £30 | Ben | Equally | £10 | £10 | £10 |
  | **Net** | | | +£50 | −£10 | −£40 |

  Side Badger suggests two payments: Cara pays Ana £40, and Ben pays Ana £10. Ben's taxi is already netted off his share of dinner.
- **FAQ candidates:**
  - Does everyone need an account? Yes, a free one; verify your email before adding anything.
  - Is there an app? It runs in the browser; add it to your home screen.
  - Does Side Badger move money? No.
  - Can someone leave owing money? No; they settle first.
  - How many people can join a group? Up to 50.
- **Links in:** homepage, every feature and use-case page.
- **Links out:** split expenses, settle up, multiple currencies, use cases, pricing.
- **Claims:** `groups`, `invites`, `expense-splitting`, `balances`, `settlements`, `live-updates`, `dashboard`, `languages`, `home-screen`, `accounts`, `accessibility`.
- **Tone samples:** "From 'I'll get this one' to 'we're square'." "Four steps. No spreadsheet. One badger, mostly decorative."

### Features index

- **Target visitor and intent:** comparison shoppers checking whether it does what their group needs.
- **Primary query hypotheses:** "bill splitting app features".
- **Secondary query hypotheses:** "split expenses app with currency conversion", "split bill app with receipt scanning".
- **The one question:** "Can Side Badger do the thing my group needs?"
- **Outline:**
  - H1 "What Side Badger does"
  - H2 sections: "Split expenses", "Settle up", "Multiple currencies", "Receipt scanning", "Groups and permissions", "Lists and polls", "Everything else" (languages, live updates, home screen, feedback).
  - H2 "What Side Badger doesn't do", from the [does-not-do table](#what-side-badger-does-not-do).
- **Required proof:** one still per cluster, reused from the cluster pages.
- **Worked example:** none.
- **FAQ candidates:**
  - Can I pay through Side Badger? No.
  - Is there a mobile app? It runs in the browser; add it to your home screen.
  - Can I split by item? No.
  - Does it work offline? No, it needs a connection.
- **Links in:** header navigation, homepage, how it works.
- **Links out:** every published feature page; release-2 clusters appear as text without links until their pages exist.
- **Claims:** the registry summary rows, at their approved wording.
- **Tone samples:** "Everything in the box, and what isn't." "Here's the full kit. We left out the spreadsheet on purpose."

### Split expenses

`/features/split-expenses/`

- **Target visitor and intent:** people working out how to split costs that aren't 50/50.
- **Primary query hypotheses:** "split bill by percentage", "split expenses app".
- **Secondary query hypotheses:** "split bill unequally", "split costs exact amounts", "who pays the odd penny".
- **The one question:** "Can I split this fairly when it isn't an even share?"
- **Outline:**
  - H1 "Split expenses equally, exactly or by percentage"
  - H2 "Three ways to split"
  - H2 "Only the people who were there"
  - H2 "The details that save arguments later": date, labels, place from a map link, notes, receipts
  - H2 "Copy, edit, and see what changed"
  - H2 "When something looks wrong": expense questions
  - H2 "Limits": one payer per expense; no split by item or shares; up to 999,999.99; three attachments
  - H2 "Questions"
- **Required proof:** S05, S06, S08, S18.
- **Worked example:**
  - Cottage weekend, £600 by room size at 50%, 30% and 20%: £300, £180 and £120.
  - Dinner, £84 equally between three: £28 each.
  - Groceries, £64.50 by exact amounts: £25.00, £21.50 and £18.00.
  - £100 equally between three: £33.34, £33.33 and £33.33. The extra penny goes to one person at random.
- **FAQ candidates:**
  - Can two people pay for one expense? Not in one expense; record two.
  - Can I split a receipt by item? No; scanning fills in the total.
  - Can I set a default split? No; copy an earlier expense to reuse its split.
  - Can bills repeat every month? No; copy last month's.
  - Who can edit an expense? Whoever the group's permissions allow.
- **Links in:** homepage, how it works, housemates, events and celebrations, couples, features index.
- **Links out:** settle up, multiple currencies, housemates, events and celebrations; later receipt scanning and groups and permissions.
- **Claims:** `expense-splitting`, `expense-questions`, `receipt-attachments`, `comments`, `reactions`.
- **Tone samples:** "Not everything is 50/50. Side Badger copes." "Split it equally, exactly or by percentage. Grudges sold separately."

### Settle up

`/features/settle-up/`

- **Target visitor and intent:** a group with tangled IOUs that wants to finish with as few transfers as is practical.
- **Primary query hypotheses:** "simplify group debts", "who owes who in a group".
- **Secondary query hypotheses:** "settle up app", "minimise payments group expenses", "group expense calculator".
- **The one question:** "Who should pay whom so we're all square, without a dozen transfers?"
- **Outline:**
  - H1 "Settle up with fewer payments"
  - H2 "Balances that update as you go": per currency, live
  - H2 "From a tangle to a short list": the worked example
  - H2 "Record a payment": quick settle, partial payments, overpayment warnings, notes
  - H2 "Paid in a different currency?"
  - H2 "History you can check"
  - H2 "What Side Badger doesn't do": move money or send payment requests
  - H2 "Questions"
- **Required proof:** S10, S11, S12, C3, and the six-into-two diagram (HTML and SVG).
- **Worked example:** four housemates, one month.

  | Expense | Paid by | Split |
  |---|---|---|
  | Electricity £120 | Amira | Equally, £30 each |
  | Internet £40 | Ben | Equally, £10 each |
  | Groceries £80 | Carlos | Equally, £20 each |

  Net position: Amira +£60, Ben −£20, Carlos +£20, Dana −£60.

  Paying back each person directly, after netting each pair, takes six payments: Ben pays Amira £20; Carlos pays Amira £10; Dana pays Amira £30; Ben pays Carlos £10; Dana pays Ben £10; Dana pays Carlos £20.

  Side Badger suggests two: Dana pays Amira £60, and Ben pays Carlos £20.
- **FAQ candidates:**
  - Does Side Badger send the money? No; pay however you like and record it.
  - Can I turn simplification off? No; "Show all" lists every suggested payment.
  - Why are euros and pounds separate? Balances stay in the currency you paid in unless you convert.
  - What if someone pays only part? The rest stays on the balance.
  - Is this always the smallest possible number of payments? Not guaranteed. It's at most one fewer than the number of people with a balance in that currency.
- **Links in:** homepage, how it works, housemates, group trips, split expenses, features index.
- **Links out:** split expenses, multiple currencies, housemates, group trips.
- **Claims:** `balances`, `settlements`, `currency-conversion`, `reactions`, `live-updates`.
- **Tone samples:** "Six payments walk into a bar. Two walk out." "Untangle who owes whom."

### Multiple currencies

`/features/multiple-currencies/`

- **Target visitor and intent:** travellers and international groups paying in more than one currency.
- **Primary query hypotheses:** "split expenses in multiple currencies", "group travel expenses different currencies".
- **Secondary query hypotheses:** "currency conversion split bill", "splitwise currency conversion free", "split costs euros and pounds".
- **The one question:** "How do we split costs fairly when we paid in different currencies?"
- **Outline:**
  - H1 "Split costs in any of 140 currencies"
  - H2 "Enter it as you paid it"
  - H2 "Keep currencies separate, or convert as you go"
  - H2 "A rate you can see and change"
  - H2 "One currency for the whole group": auto-convert
  - H2 "Owe euros, pay in pounds"
  - H2 "Rules for the group": permitted currencies and a default
  - H2 "Limits": rate fixed at entry; typed rate if none is fetched; 999,999.99 cap per expense
  - H2 "Every supported currency": the full list of 140, expandable
  - H2 "Questions"
- **Required proof:** S07, S08, S10, C2.
- **Worked example:** four friends in Japan, rate of ¥200 = £1 labelled illustrative.
  - Ana pays the hotel, booked at home, £1,200, split equally (£300 each).
  - In Japan, Ben pays a dinner of ¥40,000, split equally (¥10,000 each).
  - Chloé pays train tickets of ¥24,000, split equally (¥6,000 each).
  - Dev pays temple entry of ¥4,000, split equally (¥1,000 each).
  - **Kept separate:** the pound balance needs three payments to Ana (£300 each from Ben, Chloé and Dev). The yen balance needs three more: Ana pays Ben ¥17,000, Dev pays Ben ¥6,000, and Dev pays Chloé ¥7,000. Six payments in all.
  - **Converted as entered:** the yen expenses become £200, £120 and £20. Each person's share is £385. Side Badger suggests three payments: Dev pays Ana £365, Chloé pays Ana £265, and Ben pays Ana £185.
- **FAQ candidates:**
  - Which exchange rate do you use? A current market rate fetched when you enter the expense; you can type your own.
  - Do old expenses get revalued? No; the rate is fixed when saved.
  - Do you support crypto? No.
  - Why can't I enter 2,000,000 rupiah? Each expense is capped at 999,999.99 in its own currency; enter it in another currency and convert.
  - Does conversion cost anything? No.
- **Links in:** homepage, group trips, how it works, features index, settle up.
- **Links out:** group trips, settle up, split expenses.
- **Claims:** `multi-currency`, `currency-conversion`, `settlements`.
- **Tone samples:** "Euros, yen, and that one taxi in baht." "Paid in yen, settling in pounds? Fine."

### Receipt scanning

`/features/receipt-scanning/`, release 2, gated by [D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later).

- **Target visitor and intent:** people tired of typing receipts in by hand.
- **Primary query hypotheses:** "scan receipt to add expense", "receipt scanner split bill app".
- **Secondary query hypotheses:** "attach receipt to shared expense", "free AI receipt reader". The "split bill from photo" results expect item-by-item splitting, so the page says early and plainly that it fills in the total.
- **The one question:** "Can I add an expense from a photo of the receipt?"
- **Outline:**
  - H1 "Scan a receipt, check the details, split it"
  - H2 "What it fills in"
  - H2 "What you still check"
  - H2 "Keep the receipt with the expense"
  - H2 "Where your receipt goes": Google's AI service; visible to group members
  - H2 "Limits": images only, new expenses only, no line items
  - H2 "Questions"
- **Required proof:** C1, S09, using the purpose-made fictional receipt.
- **Worked example:** a fictional café receipt beside a table of the fields it filled in: description, total, currency, date, time, place.
- **FAQ candidates:**
  - Does it split by item? No.
  - Can it read PDFs? No; attach them, but they aren't read.
  - How long does it take? Usually seconds.
  - Is there a limit on scans? No.
  - Who sees my receipt? Members of the group, and Google's AI service reads it.
- **Links in:** split expenses, group trips, events and celebrations, features index.
- **Links out:** split expenses, group trips.
- **Claims:** `receipt-scanning`, `receipt-attachments`.
- **Tone samples:** "Let the badger read the receipt." "Snap it. Check it. Split it."

### Groups and permissions

`/features/groups-and-permissions/`, release 2.

- **Target visitor and intent:** organisers of larger or more formal groups who want control over who joins and who changes the numbers.
- **Primary query hypotheses:** "expense group admin permissions", "approve members shared expenses".
- **Secondary query hypotheses:** "read-only member expense tracker", "invite with QR code expenses".
- **The one question:** "Can I control who joins and who can change the numbers?"
- **Outline:**
  - H1 "Groups that run the way you want"
  - H2 "Invite with a link or QR code"
  - H2 "Approve who joins"
  - H2 "Admins, members and viewers"
  - H2 "Open, managed, or your own rules"
  - H2 "Lock it when it's done"
  - H2 "Leaving and closing a group"
  - H2 "Questions"
- **Required proof:** S03, S04, S13, S14, S15.
- **Worked example:** a table of the seven permissions under the Open and Managed presets, from `server/src/permissions/permission-engine.ts`.
- **FAQ candidates:**
  - Can a viewer add expenses? No.
  - Can someone leave owing money? No.
  - What happens when a group is closed? Nobody can open it again.
  - Can I undo a lock? Yes, an admin can unlock.
- **Links in:** events and celebrations, housemates, features index.
- **Links out:** events and celebrations, housemates, how it works.
- **Claims:** `groups`, `invites`, `permissions`.
- **Tone samples:** "Your group, your rules, within reason." "Some groups need a treasurer. Side Badger has a setting for that."

### Lists and polls

`/features/lists-and-polls/`, release 2. Examples follow [D11](#d11-lists-and-polls-are-framed-around-shared-spending).

- **Target visitor and intent:** groups planning shared spending together.
- **Primary query hypotheses:** "shared shopping list with expenses", "group poll for trip".
- **Secondary query hypotheses:** "vote on holiday accommodation app".
- **The one question:** "Can we plan the spending in the same place we split it?"
- **Outline:**
  - H1 "Plan the spending, then split it"
  - H2 "Shared lists"
  - H2 "Polls"
  - H2 "Comments everywhere"
  - H2 "Limits"
  - H2 "Questions"
- **Required proof:** S16, S17.
- **Worked example:** a poll for the villa with three options and six votes, closed with a winner; then the villa expense split four ways.
- **FAQ candidates:**
  - Can votes be anonymous? Yes.
  - Can a poll close automatically? No; close it yourself.
  - How many items can a list hold? 200.
- **Links in:** group trips, events and celebrations, housemates, features index.
- **Links out:** group trips, events and celebrations.
- **Claims:** `lists`, `polls`, `comments`.
- **Tone samples:** "Vote on the villa. Split the villa." "The shopping list and the shopping bill, finally on speaking terms."

### Use cases index

`/use-cases/`

- **Target visitor and intent:** people browsing by situation.
- **The one question:** "Which kind of group are we?"
- **Outline:**
  - H1 "Side Badger for your kind of group"
  - One H2 per published use case, each with a one-paragraph scenario and the result of its worked example.
- **Required proof:** none beyond shared stills.
- **Links:** to each published use case, how it works, pricing.
- **Tone samples:** "Housemates, holidays, hen dos. Pick your chaos."

### Housemates

`/use-cases/housemates/`

- **Target visitor and intent:** people sharing a house or flat who want a fair, low-nag way to share bills.
- **Primary query hypotheses:** "split bills with housemates", "app to split bills with roommates".
- **Secondary query hypotheses:** "how to split utility bills fairly", "split rent by room size", "flatmate bills app", "shared house expenses".
- **The one question:** "How do we share household bills fairly and keep track without nagging?"
- **Outline:**
  - H1 "Split household bills with housemates"
  - H2 "Set up the house": who's in; open or managed
  - H2 "Rent and bills": percentage for room size; copy each month
  - H2 "The shared shop": list and groceries
  - H2 "Who owes whom this month"
  - H2 "Fair ways to split household costs": equal, by room size, by use, and when each works. This is genuine guidance, because the results are informational.
  - H2 "When someone moves out": they settle first; lock or close the group
  - H2 "Questions"
- **Required proof:** S05, S16, S10, S18.
- **Worked example:** four housemates, one month. This uses a different cast from the settle-up example, so readers moving between the pages don't mix the two up.
  - Jo pays rent of £2,000, split by room size at 30%, 25%, 25% and 20%: £600, £500, £500 and £400.
  - Kwame pays energy of £120, split equally (£30 each).
  - Lena pays internet of £40, split equally (£10 each).
  - Matt pays groceries of £80, split equally (£20 each).
  - Net: Jo +£1,340, Kwame −£440, Lena −£520, Matt −£380.
  - Side Badger suggests three payments, all to Jo, who paid the landlord: £520 from Lena, £440 from Kwame and £380 from Matt.
  - Next month, copy the rent expense.
- **FAQ candidates:**
  - Can rent repeat automatically? No; copy last month's in a couple of taps.
  - Can we split by room size? Yes, by percentage.
  - What if a housemate moves out owing money? They can't leave the group until they've settled.
  - Does Side Badger pay the bills? No.
  - Can one housemate keep the books? Yes; make them admin and use a managed group.
- **Links in:** homepage, use cases index, settle up, split expenses.
- **Links out:** split expenses, settle up; later lists and polls, and groups and permissions.
- **Claims:** `groups`, `invites`, `permissions`, `expense-splitting`, `expense-questions`, `balances`, `settlements`, `lists`, `live-updates`.
- **Tone samples:** "For the housemate who buys the toilet roll, and the housemates who never see it happen." "House bills, minus the passive-aggressive fridge notes."

### Group trips

`/use-cases/group-trips/`

- **Target visitor and intent:** friends planning or on a trip, including stag and hen weekends and ski trips.
- **Primary query hypotheses:** "split trip expenses with friends", "group holiday expenses app".
- **Secondary query hypotheses:** "split travel costs different currencies", "stag do cost split", "ski trip expenses split", "track group trip spending".
- **The one question:** "How do we track who paid what on a trip, across currencies, and settle once at the end?"
- **Outline:**
  - H1 "Split group trip costs, in any currency"
  - H2 "Before you go": vote on the villa; list the shared kit to buy
  - H2 "While you're away": scan receipts; enter in local currency; convert or not
  - H2 "Not everyone did everything": split between some
  - H2 "Settle once you're home"
  - H2 "Stag and hen weekends": a managed group, approval for joiners, exact amounts for the guest of honour's share
  - H2 "Questions"
- **Required proof:** C1, S07, S10, S17.
- **Worked example:** four friends in Lisbon, rate of €1 = £0.85 labelled illustrative.

  | Expense | Paid by | Split |
  |---|---|---|
  | Flights £480 | Ana | Equally, £120 each |
  | Villa €900 | Ben | Equally, €225 each |
  | Dinner €120 | Chloé | Ana, Ben and Chloé, €40 each |
  | Boat trip €160 | Dev | Equally, €40 each |

  - **Kept separate:** pounds need three payments (£120 each from Ben, Chloé and Dev to Ana). Euros need three more: Ana pays Ben €305, Chloé pays Ben €185, and Dev pays Ben €105. Six payments in all.
  - **Group set to auto-convert to pounds:** the villa becomes £765, dinner £102 and the boat £136. Side Badger suggests three payments: Chloé pays Ben £277.25, Dev pays Ben £108.50, and Dev pays Ana £100.75.
- **FAQ candidates:**
  - Can people who skipped dinner be left out? Yes.
  - Does it work without signal? No; it needs a connection.
  - Does everyone need to install something? No; it runs in the browser.
  - Which exchange rate? A current rate when you enter it, or your own.
  - Can we freeze the group after the trip? Yes, an admin can lock it.
  - Is there a limit on amounts? 999,999.99 per expense in its currency.
- **Links in:** homepage, use cases index, multiple currencies, settle up.
- **Links out:** multiple currencies, settle up, split expenses; later receipt scanning and lists and polls.
- **Claims:** `expense-splitting`, `balances`, `settlements`, `multi-currency`, `currency-conversion`, `receipt-scanning`, `lists`, `polls`, `permissions`.
- **Tone samples:** "Track the villa, the taxi, and the cocktail round nobody remembers volunteering to buy." "Holiday maths, done before the tan fades."

### Events and celebrations

`/use-cases/events-and-celebrations/`

- **Target visitor and intent:** organisers of weddings, birthdays, parties and group gifts where people chip in different amounts.
- **Primary query hypotheses:** "split wedding costs", "split group gift cost".
- **Secondary query hypotheses:** "hen do cost split app", "split party costs with friends", "birthday dinner split bill".
- **The one question:** "How do we share the costs of an event fairly when not everyone pays the same?"
- **Outline:**
  - H1 "Split the costs of parties, weddings and group gifts"
  - H2 "Decide together": polls for the venue or the gift
  - H2 "Who's in for what": exact amounts; only the people involved
  - H2 "Keep the paperwork": receipts and comments
  - H2 "Organiser controls": managed group, approval, lock afterwards
  - H2 "Settle after the party"
  - H2 "Questions"
- **Required proof:** S17, S06, S13.
- **Worked example:** a group gift. A poll on which gift gets six votes. Priya buys it for £150 and splits it by exact amounts:

  | Person | Share |
  |---|---|
  | Priya | £30 |
  | Tom | £30 |
  | Jess | £30 |
  | Mo | £20 |
  | Lee | £20 |
  | Kat | £20 |

  Side Badger shows five payments to Priya, totalling £120.
- **FAQ candidates:**
  - Can guests see the group without joining? No; they join with a link and a free account.
  - Can Side Badger collect the money? No; record payments made elsewhere.
  - Can votes be anonymous? Yes.
  - Can people chip in different amounts? Yes, with exact amounts.
- **Links in:** homepage, use cases index, split expenses.
- **Links out:** split expenses, settle up; later lists and polls, and groups and permissions.
- **Claims:** `invites`, `permissions`, `expense-splitting`, `balances`, `settlements`, `comments`, `polls`.
- **Guardrail:** never joke about who chipped in less.
- **Tone samples:** "Split deposits, decorations and emergency umbrellas. Leave the seating plan to someone braver." "Who chipped in what, in one place."

### Couples

`/use-cases/couples/`, release 2.

- **Target visitor and intent:** couples sharing costs, including those splitting by income.
- **Primary query hypotheses:** "split expenses with partner app", "split bills by income couple".
- **Secondary query hypotheses:** "fair way to split bills with partner", "couples expense tracker".
- **The one question:** "How do we share costs fairly when we don't earn the same?"
- **Outline:**
  - H1 "Share costs as a couple, fairly"
  - H2 "50/50, by income, or bill by bill": how to work out an income percentage
  - H2 "The monthly round-up"
  - H2 "Just the two of you": the group is private to its members
  - H2 "Questions"
- **Required proof:** S05, S10.
- **Worked example:**
  - Sam pays rent of £1,500, split 60% Sam and 40% Alex: Alex owes £600.
  - Alex pays groceries of £90, split equally: Sam owes £45.
  - Side Badger nets this to one payment: Alex pays Sam £555.
- **FAQ candidates:**
  - Can we set 60/40 once for everything? No; set it per expense, or copy one that has it.
  - Does it link to our bank? No.
  - Can anyone else see our group? Only members.
- **Links in:** use cases index, split expenses.
- **Links out:** split expenses, settle up.
- **Claims:** `expense-splitting`, `balances`, `settlements`, `privacy-posture`.
- **Tone samples:** "Share the boring costs without turning date night into a quarterly finance review."

### Pricing

`/pricing/`

- **Target visitor and intent:** people checking the cost and the catch, and people leaving apps with daily caps or ads.
- **Primary query hypotheses:** "free bill splitting app", "bill splitting app no ads".
- **Secondary query hypotheses:** "splitwise free limit", "is Side Badger free".
- **The one question:** "What does it cost, and what's the catch?"
- **Outline:**
  - H1 "Side Badger is free"
  - H2 "What you get": everything, with no paid tier
  - H2 "Limits": the table in [Pricing and promise](#pricing-and-promise)
  - H2 "No ads, no third-party trackers"
  - H2 "Will it stay free?"
  - H2 "Questions"
  - One call to action. Remove the Pro card.
- **Required proof:** none needed; the limits table is the proof.
- **Worked example:** none.
- **FAQ candidates:**
  - Is it really free? Yes, everything, today.
  - Will it stay free? Our terms commit us to give notice before any change.
  - Are there daily limits? No.
  - Do you sell my data? No.
  - Why a badger? Keep the existing answer.
  - Found a bug? Use in-app feedback.
- **Links in:** every page's footer and navigation.
- **Links out:** how it works, features index, privacy policy.
- **Claims:** `privacy-posture`, `feedback`, and the [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise.
- **Structured data:** `FAQPage` matching the visible FAQ. The homepage carries the `SoftwareApplication` offer at price 0.
- **Tone samples:** "Free. No ads. No daily limits." "It costs nothing. We checked."

### Splitwise comparison

`/compare/splitwise/`, release 2. Rules in [D16](#d16-one-comparison-page-in-release-2).

- **Target visitor and intent:** Splitwise users hitting the daily cap or tired of ads.
- **Primary query hypotheses:** "splitwise alternative", "free alternative to splitwise".
- **Secondary query hypotheses:** "splitwise daily limit", "splitwise currency conversion free".
- **The one question:** "Would Side Badger work instead of Splitwise for my group?"
- **Outline:**
  - H1 "A free Splitwise alternative"
  - H2 "What's the same"
  - H2 "Free here, paid there": currency conversion and receipt scanning, citing https://www.splitwise.com/pro with an "as of" date
  - H2 "What Splitwise has that Side Badger doesn't": native apps, recurring bills, itemisation, search, charts, default splits
  - H2 "Moving your group over": there is no importer
  - H2 "Questions"
- **Required proof:** S07, C1, S10.
- **Links in:** pricing, features index.
- **Links out:** pricing, multiple currencies, how it works.
- **Claims:** `multi-currency`, `currency-conversion`, `receipt-scanning`, `privacy-posture`, [D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits).
- **Tone samples:** "Same idea, fewer paywalls." Never mock the competitor.

## Product imagery plan

### Approach

The app repository builds a capture script, kept separate from its test suites, as decided in [D14](#d14-product-imagery-comes-from-scripted-captures). This repository owns the shot list, the demo content, the optimization and the placement.

Capture setup, from the app's existing tooling:

- **Stack:** stills and clips C2 and C3 use the local test stack (`npm run stack:up -- test`); clip C1 uses the live stack in `compose.live.yaml` (see the receipt clip below).
- **Tenant:** tenants are chosen by host name, and nothing maps a Side Badger domain locally. Add the loopback domain `sidebadger.localhost` to the tenant with `ApiDriver.adminUpsertTenant` (`server/src/services/tenant/TenantRegistryService.ts`, `packages/test-support/src/stack-config.ts`). Chromium resolves every `.localhost` name to loopback, so no DNS entry or `--host-resolver-rules` flag is needed. Mapping `demo.sidebadger.me` with `--host-resolver-rules` was rejected because it borrows a public name that serves nothing.
- **Banner:** remove the red stack banner by overriding `__WARNING_BANNER`, which `compose.local.yaml` sets on every local stack.
- **Seeding:** seed through `packages/test-support/src/ApiDriver.ts`, never through the random generator in `scripts/dev/test-data-generator.ts`. That generator is not deterministic and uses Star Wars character names, which cannot appear in marketing.
- **Language:** set each capture user's language with `ApiDriver.updateUserProfile({ preferredLanguage })` before signing in (`webapp-v2/src/utils/languageDetection.ts`).
- **Receipt clip:** use the live stack (`compose.live.yaml`), where real Gemini reads the receipt and returns a description in the user's language. Local test stacks switch analysis off (`shouldAnalyzeAssetImages()` in `server/src/environment.ts`). The receipt is a purpose-made fictional one, not the fixture in `server/src/__tests__/fixtures/`, which shows a real-looking business name.
- **Branding:** the Side Badger tenant theme is light, with parallax and scroll-reveal motion. Wait for motion to settle, or use reduced motion, before each capture.
- **Manifest:** each capture is recorded with the app release, locale, viewport and seed version in a JSON manifest. A build check flags captures older than the latest app release that changed the screen.

### Demo content

- One fixed scenario per use case, matching the worked examples above: the night out, the housemates, the Lisbon and Japan trips, the gift, the couple.
- Names, group names and expense descriptions are translated per locale with the page copy and pass the same translation gate.
- Names are fictional and culturally plausible in each locale.
- Each locale's captures use an appropriate home currency (yen for `ja`, rupees for `hi`), with amounts matching that locale's worked examples and kept under the 999,999.99 cap ([D19](#d19-the-amount-cap-is-disclosed)). Screens about conversion (S07, C2, and the two-currency balances in S10) pair the home currency with a second currency that differs from it.
- **The homepage is not captured.** Its scenes are an illustrated story whose amounts and currencies, from the homepage plan's Japan-trip example group, are fixed in every locale. Real screenshots appear only on the feature, use-case and how-it-works pages, in per-locale home currencies as above.

### Shot list

| ID | Screen and state | App source | Pages |
|---|---|---|---|
| S01 | Dashboard: three groups with per-currency "You owe" and "You're owed", one pending invitation, quick actions open | `webapp-v2/src/pages/DashboardPage.tsx` | How it works |
| S02 | Create group with currency restrictions open | `webapp-v2/src/components/dashboard/CreateGroupModal.tsx`, `create-group-modal/CurrencyRestrictionsSection.tsx` | How it works, multiple currencies |
| S03 | Invite dialog, link tab: QR code and expiry choice | `webapp-v2/src/components/group/InviteModal.tsx`, `ViaLinkContent.tsx` | How it works, groups and permissions |
| S04 | Join preview, signed in | `webapp-v2/src/pages/JoinGroupPage.tsx` | Groups and permissions |
| S05 | Expense form, percentage split (rent by room size) | `webapp-v2/src/components/expense-form/SplitTypeSelector.tsx`, `SplitAmountInputs.tsx` | How it works, split expenses, housemates, couples |
| S06 | Expense form, exact amounts (the gift) | same | Split expenses, events and celebrations |
| S07 | Expense form converting yen to pounds, rate shown, "Edit rate" visible | `webapp-v2/src/components/expense-form/ExpenseConversionSection.tsx`, `ConversionResult.tsx` | Multiple currencies, group trips |
| S08 | Expense detail: "Originally entered as", receipt thumbnail, comments, reactions | `webapp-v2/src/components/expense/ExpenseDetailModal.tsx` | Split expenses, multiple currencies |
| S09 | Receipt scanning: "Analysing receipt…", then the filled form | `webapp-v2/src/components/expense-form/ExpenseBasicFields.tsx` | Receipt scanning |
| S10 | Balances: simplified debts in two currencies, "Show all" on | `webapp-v2/src/components/group/BalanceSummary.tsx` | How it works, settle up, multiple currencies, group trips, housemates, couples |
| S11 | Payment form with quick-settle buttons and the part-payment notice | `webapp-v2/src/components/settlements/SettlementForm.tsx`, `settlement-form/QuickSettleButtons.tsx` | How it works, settle up |
| S12 | Payment history with reactions | `webapp-v2/src/components/settlements/SettlementHistory.tsx` | Settle up |
| S13 | Group settings, security: presets and custom permissions | `webapp-v2/src/components/group/settings/security/PermissionPresetsSection.tsx`, `CustomPermissionsSection.tsx` | Groups and permissions, events and celebrations |
| S14 | Pending members awaiting approval | `webapp-v2/src/components/group/settings/security/PendingMembersSection.tsx` | Groups and permissions |
| S15 | Locked-group banner | `webapp-v2/src/pages/GroupDetailPage.tsx` | Groups and permissions |
| S16 | Shared shopping list with progress | `webapp-v2/src/components/group/lists/ListDetailModal.tsx` | Housemates, lists and polls |
| S17 | Closed poll with winner and vote counts | `webapp-v2/src/components/group/polls/PollDetailModal.tsx` | Group trips, events and celebrations, lists and polls |
| S18 | Expenses list with a "Questioned" badge and the "Only questioned" filter | `webapp-v2/src/components/group/ExpensesList.tsx`, `ExpenseItem.tsx` | Split expenses, housemates |
| S19 | Notifications dropdown with recent activity | `webapp-v2/src/components/layout/NotificationsDropdown.tsx` | How it works |
| S20 | Settings, "Add to Home Screen or Dock" | `webapp-v2/src/components/settings/InstallAppSection.tsx` | How it works |
| S21 | Group page in Arabic, mobile, right to left | `webapp-v2/src/pages/GroupDetailPage.tsx` | How it works |

| ID | Clip | Length | Pages |
|---|---|---|---|
| C1 | Upload a receipt photo, "Analysing receipt…", fields fill in | 6 to 8 s | Group trips, receipt scanning |
| C2 | Type a yen amount, choose pounds, the rate appears and the converted amount updates | about 5 s | Multiple currencies |
| C3 | Two windows side by side: one records a payment, the other's balance changes without a refresh | about 6 s | How it works, settle up |

### Localization

- Capture all 39 locales. The app's interface is fully translated, so English screenshots on a localized page would be untranslated fallback.
- Review right-to-left captures (`ar`, `fa`, `ur`) and long-string locales (`de`, `fi`, `hu`) by eye before release.
- Alt text describes what the image proves, for example "Balances showing two suggested payments in pounds and three in euros". It never transcribes the interface, and it is translated with the page.
- No text a reader needs is only inside an image.

### Formats and sizes

| Asset | Format | Dimensions | Budget |
|---|---|---|---|
| Desktop still | AVIF with WebP fallback through Astro's `<Picture>` | 1440×900 CSS px at 2× density; served at 480, 960 and 1440 px wide | 150 KB at the largest AVIF |
| Mobile still | AVIF with WebP fallback | 390×844 CSS px at 2× density; served at 390 and 780 px wide | 90 KB |
| Clip | WebM (AV1 or VP9) with MP4 (H.264) fallback, muted, `playsinline`, loop | 960 px wide desktop crop or 390 px mobile; 24 fps | 1 MB, 8 s maximum |
| Clip poster | AVIF | Same as clip | 60 KB |
| Social card | PNG | 1200×630, absolute URL, language-neutral artwork with the localized wordmark; the title is in `og:title`, not the image (restructure D27) | 200 KB |

- Set explicit width and height on every image, and lazy-load all but the first image on a page.
- Clips never autoplay under `prefers-reduced-motion`; they show the poster and a play button instead.
- Frames are a CSS border and radius, not a fake device bezel, so they stay crisp and work right to left.

## Pricing and promise

### What the evidence says

- **No paid tier exists or is planned in code.** There is no billing, plan or subscription code, and no Pro task.
- **The terms promise the present, not the future:** "The Service is currently provided free of charge. We reserve the right to introduce fees, subscriptions, or different service models in the future. If we do, we will provide you with reasonable notice of any changes" (`config/policies/terms-and-conditions.md` section 1).
- **Monetisation is reserved but not built.** The terms allow sponsored and affiliate offers (section 1.1), and the privacy policy allows promotional campaigns and affiliate data sharing (sections 3 and 4.7). The affiliate engine is a deferred task (`tasks/deferred/affiliate-recommendation-engine.md`).
- **Receipt scanning has a running cost.** The model lifecycle and pricing recheck is still open in `tasks/verify-receipt-scanning-production.md`, and there is no quota.
- **The real limits are specific,** from `packages/shared/src/constants.ts` unless noted:

  | Limit | Value |
  |---|---|
  | People per group | 50 |
  | Groups, expenses, payments | No set limit; no daily cap |
  | Amount per expense or payment | Up to 999,999.99 in its currency |
  | Currencies | 140 |
  | Receipts per expense | 3, each up to 10 MB (JPEG, PNG, WebP, HEIC, PDF) |
  | Attachments per comment | 3, each up to 5 MB |
  | Lists | 100 per group, 200 items each |
  | Polls | 50 per group, 2 to 10 options |
  | Receipt scans | No limit |
  | Automatic abuse protection | A per-account rate limit (1,000 changes a minute in production) that everyday use never approaches. The number is not published on the site. |

### Decision

[D2](#d2-the-pricing-promise-is-free-no-ads-no-daily-limits): "Free. No ads. No daily limits."

- Publish the limits table on the pricing page in place of "fair usage, and many other limitations apply".
- Answer "Will it always be free?" with: "Everything in Side Badger is free today, and there's no paid tier. If that ever changes, we'll give you notice first."
- Remove "free forever", "100% free and unlimited", "free until it isn't", the Pro card and its FAQ.

### Alternatives, best first

1. **Grandfathered promise:** "Everything you can do today stays free." This is the strongest trust signal against capped competitors and the best end state. It needs terms section 1 amended in the app repository, and it limits future charging for receipt scanning. Adopt it when the amendment lands.
2. **Current-state promise (adopted):** true today, matches the terms word for word, and needs no changes elsewhere. It is weaker than option 1 but defensible.
3. **"Free during early access":** honest only if an early-access programme existed, which it doesn't. It also signals an imminent charge. Rejected.
4. **"Free forever" with the joke disclaimer:** contradicts the terms and undermines itself. Rejected.

## White label

### Evidence

- The product is The Expense Hub: "a white-label bill splitting webapp and service" with its own core domain, `theexpensehub.com`, and its own welcome page in `website/index.html` (`README.md`).
- Side Badger is one tenant, alongside `default`, `localhost` and a `lumio` demo tenant whose app name is "expense share" (`config/tenants/*/config.json`).
- Tenants differ in branding, domains, legal names and footer links only, set through the admin tenant editor and `/settings/tenant/branding` (`webapp-v2/src/components/admin/TenantEditorModal.tsx`, `webapp-v2/src/pages/TenantBrandingPage.tsx`).
- Legal policies are shared by every tenant.
- The current Side Badger site never mentions white label; only this repository's `AGENTS.md` describes the app that way.

### Recommendation

[D4](#d4-white-label-stays-off-the-public-side-badger-site): keep white label off the Side Badger site.

- Side Badger is a consumer brand. A B2B offer would split the site's intent, dilute its search relevance and confuse visitors who want to split a dinner bill.
- B2B prospects belong on `theexpensehub.com`, which already exists for that purpose.
- One consequence for copy: because the policies are global, Side Badger pages must not promise anything Side Badger-specific about data handling beyond what those shared policies say.

## Measurement

### What exists today

- **The site:** no measurement of any kind. nginx keeps its default access log, which records visitor addresses, and turns logging off only for `/health` ((site) `nginx/default.conf`).
- **The edge:** the Snowmonkey edge keeps its own access log (`docs/deployment.md`, edge responsibilities).
- **The app:** no analytics. It logs requests and IP addresses for security, as its privacy policy says (section 2.2).
- **Promises:** the site promises "No analytics. No tracking pixels."
- **Third parties:** Google Fonts and jsDelivr requests on this site hand visitor addresses to third parties today.

### Design

1. **Search Console.** Use a domain property verified by DNS TXT record. DNS for `sidebadger.me` is managed with the Snowmonkey edge, outside this repository. Submit the sitemap, and record the baseline before the first release.
2. **First-party launch counter.**
   - Every launch link points to a fixed path on this site, for example `/go/register/?from=<page-id>&cta=<position>&lang=<locale>` or `/go/app/?…`.
   - nginx answers with a 302 to the fixed production URL, passing only `lang`.
   - These locations write to a separate log with a minimal format: time, target, `from`, `cta`, `lang`, and a bot flag computed from the user agent. The user agent itself, the IP address and the referrer are not stored.
   - Keep the raw log 30 days and keep daily totals indefinitely.
   - Add `Disallow: /go/` to `robots.txt` and `rel="nofollow"` on the links, so crawlers don't inflate counts.
   - The targets are fixed in the nginx config; there is no open redirect.
   - Any `add_header` in these locations must repeat the server-level headers, because nginx drops inherited headers when a location adds its own.
   - No cookie or personal data is involved, so no consent banner is needed.
3. **Sign-up totals.** Once a week, compare `/go/register/` clicks with the number of new accounts registered on the Side Badger tenant, from an aggregate database query in the app repository. Each user record holds the tenant they signed up on (`users.signup_tenant_id`, `server/migrations/0002_identity.sql:95`). This gives an approximate click-to-sign-up rate without linking any person to a click.
4. **Performance.** Use Lighthouse in the lab, and Chrome UX Report field data through PageSpeed Insights once traffic is enough. No real-user monitoring script.
5. **Third-party requests.** Self-host Inter, Space Grotesk and one Noto Sans subset each for the Arabic-script and Indic locales, use system fonts for Japanese, Chinese and Korean (restructure D24), and self-host the flag images. After that, the site makes no third-party requests and "No third-party trackers" holds for the site too.

### Alternatives considered

- **Self-hosted cookieless analytics** (Plausible or Umami): gives page-level funnels and engagement, but contradicts the current "No analytics" promise and needs policy changes. Revisit only if [D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter)'s reopen condition is met.
- **UTM parameters read by the app:** needs app changes to store attribution against accounts, which would be personal data. Rejected.
- **Edge access logs:** they hold IP addresses and are owned by another repository. Rejected as the primary source.

## Voice and editorial rules

The humour should make examples memorable while leaving money, privacy, limits, and security claims unambiguous.

### Voice

- Write like a capable friend who has previously survived a disastrous group holiday spreadsheet.
- Use short dry asides, specific situations, and restrained badger references.
- Let headings and examples carry most of the humour.
- Keep calls to action plain enough that visitors know where they lead.

### Example use-case angles

- **Housemates:** "For the housemate who buys toilet roll, and the housemate who somehow never sees it happen."
- **Group trips:** "Track the villa, the taxi, and the one cocktail round nobody remembers volunteering to buy."
- **Couples:** "Share the boring costs without turning date night into a quarterly finance review."
- **Events and celebrations:** "Split deposits, decorations, and emergency umbrellas. Leave the seating plan to someone braver."

The clubs-and-teams angle is retired with the page ([D9](#d9-use-cases)). Final copy uses only scenarios the registry supports.

### Guardrails

- Do not hide limits or qualifications inside jokes.
- Avoid jokes at the expense of people who owe money or have less money.
- Avoid repeating the badger motif in every section.
- Prefer demonstrable facts over broad superlatives.
- Translate the intent and joke rather than translating word for word.
- Never invent testimonials, ratings, user counts or press mentions.
- Name competitors only on the comparison page, and only with dated facts from their own pages.

### Approved substitutions

| Instead of | Write |
|---|---|
| Free forever / 100% free and unlimited | Free. No ads. No daily limits. |
| Zero tracking / no tracking / privacy first | No ads or third-party trackers |
| Your data stays yours | (no substitute; don't make the claim) |
| Settle with a single tap / pay back | Record a payment |
| The fewest payments / minimise | Fewer payments / a short list of payments |
| Real-time rates / live rates | A current exchange rate, which you can change |
| Any currency | 140 currencies |
| Join instantly | Join with a link or QR code |
| AI extracts the details accurately | Fills in the details for you to check |
| Instant notifications | Updates appear in the app straight away |
| Add friends | Invite people to a group |
| Coming soon | (nothing; describe what exists) |

## Content model

Create a typed content registry (`src/data/features.ts`) before building pages. It gives the feature list a clear destination and prevents unsupported marketing claims. The [product feature registry](#product-feature-registry) above is its first content.

Each feature record should contain:

- stable ID and proposed slug of its home page;
- plain-English capability statement;
- user problem solved;
- primary and secondary audiences;
- status: available, beta, planned, retired, or tenant-dependent; capabilities the app lacks are recorded with status "not offered";
- confidence (high, medium, low) and the evidence paths, with the app commit they were read at;
- limits and prerequisites;
- proof available: shot and clip IDs, documentation, or worked example;
- related features and use cases;
- search language to validate during keyword research;
- approved claims, each with its own ID, and wording that is not approved;
- release wave and any gate, for example [D10](#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)'s quality evidence.

Each page's content file lists the claim IDs it uses. A build check fails when a page uses a claim whose feature is not available, or a claim ID that does not exist. A second check fails when a page body contains a phrase from the "Instead of" column of [Approved substitutions](#approved-substitutions). Each cell splits at "/" into separate phrases, matched case-insensitively.

Keep short interface labels in `src/i18n/*.ts`. Long page copy lives in Astro content collections of YAML files, one file per page per locale, validated by Zod schemas, with each translation's English source recorded as a hash so stale translations fail the tests (restructure D11 and D14). This is easier to review than hundreds of long strings in each translation file, and the schemas enforce the same structure in all 39 locales. The feature registry itself is a typed module, `src/data/features.ts` (restructure D16), not a content collection.

## Follow-ups outside this repository

These belong to the app repository or the owner. This task cannot change them. Each needs its own task there, per the bug-handling rules in [the restructure task](./restructure-marketing-site.md#bug-handling).

1. **Privacy policy processors:** the policy names only "Google Firebase: Cloud hosting, authentication, and database services". It should name Firebase Authentication, Vertex AI (receipt images), Cloudflare Turnstile, Postmark, Google Fonts and the exchange-rate service, and drop "hosting and database" (`config/policies/privacy-policy.md` section 4.2). It also never names the company that controls the data.
2. **Terms section 7.1:** it forbids non-financial communication, while the app ships lists and polls for group planning. Amend it to allow group planning ([D11](#d11-lists-and-polls-are-framed-around-shared-spending)).
3. **Terms section 8.4:** users are asked not to post negative comments publicly. Have it legally reviewed before the site ever shows reviews.
4. **Terms section 1:** amend it if the grandfathered free promise is wanted ([Pricing and promise](#pricing-and-promise), option 1).
5. **Currency-aware amount cap:** 999,999.99 rupiah is under £50 ([D19](#d19-the-amount-cap-is-disclosed)).
6. **Hard-coded app footer:** every tenant shows "© 2025 Pomo Corp ltd." (`webapp-v2/src/locales/en/translation.json`, `footer.copyright`).
7. **Footer links:** the Side Badger tenant's footer links point at `sidebadger.com` rather than the canonical `sidebadger.me` (`config/tenants/sidebadger/config.json`).
8. **Security tab:** it appears to non-admin members of open groups, whose changes the server then rejects. This is a low-confidence finding to verify (`webapp-v2/src/pages/group-detail/GroupDetailModals.tsx`, `server/src/services/GroupService.ts`).
9. **Capture script and demo scenario** ([D14](#d14-product-imagery-comes-from-scripted-captures)).
10. **Weekly aggregate sign-up count** for the Side Badger tenant ([Measurement](#measurement)).
11. **Stale string:** the group-name error says "less than 50 characters"; the limit is 100.

This repository's own follow-up, `AGENTS.md` still naming staging as the app host, is part of the restructure task's P19.

## Delivery

The phased work plan, first-release boundary and external dependencies are tracked in [the restructure task](./restructure-marketing-site.md). The English site is built and verified first, and every locale is translated once at the end (restructure D38). The first-release page set is fixed by [D7](#d7-page-set-and-release-order). Release-2 pages follow the 8-week review, each subject to its gate.

## Success measures

Review at 4, 8, and 12 weeks after release:

- valid indexed pages versus submitted pages;
- non-branded impressions and clicks by landing page;
- rankings for the intended query clusters, compared with each brief's hypotheses;
- launch-counter clicks by page and position, and weekly sign-ups on the Side Badger tenant;
- page speed and Core Web Vitals;
- translation and crawl errors;
- pages with impressions but poor click-through, and pages with traffic but few launch clicks.

Clip and screenshot engagement is not measured, because measuring it would need a client-side script ([D5](#d5-measurement-uses-search-console-and-a-first-party-launch-counter)).

Traffic alone is not the goal. A successful page attracts a relevant visitor, answers their question accurately, and sends an informed user into the app.
