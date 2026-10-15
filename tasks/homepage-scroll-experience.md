# Build the homepage scroll experience

## Status

Planning complete and settled, with no owner inputs outstanding. Copy, claims, use-case worlds, links and imagery follow [the site plan](./seo-site-expansion-plan.md) (decisions D1 to D19 and the feature registry), and [Recorded decisions](#recorded-decisions) lists the consequences. The direction is chosen: **Everything on the table** (see [Chosen direction](#chosen-direction)). The animation approach is chosen: native CSS scroll-driven animations with a small script fallback (see [Animation technology](#animation-technology)). The next step is build H1, a throwaway prototype of the debt-simplification scene. It checks the feel and can adjust details; it does not reopen the direction.

## Objective

Replace the current homepage with a scroll-driven story that is very visually pleasing, explains Side Badger quickly, and routes visitors into deeper pages and the app.

This is the homepage item in step 6 of [the marketing site restructure](./restructure-marketing-site.md). The homepage's responsibilities, voice, and editorial guardrails are defined in [the site plan](./seo-site-expansion-plan.md#homepage).

The finished homepage should:

- feel alive: the world transforms scene by scene as the visitor scrolls, with playful animations showing use cases and features in action rather than a wall of feature cards;
- answer what Side Badger is, who it helps, why it is different, and what to do next;
- send each scene to the page that covers it in depth, and every visitor towards the app;
- stay accessible, localized, fast, and complete with motion turned off.

## Dependencies

These come from the restructure task and are scheduled in its [joint schedule](./restructure-marketing-site.md#joint-schedule-with-the-homepage-task). A homepage package waits for the restructure package it needs rather than doing that work itself.

- **Lighthouse and Core Web Vitals baseline** (step 1): recorded in [baseline measurements](./baseline-measurements.md) at `bc01126`. Compare against that file, not against the local observations below.
- **Head and JSON-LD** (step 2, P12): the homepage `SoftwareApplication` reaches the built page through `BaseLayout`'s `jsonLd` prop, which joins the page's `@graph`. Today `BaseLayout.astro` renders no head slot, so the homepage schema is dropped.
- **Feature status** (steps 3 and 4): the site plan's [feature registry](./seo-site-expansion-plan.md#product-feature-registry) is the approved source. Depict only features whose registry status is `available`, and name registry IDs wherever this file names a feature. Never depict the items under [What Side Badger does not do](./seo-site-expansion-plan.md#what-side-badger-does-not-do) or any `comingSoon.*` item ([site plan D12](./seo-site-expansion-plan.md#d12-no-roadmap-on-the-public-site)). H5's `src/components/home/data/home-features.ts` lists the depicted IDs. Once the typed registry (`src/data/features.ts`, restructure D16) exists, H13 makes that file import from it and adds a test that fails if a depicted ID is not `available`.
- **Pricing promise** ([site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits), decided): the hero line, the pricing scene and the `offers` block in the JSON-LD (price 0) use “Free. No ads. No daily limits.” `meta.description` reads “Free bill splitting with no ads, no daily limits and no third-party trackers.” Never “free forever”.
- **Launch redirect** (restructure step 2, per [site plan D1](./seo-site-expansion-plan.md#d1-launch-links-go-to-production) and [site plan D5](./seo-site-expansion-plan.md#d5-measurement-uses-search-console-and-a-first-party-launch-counter)): `/go/register/` and `/go/app/` are first-party redirects counted in nginx. This task depends on them and does not implement them. Every link to the app is built with `launchHref()` (P11) or `LaunchAppCta` (P23), never as a hard-coded URL, and no scene links straight to the app host.
- **Navigation shell** (step 5): the sticky scene stages sit below the header, so they read its height from `--header-h`. Scenes can be built before the shell lands, using a fallback height. Final screenshots wait for the shell, and localized ones for the W4 translation (restructure D38).
- **Deeper pages** (step 6): the first-release pages are `/how-it-works/`, `/features/split-expenses/`, `/features/settle-up/`, `/features/multiple-currencies/`, `/use-cases/group-trips/`, `/use-cases/housemates/`, `/use-cases/events-and-celebrations/` and `/pricing/` ([site plan D7](./seo-site-expansion-plan.md#d7-page-set-and-release-order)). A scene links to its page once that page is published, read from the restructure's page registry. Until then, the scene's call to action leads to the app through `/go/app/`. Release-2 pages (`/use-cases/couples/`, `/features/groups-and-permissions/`, `/features/receipt-scanning/`, `/features/lists-and-polls/`) are linked only once published. Do not publish placeholder pages to satisfy a link.
- **Shared files**: `BaseLayout.astro`, `global.css`, `tokens.css`, `package.json`, `src/i18n/en.ts`, the locale files, and `src/__tests__/translations.test.ts` are also changed by the restructure. One holder per file at any moment, in the order given by the restructure task's [Shared files and serialization](./restructure-marketing-site.md#shared-files-and-serialization) table. See [Agent execution plan](#agent-execution-plan) for how this file's packages map to the joint schedule.

## Story outline

The workshop kept the nine scenes and threaded one example group through scenes 2 to 6: five friends on a trip to Japan. Their expenses feed the currency scene and the debt-simplification centrepiece, so the numbers add up from scene to scene. The data is in [The example group](#the-example-group).

1. **Chaos.** Crumpled receipts, a doomed group-holiday spreadsheet, a group chat full of “who paid for the taxi?”. Scrolling begins to pull it into order. The headline, a one-line explanation, the audience, and the call to action are all visible in the first viewport, so the page answers what, who, why, and what next before any scrolling.
2. **A group forms.** An invite link or QR code goes out and five people drop in.
3. **Expenses land.** Split equally, by exact amounts, or by percentage. A receipt is photographed and its details lift themselves out of the image, for the visitor to check.
4. **Currencies collide.** Yen, dollars, and euros convert into the group's currency at a current exchange rate, which can be edited.
5. **The tangle.** Nineteen IOUs net down to ten debts, then to three payments. This is the centrepiece.
6. **Settle up.** A payment is recorded, the history fills, emoji reactions appear, and the site celebrates.
7. **Worlds.** A horizontal strip on desktop, in which each of the four use cases is its own table with its own palette and props, and the same group and expense mechanics play out on it.
8. **Trust.** No ads, no third-party trackers, no selling of personal data ([site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies)). Short and visual.
9. **Pricing promise and launch call to action.** “Free. No ads. No daily limits.” ([site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits)).

### Use-case worlds

Four worlds, matching the site plan's page set ([site plan D7](./seo-site-expansion-plan.md#d7-page-set-and-release-order), [site plan D9](./seo-site-expansion-plan.md#d9-use-cases)). Each world depicts only registry features whose status is `available`, using the pairings in the use-case page briefs. Chip labels reuse the existing `features.*.title` keys. Clubs, teams, and work is dropped, and school trips and children's activities appear nowhere (adults only).

| World | Persona | Example situations | Features depicted (registry ID) | Link |
|-------|---------|--------------------|---------------------------------|------|
| Housemates | The organised one in a four-person flatshare | Rent, electricity, shared groceries, the toilet roll nobody else buys | `lists`, `balances`, `settlements` | `/use-cases/housemates/` |
| Couples | Two incomes, one flat, one weekly shop | Rent split 60/40 by income, the weekly shop, the Friday takeaway | `expense-splitting` (percentage), `balances` | `/go/app/` until `/use-cases/couples/` (release 2) is published |
| Group trips | The friend who booked the villa on their own card | The villa, the taxis, the cocktail round nobody remembers buying, a stag or hen weekend, voting on the villa | `multi-currency`, `currency-conversion`, `receipt-scanning`, `polls` | `/use-cases/group-trips/` |
| Events and celebrations | The organiser holding the venue deposit | Venue deposits, decorations, group presents | `polls`, `comments`, `reactions`, `invites` | `/use-cases/events-and-celebrations/` |

**Couples decision.** Couples appears as a world now. The registry supports it (`expense-splitting`, `balances`, `settlements`, `privacy-posture`), and the site plan lists it among the four approved use cases for the homepage. Its page is release 2, so the world's link goes to `/go/app/` until `/use-cases/couples/` is published, and switches automatically when the registry marks it published. The events world never jokes about who chipped in less.

## Current-state audit

Reviewed from the source and a production build on 14 October 2026.

### What the homepage does now

The homepage is a stack of card grids, each revealed by a fade-up animation:

1. A hero with a rotating “100% free and unlimited*” stamp and the `h1` “Split expenses like a side badger”. Below it is a typewriter that cycles ten phrases, the static line “Free forever”, and a “...sidebadger me” button to the app. The badger logo image tilts with the mouse.
2. “What's it for?”: 13 use-case cards behind four filter pills. Eight of the cards are hidden with inline `display: none`.
3. “Inside Side Badger”: three numbered steps holding 16 feature cards, which tilt in 3D on hover.
4. “Little Things That Matter”: nine cards, most of them release-note copy (focus traps, return URLs, pagination).
5. “Coming Soon”: export and native apps.
6. “Why is it free?”: three cards.
7. A call-to-action card, then a disclaimer: “It's free until it isn't.”

Buttons ripple, and calls to action fire confetti.

`BaseLayout.astro` adds four effects to every page:

- **`CanopyBloom`** is pure CSS: a fixed full-screen gradient, three sun beams, three petals, mist, and grain. All of them run infinite animations. A scroll listener writes `--scroll-progress` onto `<html>` on every scroll event to drive its parallax.
- **`FloatingParticles`** uses tsParticles to draw 8 to 12 rising dots that bubble on hover and pop with confetti on click. It loads with a top-level `await`.
- **`MagicalCursor`** is a full-screen canvas trail plus a glow. Its `requestAnimationFrame` loop runs forever, even when the mouse is still.
- **`EasterEggs`**:
  - the Konami code makes it rain badgers;
  - seven clicks on the logo set off a wobble and confetti;
  - typing “disco” starts disco mode;
  - five clicks on the footer show a thank-you message.

`CausticRipples.astro` and the `glass-layer-1/2/3` classes named in `AGENTS.md` no longer exist. The restructure's P19 removes them from `AGENTS.md`, and H14 adds the new homepage structure.

### Weight

The sizes below come from `dist/_astro` after `npm run build`. Gzip figures use `gzip -9`. Brotli at the edge will be slightly smaller.

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `FloatingParticles` chunk (tsParticles) | 148.1 KB | 42.6 KB | Loaded on every page |
| `canvas-confetti` | 10.7 KB | 4.3 KB | Statically imported by the homepage, `EasterEggs`, and `FloatingParticles` |
| Homepage script | 2.8 KB | 1.3 KB | Typewriter, filters, tilt, ripple, confetti |
| `EasterEggs` script | 2.1 KB | 1.0 KB | |
| Inline scripts (`BaseLayout`, `MagicalCursor`) | about 4 KB | — | Inlined into the HTML |
| Site CSS (global, layout, components) | 21.7 KB | 5.4 KB | |
| Homepage CSS | 8.7 KB | 2.1 KB | |
| Google Fonts CSS | 364 KB decoded | 91 KB transferred | Chained `@import` from `global.css`, so render-blocking. Every locale downloads the Japanese and Arabic `@font-face` rules. |
| `dist/index.html` | 75.2 KB | 13.4 KB | About 1,078 words |
| Images | | | `logo-transparent-small.png` 35 KB; `logo-face-only-large.png` 18 KB with no width or height; the language switcher eagerly loads a 211 KB `iran.png` on every page |

The homepage loads about 49 KB of JavaScript gzipped (about 168 KB raw), and almost 87% of it draws 12 dots.

A local lab run is not the baseline, but it shows where the risks are. In Chromium on `astro preview`, unthrottled, at a 1366×850 viewport:

- **LCP was the `h1`, at about 4.0 s.** The hero starts inside `.fade-up` (opacity 0 and blurred until an IntersectionObserver fires, then a 600 ms transition), behind the font `@import` chain.
- **CLS was 0.18.** The causes are the typewriter changing line length, the font swap, and the hero image having no dimensions.

### Defects found

These affect the new homepage. The packages named below fix them.

1. `html` and `body` both set `overflow-x: hidden`, which makes `body` a scroll container. That breaks `position: sticky` and makes `body`, which never scrolls, the nearest scroller for view timelines. Replace it with `overflow-x: clip`. H1 confirmed it: with `overflow-x: hidden` on `html` and `body` the stage scrolls away and the timeline freezes, while `clip` behaves like `visible`. H4 fixes it.
2. `homepage.css` uses undefined tokens (`--space-6xl`, `--text-6xl`, `--accent-dark`, `--border-subtle`, `--radius-2xl`), so those declarations are silently dropped. The file is retired.
3. White text on the primary button gradient (`#22c55e` to `#86efac`) has a contrast of 2.3:1 down to 1.4:1. Links in `#16a34a` on `#f0fdf4` reach 3.15:1. Both fail WCAG AA for normal text.
4. The `h1` line height of 1.05 clips Devanagari, Bengali, and Telugu marks. Only `ja` and `ar` get script fonts; `fa`, `ur`, `hi`, `bn`, `te`, `zh`, and `ko` fall back to system fonts. Space Grotesk has no Cyrillic or Greek, so `uk`, `sr`, and `el` headings fall back too.
5. The hero stamp overlaps the header at desktop width and claims “100% free and unlimited”. The disclaimer “It's free until it isn't” contradicts it.
6. Screen readers announce the typewriter as changing text, and it causes layout shift.
7. Two English claims overstate the app:
   - `features.settle` says “Settle debts with a single tap”, but the app pre-fills a settlement form that still needs “Record settlement”.
   - `features.balances` says debts “minimize the number of payments”, but the app uses a greedy match, which needs at most one fewer payment than there are members but is not guaranteed minimal.

   The new copy avoids both claims. The site plan's registry settles the wording: “record a payment” and “fewer payments” ([site plan D15](./seo-site-expansion-plan.md#d15-debt-and-settlement-wording)).
8. The `EasterEggs` secret message is white text on a 25% white glass panel, which is unreadable on the light page.

### What to keep, rework, or retire

| Item | Decision | Reason |
|------|----------|--------|
| Logo green `#6AA864` and teal `#508C96` | Keep and promote | The two-colour split face is the product in one image. It becomes the “two halves meet” motif in the final scene. |
| Glass tokens (`--glass-bg`, `--glass-border`) | Rework | Keep them for the header and for app-UI mock-ups, since the real app uses frosted panels. Stop using them on every card. |
| `CanopyBloom` | Retire site-wide | Fixed full-screen infinite animations and a page-wide style write on every scroll event. It does not fit the new direction. |
| `FloatingParticles` and the `tsparticles` and `@tsparticles/slim` dependencies | Retire site-wide | 42.6 KB gzipped for 12 dots. Click-to-pop goes with them. |
| `MagicalCursor` | Retire site-wide | A permanent full-screen animation loop with no content value. |
| `canvas-confetti` | Keep, load lazily | Used by the settle scene, calls to action, and easter eggs. Load it only when first triggered. |
| `EasterEggs` | Keep | Load confetti lazily and fix the message contrast. Konami, logo, disco, and footer eggs must keep working. |
| `.fade-up` and the IntersectionObserver in `BaseLayout` | Retire on the homepage | Never hide the LCP element. Pricing and policy pages keep them until the shell restyle. |
| Typewriter, filter pills, 3D tilt, button ripple, hero mouse parallax | Retire | They cause layout shift and accessibility problems, and the scenes replace them. |
| Space Grotesk headings and Inter body text | Keep for Latin scripts | Add per-script font stacks. Self-host the fonts (see [Performance strategy](#performance-strategy)). |
| Dry voice lines such as “No drama” | Keep | Reuse them in the new copy where they fit. |

### What the real app looks like

The scenes depict the product, so they borrow the real interface. The source is the Side Badger tenant in `wl-bill-splitter` (`config/tenants/sidebadger/config.json` and `webapp-v2/src`).

- **Stack:** Postgres with the app's own API. Firebase is used only for sign-in. Nothing on the page describes the app as a Firebase application.
- **Theme:** light only. The base surface is `#F0FDF4` and raised surfaces are `#FFFFFF`.
  - Primary `#16A34A`, hover `#15803D`.
  - Text `#1F2937`, secondary text `#4B5563`.
  - Amounts you owe `#DC2626`, amounts owed to you `#16A34A`.
- **Shape and type:** Inter, radius 6, 10, and 16 px, and frosted glass panels.
- **Split types:** exactly three: Equally, Exact amounts, Percentage. There is no shares split.
- **Balances:** shown per currency as rows reading “[avatar] owes **amount** to [avatar]”. When every debt is cleared, the list shows “All settled up!”.
- **Debt simplification** (`server/src/utils/debtSimplifier.ts`):
  - It is a two-pointer greedy match: the largest debtor pays the largest creditor.
  - It runs strictly per currency. Balances in different currencies are never netted together.
  - A group gets one balance only when each expense is converted into the group currency as it is entered.
- **Exchange rates:** come from an in-house rate service. The app fetches a current rate, which is fixed when the expense is saved, and records whether it came from the service or was entered by hand. The conversion note reads “converted GBP to EUR at rate of …” and the rate can be edited.
- **AI receipt scanning:** shows “Analysing receipt...” while it runs. It fills in the description, total, currency, date, time, and place for the user to check, and puts a text copy of the receipt in the notes. It does not assign line items to people. Receipt images are read by Google's AI service ([site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)).
- **Settling up:**
  - Quick-settle buttons pre-fill payer, payee, amount, and currency. “Record settlement” then saves a payment record. No money moves.
  - There is no confetti in the app, so any celebration belongs to the marketing site, outside the device frame.
- **Reactions:** 👍 ❤️ 😂 😮 😢 🎉 on expenses, comments, and settlements.
- **Invites:** a copyable link plus a QR code (“Or scan this code”), expiring after 15 minutes, 1 hour, 1 day, or 5 days.
- **Other features:**
  - Polls with “Cast your vote” and anonymous voting.
  - Lists with an “x of y” progress count.
  - Permission presets “Open collaboration” and “Managed group”.
- **Usable imagery:** none yet. The only screenshots in that repo use the grey default tenant and a “dev1” banner. Tenant assets that could help include `og-image.png` (1200×630) and the seed group header photos in `scripts/dev/group-backgrounds/`.

## Creative directions

Three distinct directions were drawn up. All three share the same text, links, headings, and accessibility structure, which are described once in [Scene content shared by every direction](#scene-content-shared-by-every-direction). They differ in metaphor, look, and motion.

### Scene content shared by every direction

The copy below is an English first draft. The final English is fixed in H2 and reviewed against [the voice rules](./seo-site-expansion-plan.md#voice-and-editorial-rules) and the site plan's [approved substitutions](./seo-site-expansion-plan.md#approved-substitutions). Every string is HTML text from `t()`; none is baked into an image. Props that carry jokes, such as chat bubbles and sticky notes, are translated but marked `aria-hidden="true"` because they are decoration.

“`/go/app/`” and “`/go/register/`” in the links column are the first-party launch redirects ([site plan D1](./seo-site-expansion-plan.md#d1-launch-links-go-to-production), [site plan D5](./seo-site-expansion-plan.md#d5-measurement-uses-search-console-and-a-first-party-launch-counter)). Each carries `from=home`, the position (`cta=hero`, `cta=scene-<id>`, `cta=final`) and `lang=<locale>`, and has `rel="nofollow"`; the helpers add all of this. While a deeper page is unpublished, the scene's link uses the shared key `home.scene.tryInApp` (“Try it in Side Badger”) and goes to `/go/app/`. The sign-up buttons are “Create a free account” and go to `/go/register/`.

| # | Scene (`id`) | Headings | Visible text (draft) | Link: until published → first-release page |
|---|--------------|----------|----------------------|---------------------------|
| 1 | Chaos (`top`) | `h1` | `h1` “Split group costs without the drama.” Lede: “Side Badger tracks who paid for what, in 140 currencies, and suggests who pays whom, so your group settles up in fewer payments.” Audience: “For housemates, couples, trips, and celebrations.” Pricing line: “Free. No ads. No daily limits.” ([site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits)) | Primary “Create a free account” → `/go/register/`. Secondary “See how it works” → `#group` → `/how-it-works/`. The pricing line links to `/pricing/`. |
| 2 | Group forms (`group`) | `h2` | “Start a group. Share a link.” / “Invite people with a link or a QR code. All you need is an email address.” | `/go/app/` → `/how-it-works/` (create a group, invite your people). `/features/groups-and-permissions/` is release 2 and is added once published. |
| 3 | Expenses land (`expenses`) | `h2` | “Add an expense. Split it your way.” / “Split equally, by exact amounts, or by percentage. Snap a receipt and Side Badger fills in the total, date and place for you to check.” Fine print: “Receipt images are read by Google's AI service.” ([site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)) | `/go/app/` → `/features/split-expenses/`. A second link to `/features/receipt-scanning/` (release 2) is added once published. |
| 4 | Currencies (`currencies`) | `h2` | “Yen, dollars, euros. Sorted.” / “Add each expense in the currency you paid in. Side Badger converts it into the group's currency at a current exchange rate, and you can change the rate to the one you actually got. The original amount stays on the expense.” Fine print: “Example rates for illustration.” | `/go/app/` → `/features/multiple-currencies/` |
| 5 | The tangle (`tangle`) | `h2`, then `h3` for “after” | “Untangle who owes whom” / “Five friends and five expenses leave ten debts between them. Side Badger adds up everyone's balance and suggests three payments that settle the lot.” Four step captions, the payments list, and the “Show all 10 debts” disclosure. See [The tangle in detail](#the-tangle-in-detail). | `/go/app/` → `/features/settle-up/` |
| 6 | Settle up (`settle`) | `h2` | “Settle up, then move on.” / “Pay each other however you like, then record the payment. Everyone sees the payment history, and anyone can react.” | `/go/app/` → `/features/settle-up/` |
| 7 | Worlds (`worlds`) | `h2`, one `h3` per world | Title and intro, then for each world a title, a one-line situation, two prop labels, and feature chips (existing `features.*.title` keys) | Housemates → `/use-cases/housemates/`, group trips → `/use-cases/group-trips/`, events → `/use-cases/events-and-celebrations/`, each from `/go/app/` until published. Couples: `/go/app/` until `/use-cases/couples/` (release 2) is published. |
| 8 | Trust (`trust`) | `h2`, three `h3` | “Built with your privacy in mind” (revised 2026-10-15, replacing “Only your group sees your group.”). Three items: “No ads”, “No ad or analytics trackers”, “We don't sell your personal data”, one line each ([site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies)) | `/privacy/` (published now) |
| 9 | Pricing and call to action (`start`) | two `h2` | Pricing promise “Free. No ads. No daily limits.” ([site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits)), then “Ready when your group is.” / “Create an account, start a group, and send the link.” | “See pricing” → `/pricing/`. “Create a free account” → `/go/register/` |

Shared rules for every scene:

- Each scene is a `<section>` labelled by its heading, in reading order. Text that animates in stays in the accessibility tree; only decoration is hidden.
- Links never animate their opacity. They are visible and focusable at every stage.
- There is one `h1`, then one `h2` per scene, then `h3` inside scenes.
- Scenes start their animation only when they come near the viewport.
- Wording follows the site plan's [approved substitutions](./seo-site-expansion-plan.md#approved-substitutions): “fewer payments” (never “fewest” or “minimise”), “record a payment” (never “one tap” or “settle with a tap”, because no money moves), “a current exchange rate” (never “live” or “real-time”), “140 currencies” (never “any currency”), and only the [site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies) trust claims. “Free forever” is never used.

**Registry IDs depicted.** The `available` features each scene shows. `home-features.ts` is built from this list, and the JSON-LD `featureList` comes from it.

| Scene | Registry IDs |
|-------|--------------|
| 1 Chaos | `multi-currency`, `balances` (in the lede only) |
| 2 Group forms | `groups`, `invites`, `accounts` |
| 3 Expenses land | `expense-splitting`, `receipt-scanning` ([site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)) |
| 4 Currencies | `multi-currency`, `currency-conversion` |
| 5 The tangle | `balances` |
| 6 Settle up | `settlements`, `reactions` |
| 7 Worlds | Housemates: `lists`, `balances`, `settlements`. Couples: `expense-splitting`, `balances`. Group trips: `multi-currency`, `currency-conversion`, `receipt-scanning`, `polls`. Events: `polls`, `comments`, `reactions`, `invites` |
| 8 Trust | `privacy-posture` |
| 9 Pricing and call to action | None. The [site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise |

### Direction A: everything on the table

**Visual metaphor.** The page is one long table seen from directly above, like flat-lay photography drawn as paper craft. Group life spills across it: crumpled receipts, sticky notes, a printed spreadsheet with a coffee ring, a phone buzzing with the group chat. Scrolling moves the camera down the table and tidies whatever it passes: paper flattens, straightens, and snaps into neat app cards. The centrepiece is a detective-style corkboard of red string between five polaroids, which untangles into three green threads. In the worlds strip the table changes: a kitchen table, a dining table, a beach towel, a wedding tablecloth. The underlying idea is that every group has a table.

**Motion language.** Paper physics. Props lift (shadow grows, scale 1.02), rotate to 0°, slide, and snap into place with a small overshoot. Stamps land with a quick scale from 1.15 to 1. Threads draw and undraw with `stroke-dashoffset`. Highlighter swipes grow from the inline-start edge. Most movement is `transform` and `opacity`; only threads use dash offsets.

| Token | Value |
|-------|-------|
| Paper ease | `cubic-bezier(.2, .8, .2, 1)` |
| Snap ease | `cubic-bezier(.34, 1.56, .64, 1)` |
| Thread ease | `cubic-bezier(.65, 0, .35, 1)` |
| Fallback stage transition | 700 ms |
| Stamp | 250 ms |

**Palette.** Every text pair meets WCAG AA. The ratios are listed.

| Role | Light | Dark (table under a lamp) |
|------|-------|---------------------------|
| Table (page background) | `#F4EEE2` | `#1C2321` |
| Paper props | `#FFFDF8` | `#E9E2D3` (paper stays light under the lamp) |
| Kraft and cork | `#E9DCC3` | `#3A3229` |
| Ink (text) | `#1D2B24` (12.8:1 on table) | `#EEEAE1` (13.3:1) |
| Muted ink | `#4E5A52` (6.3:1) | `#B4B9B0` (8.0:1) |
| Brand green, fills and logo | `#6AA864` | `#6AA864` |
| Green ink: links and button background | `#2F6B2E` (5.6:1 on table; white button text 6.4:1) | `#93CF8C` (8.8:1; button text `#0E1A12`) |
| Brand teal, fills | `#508C96` | `#508C96` |
| Teal ink | `#2B6670` (5.6:1) | `#86C2CB` |
| Thread red, debts | `#C8433A` as a graphic (3.6:1 on cork); `#B3362E` as text (5.2:1) | `#F07A6E` |
| Sticky notes | `#FFE58A`, `#F9C6CF` | `#E8CF6A`, `#D9A5AE` |
| App UI inside device frames | The real app tokens: `#16A34A`, `#15803D`, `#1F2937`, `#FFFFFF`, `#F0FDF4`, `#DC2626` | Unchanged, because the app is light-only and a phone screen stays lit |

Each world gets its own table:

| World | Surface and props (light) | Accent ink |
|-------|---------------------------|------------|
| Housemates | Pine `#EAD9B5` with magnets in `#D6553F` | `#1D2B24` |
| Couples | Linen `#F3E6E0` | Plum `#7A3E66` |
| Group trips | Beach towel: sand `#F6E3B4` with coral `#F28C6B` stripes | Sea `#1D5F78` |
| Events and celebrations | Tablecloth `#FAF8F5` with gold `#C9A227` and blush `#F4C7CF` | `#1D2B24` |

**Typography.**

- Headings use Space Grotesk 600 in Latin scripts (the weight restructure D24 preloads) and Inter 700 in Cyrillic and Greek. Body text uses Inter.
- Arabic-script and Indic locales use Noto Sans in the matching script. Japanese, Chinese and Korean use system font stacks with no webfont (restructure D24). See [Right to left and scripts](#right-to-left-and-scripts).
- There is no handwriting font, because none covers the 39 locales. The handwritten feel comes from SVG doodles drawn around ordinary HTML text: circles, underlines, arrows.

**How each scene turns into the next.** Each scene's end state becomes the next scene's starting prop, so the camera never cuts:

1. The hero's pile of tidied paper becomes the group's place card.
2. The seated group receives its expense receipts.
3. The expense cards feed the currency tape.
4. The stamped cards are pinned to the corkboard.
5. The green threads turn into bank slips for settling up.
6. The settled table slides sideways into the worlds strip, and the first world is the same table restyled.
7. The table is cleared for the trust stamps.
8. The last receipt sits beside the final call to action.

**Storyboard.** “Runway” is how far the page scrolls while a scene's stage stays pinned, as desktop / phone. “Entry” means not pinned: the scene animates once while entering the viewport.

| Scene | Runway | Start | Middle | End | Phone layout | Reduced-motion frame | Right to left |
|-------|--------|-------|--------|-----|--------------|----------------------|---------------|
| 1 Chaos | 100vh, unpinned / entry | The messy table: three receipts (“Taxi”, “Groceries”, “Villa deposit”), a spreadsheet with “TOTAL: ???”, the sticky note “Ben owes me for… something?”, and a phone showing three chat bubbles. Props breathe gently for at most 5 s. The copy sits in a clear patch of table. | As the hero scrolls out, props straighten, slide towards the centre line, and the spreadsheet folds away | A neat stack of paper at the bottom edge, which becomes scene 2's place card | Copy first: `h1`, lede, and the call to action fit in a 390×844 first viewport. A compact cluster of the phone, two receipts, and a sticky note sits below it. | The messy start state, because chaos is the point of the hero | Copy on the right, props on the left. Chat bubbles align by logical side. The tidy slide mirrors through `--dir`. |
| 2 Group forms | 150vh / entry | A place card reading “Japan trip” on an empty table, with five empty place settings | A phone slides in with the invite screen: “Invite link”, “Copy”, and a QR code with “Or scan this code”. Link cards fly to each place, and each opens a sign-up screen with an email field before its avatar sits down. | Avatars for Ava, Ben, Dev, Mei, and Sam pop into their places one by one, each with a “{name} joined” toast. The card reads “5 members”. | Copy, then the phone, then a row of avatars that fill in on entry | Five avatars seated; the phone shows the link and QR code | Places fill from the inline-start side; the phone sits at inline-end |
| 3 Expenses land | 200vh pinned / entry on phones (H7 review: the stage needs 853–1,192 px against 568 px available at 360×640, so on phones the scan follows the form box on its own view timeline) | A crumpled receipt for “Izakaya dinner ¥24,000” and a phone showing an empty “Add expense” form | A camera frame closes on the receipt and “Reading receipt…” appears. Description, amount, and date lift off the receipt as paper strips and fly into the form fields, and a pencil ticks each one: the visitor checks the result rather than trusting it. A small line reads “Receipt images are read by Google's AI service.” | Three expense cards drop into a ledger column, each tagged with its split type: “Kyoto apartment · Equally”, “Izakaya dinner · Exact amounts”, “Karaoke room · Percentage”. Asides read “Ava and Ben had the sake.” and “Dev went to bed.” | Pinned with a shorter runway. The form sits above the cards. | The receipt beside the filled form, with all three cards showing | Strips fly towards inline-end. Amounts are wrapped in `<bdi>`. |
| 4 Currencies | 150vh / entry | Expense cards carrying ¥96,000, ¥24,000, ¥16,000, $132, and €400, each with a note or coin | A paper tape runs through a stamp. Each card gets stamped “≈ €600 · Rate 1 EUR = 160 JPY” with a small pencil “Edit rate” chip. | Every card shows euros, the ledger shows “Group total €1,370”, and the caption reads “Example rates for illustration.” | Cards stacked, each stamped as it enters | Each card shows the original amount and the converted amount side by side | The tape runs from inline-start to inline-end |
| 5 The tangle | 280vh / 240vh pinned | A corkboard with five polaroids in a pentagon and the expense cards pinned beside their payers | Nineteen red IOU threads draw, then merge into ten debt threads with amount tags (“€2” earns a sticky note: “the €2 nobody was ever going to chase”). Then the threads go slack and each polaroid shows its balance. | Three taut green threads: Sam → Ava €160, Mei → Ava €140, Dev → Ben €100. The list of payments is visible. | Pinned, with a portrait layout (separate viewBox) and captions below the board | Before and after side by side on desktop, stacked on a phone | Geometry is mirrored when the page is built; arrows follow the mirrored paths |
| 6 Settle up | 150vh / 120vh pinned | The phone shows “Sam owes €160 to Ava” with its record button. Beside it lie Sam's polaroid and a bank-transfer slip. | A quick-settle button fills in the form (“Who paid? Sam”, “Who received the payment? Ava”, €160, note “Bank transfer”), then “Record settlement” is pressed | Debt rows strike through, the phone shows “All settled up!”, the payment history fills with 🎉 👍 ❤️ reactions, and confetti fires once, outside the phone | Pinned with a short runway | “All settled up!” with the history and reactions; no confetti | The layout mirrors; emoji are unchanged |
| 7 Worlds | 320vh horizontal / native swipe | The kitchen table from scene 6, restyled as the housemates world | Page scroll slides four tables sideways: housemates, couples, trips, celebrations. In each, a small mechanic plays: a list ticks “4 of 7”, a split slider sits at 60/40, poll votes fill, a comment collects a 🎉. | The celebrations table, then the table clears | A native horizontal carousel with scroll snap: 85vw cards that peek, previous and next buttons, and “2 of 4” | A vertical stack of four static worlds | Travel runs right to left. The carousel mirrors natively. |
| 8 Trust | Entry | A clean card | Three stamps land: “No ads”, “No ad or analytics trackers”, “We don't sell your personal data” | All three stamped, with a small paw-print seal | Stacked | Already stamped | Mirrored |
| 9 Pricing and call to action | Entry | A till receipt prints: “Ads 0”, “Third-party trackers 0”, “Drama 0”. It shows no price line, so the joke carries no pricing claim; the promise sits beside it in plain text. | The pricing promise, “Free. No ads. No daily limits.”, and “See pricing” sit beside it. Below, the green and teal halves of the logo slide together. | The joined badger face and a large “Create a free account” button, which fires confetti on click | Stacked, with the button full width | The joined face, static | Receipt dot leaders and the halves' slide both mirror |

**Build cost.** About 14 agent-days for the scenes and the paper props, of which about 4 are illustration. That excludes the shared costs: foundation, translation, and verification add about 15. The total is in [Agent execution plan](#agent-execution-plan).

**Performance cost.**

| Item | Cost or risk |
|------|--------------|
| JavaScript at load | About 5 to 7 KB gzipped. Confetti adds 4.3 KB, loaded on demand. |
| CSS | About 15 to 20 KB gzipped |
| HTML | 40 to 55 KB more raw, because the SVG is inline |
| LCP | Low risk. The LCP element is the `h1` text, and the hero SVG stays under 15 KB. |
| CLS | Low risk. Every stage has a fixed aspect ratio. |

### Direction B: eye of the storm

**Visual metaphor.** One phone running the app stays pinned in the middle of the screen from scene 2 to scene 6, and the world swirls around it. Chat bubbles, receipts, coins, and people orbit the phone and get pulled into its screen, where they become calm interface. This direction puts the product first.

**Motion language.** Orbits that tighten, objects sucked into the screen (scaling to the screen centre), interface cards that spring up inside the phone, and a background wash that changes colour with each scene.

**Palette.** True to the app:

| Role | Light | Dark |
|------|-------|------|
| Base | `#F0FDF4` | `#0B1410` |
| Surface | `#FFFFFF` | `#13201A` |
| Primary | `#16A34A` | `#4ADE80` (button text `#052E16`, 8.6:1) |
| Button | `#15803D`, because white on `#16A34A` is only 3.3:1 | — |
| Text | `#1F2937` (14:1) | `#E7F5EC` |
| Secondary text | `#4B5563` | `#9DB5A8` |
| Amounts owed | `#B91C1C` | `#F87171` |

The per-scene background washes are sky `#E0F2FE`, sand `#FEF3C7`, blush `#FCE7F3`, and lilac `#EDE9FE`.

**Typography.** Inter throughout, with 800-weight display headings and tight tracking, to match the app.

**How scenes connect.** The phone is the constant, and only the backdrop and the orbiting objects change.

**Storyboard.**

| Scene | Start → middle → end | Phone | Reduced motion | Right to left |
|-------|----------------------|-------|----------------|---------------|
| 1 Chaos | A storm of chat bubbles, receipts, and spreadsheet scraps orbits a buzzing phone → the orbit tightens → everything is pulled in and the phone shows a calm “Your groups” dashboard | The phone sits under the copy at 60% height | The calm dashboard with a few props around it | The phone at inline-end; orbits mirrored |
| 2 Group | The invite screen → five avatar bubbles fly in from the edges → they dock into the member list | Avatars fly in from above | The member list with five avatars | Mirrored |
| 3 Expenses | A receipt card enters → a light bar scans it → fields fly into the form, and the split selector steps through its three types | Single column | The filled form | Mirrored |
| 4 Currencies | ¥, $, and € streams orbit → they pass through a converter ring → euro tokens enter the phone, which shows the conversion note | Streams reduced to three chips | Original and converted amounts | The stream direction mirrors |
| 5 Tangle | Ten glowing lines burst out of the phone into the whole viewport, linking five avatars → the lines collapse → the phone's balances list shows three rows | The graph fills the width above the phone | Before and after | Geometry mirrored |
| 6 Settle | Quick-settle → pre-filled form → record the payment → “All settled up!” as reactions float out of the phone and the site fires confetti | Same | The final state | Mirrored |
| 7 Worlds | The phone travels sideways across four flat backdrops (kitchen, living room, beach, party), showing that world's group | A carousel of phone cards | A stack of four | Travel mirrors |
| 8 Trust | The phone turns over to show three shields | Stacked | Static | Mirrored |
| 9 Pricing and call to action | The phone shows the dashboard beside the pricing summary and call to action | Stacked | Static | Mirrored |

**Build cost.** About 10 agent-days for the scenes.

**Performance cost.**

| Item | Cost or risk |
|------|--------------|
| JavaScript | The same as A |
| CSS | About 12 to 15 KB gzipped |
| HTML | 25 to 35 KB more raw |
| LCP | Low now. Medium once real screenshots or video arrive, because the hero phone image can become the LCP element and must then be sized, preloaded, and in AVIF. |
| CLS | Low |

### Direction C: lantern forest

**Visual metaphor.** The current woodland identity, taken to dusk. The page descends from the forest canopy to the badgers' sett underground and back up to dawn:

- receipts snag in branches like lost kites;
- people are lanterns in a clearing;
- currencies are three streams turning a water wheel;
- debts are glowing roots that rearrange into three strong tunnels;
- settling up makes the surface bloom.

**Motion language.** Slow and organic: multi-layer parallax, vines growing, fireflies drifting, light shafts. It reuses the spirit of `CanopyBloom`.

**Palette.**

| Role | Light (morning mist) | Dark (night) |
|------|----------------------|--------------|
| Background | `#F3FAF5` | `#0E1A16` |
| Text | `#183A2A` (11.8:1) | `#E6F2EA` |
| Muted text | `#4A6356` | `#A9C2B3` |
| Foliage | `#6AA864` | Canopy `#16302A` |
| Moss, buttons | `#2F5D3A` (white button text 7.6:1) | Glow green `#9BE39F` |
| Teal | `#508C96` | Teal glow `#6FC3CF` |
| Firefly | `#F5C451` | `#FFD66B` |
| Bark | `#5B4636` | — |

**Typography.** Space Grotesk and Inter, as today.

**How scenes connect.** Canopy (hero), then a clearing (group), the forest floor (expenses), a stream (currencies), underground roots (tangle), a bloom at the surface (settle), a sideways journey through four landscapes (worlds), the night sky (trust), and dawn (call to action).

**Storyboard.**

| Scene | Start → middle → end | Phone | Reduced motion | Right to left |
|-------|----------------------|-------|----------------|---------------|
| 1 Chaos | Receipts and chat bubbles caught in the branches → wind gathers them → they drift down into a neat pile | Two parallax layers instead of five | The canopy with receipts caught in it | Parallax mirrored |
| 2 Group | A glowing QR code on a tree sign → five lanterns light up as people join | Stacked | Five lit lanterns | Mirrored |
| 3 Expenses | Receipts fall like leaves into a hollow-log ledger → fireflies read a receipt and lift out its fields | Stacked | The filled ledger | Mirrored |
| 4 Currencies | Three coloured streams (¥, $, €) → a water wheel → one euro stream | Simplified | The merged stream | The flow mirrors |
| 5 Tangle | Tangled glowing roots between five burrow chambers → the roots wither → three strong roots grow | Portrait root map | Before and after | Mirrored |
| 6 Settle | The roots glow → flowers bloom on the surface → fireflies celebrate | Stacked | The bloom | Mirrored |
| 7 Worlds | A sideways journey: cosy burrow kitchen, den for two, dunes, festival meadow | Carousel | Stack | Mirrored |
| 8 Trust | Night sky with three constellations | Stacked | Static | Mirrored |
| 9 Pricing and call to action | Dawn breaks and the logo rises like the sun | Stacked | Static | Mirrored |

**Build cost.** About 19 agent-days for the scenes, of which about 8 go on layered illustration.

**Performance cost.**

| Item | Cost or risk |
|------|--------------|
| JavaScript | About 6 to 8 KB gzipped |
| CSS | 15 to 20 KB gzipped |
| Artwork | 80 to 200 KB of SVG or AVIF layers |
| LCP | Medium to high risk, because large hero art becomes the LCP element |
| Mobile rendering | Compositing many parallax layers costs mobile frame rate |
| CLS | Low |

### Comparison

| | A: everything on the table | B: eye of the storm | C: lantern forest |
|-|----------------------------|---------------------|-------------------|
| Chaos-to-order story | Literal: paper gets tidied | Implied: objects vanish into the phone | Metaphorical |
| Centrepiece readability | High: string between photos is a familiar picture of “who's connected to whom” | High, but generic | Low: roots read as decoration, not debts |
| Brand voice | Strong: room for dry jokes on props | Weak | Moderate |
| Product proof | Device frames inside scenes | Strongest | Weakest |
| Phone layout | Natural vertical stacks | A phone inside a phone | Parallax cut back |
| Scene build cost | About 14 agent-days | About 10 | About 19 |
| LCP risk | Low | Low, rising with real imagery | Medium to high |
| Fit with the current site | A break, keeping the logo colours and frosted UI | A break | Continuity |

## Chosen direction

**Direction A, everything on the table**, was chosen on 14 October 2026 under the owner's instruction to choose rather than stop for a decision.

Rationale:

- **The metaphor is the product.** Messy paper turning into tidy app cards is literally what Side Badger does. The visitor understands it without reading.
- **It has the strongest centrepiece.** String between polaroids is a familiar picture of “who's connected to whom”. Ten red strings becoming three green ones explains debt simplification in one look. It also suits the dry, slightly chaotic voice: the €2 sticky note, “Dev went to bed”.
- **The product stays honest.** App interface appears inside an `AppFrame` component built from the real app's tokens and labels, drawn as part of the illustrated story rather than as screenshots, so its text is translated HTML and its amounts are the example group's in every locale.
- **It is cheap to run and kind to every locale.** It is flat SVG and CSS with no canvas and no raster artwork above the fold. All text is HTML, so it wraps, mirrors, and renders in each script's font.
- **It is distinctive.** Competing bill splitters use flat spot illustrations or phone mock-ups. A flat-lay table is unusual in this category.

Why the others lost:

- **B, eye of the storm**, proves the product best, and it is about 4 agent-days cheaper to build. But it looks like countless SaaS launch pages, says little in the brand's voice, and on a phone becomes a phone inside a phone. A keeps B's main strength through `AppFrame`.
- **C, lantern forest**, keeps continuity with today's look, but it is the most expensive and the riskiest for LCP and mobile frame rate. Its metaphors need explaining: roots and streams are not obviously money. Leaning on burrows and lanterns would also repeat the badger motif in every section, against the editorial guardrails.

A cheaper variant of the same direction was considered and not adopted. **A-lite** pins only the tangle and the worlds strip, and turns scenes 2, 3, 4, and 6 into vignettes that play once on entry. It would save about 4 agent-days. The cost is that the page feels less like one continuous world transforming as you scroll.

What remains open does not reopen the direction. Prototype findings may adjust runway lengths, stage ranges, easing, prop density, and the phone layout of the tangle. The [recorded decisions](#recorded-decisions) cover copy, claims, links and imagery, not the look.

**Dark mode.** The site has no dark mode, and neither task adds one. The homepage ships light-only, like the rest of the site; a dark homepage between a light header and footer would look broken. The dark column in the palette is kept as the reference for a future site-wide task and is not built.

## Animation technology

**Decision.** Use native CSS scroll-driven animations as progressive enhancement, with a small in-house controller script. Do not use GSAP, the scroll-timeline polyfill, or a smooth-scrolling library.

**Browser support, checked 14 October 2026.**

- `animation-timeline: view()` works unflagged in:
  - Chrome and Edge 115+;
  - Samsung Internet 23+;
  - Safari 26+ on macOS and iOS ([Safari 26 shipped scroll-driven animations](https://cydstumpel.nl/?p=1170)).
- Global usage is about 88% ([Can I use](https://caniuse.com/mdn-css_properties_animation-timeline_view)).
- Firefox release still keeps it behind `layout.css.scroll-driven-animations.enabled`. It has been on by default only in Nightly since version 136, and range names in `animation-range` only since Nightly 151 ([MDN: Firefox experimental features](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features)).
- MDN lists `animation-timeline` as limited availability, not Baseline ([MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)).

**How it works.**

1. Each scene `<section>` declares `view-timeline: --scene block` and `view-timeline-inset: var(--header-h, 88px) 0`, so the `contain` range starts as the stage pins under the header. Its descendants animate with `animation-timeline: --scene` and `animation-range: contain a% contain b%`.
   - The `contain` range is exactly the stretch during which the pinned stage fills the viewport.
   - Named timelines are visible to descendants, so `timeline-scope` is not needed.
2. Every animated element has its own keyframes and `animation-range` on the scene timeline. Large moving elements animate `transform` and `opacity`, so the browser can run them off the main thread; threads animate `stroke-dashoffset`, which is main-thread but cheap. No scene drives its content from a shared `--t` property: H1 measured that at 3.4–4× the main-thread cost (see [Prototype findings](#prototype-findings)).
3. Feature detection uses CSS `@supports (animation-timeline: view()) and (animation-range: contain 0% contain 100%)` and JS `CSS.supports('animation-timeline: view()')`.
4. **Fallback** covers Firefox release, Safari 18 and older, and Chromium before 115:
   - The controller adds invisible stage regions spanning each stage. An IntersectionObserver (`rootMargin: '-50% 0px -50% 0px'`) sets `data-stage` on the scene from the highest intersecting region; with none, from whether the scene's top is above the viewport.
   - CSS then transitions each element's `opacity`, `transform` and `stroke-dashoffset` to its stage end state over 700 ms, so the visitor gets the same frames as steps rather than a scrub.
   - The worlds strip becomes the native scroll-snap carousel at every width.
   - Content and links are identical in every path.
5. **The controller** (`scene-controller.ts`, about 3 KB gzipped estimated) also:
   - starts and pauses ambient loops by visibility and `document.visibilityState`;
   - moves the page to a world when focus lands inside the pinned horizontal track;
   - loads `canvas-confetti` on first use;
   - does nothing beyond focus handling under reduced motion.

   It adds no scroll listeners and no permanent animation loop.

**Bundle cost compared.** These sizes were measured from jsDelivr on 14 October 2026.

| Option | Gzip | Notes |
|--------|------|-------|
| Native CSS plus controller | About 3 KB (estimate) | Can run off the main thread for `transform` and `opacity` |
| GSAP 3.15.0 core plus ScrollTrigger | 28.3 + 18.0 = 46.3 KB | Free for commercial use under [Webflow's standard licence](https://gsap.com/standard-license), but proprietary. Driven by scroll handlers on the main thread. |
| scroll-timeline polyfill (flackr) | 17.0 KB | Incomplete; runs on the main thread |

**Revisit if.** The prototype finds an effect that native timelines cannot express without heavy script, such as path morphing that must match across engines. In that case, consider GSAP for that one scene only, loaded lazily, and record the cost here.

## The tangle in detail

### The example group

The group is called “Japan trip”, and its group currency is the euro. The five names are translatable strings (`home.cast.*`, up to six characters each). Translators may substitute culturally plausible names. Amounts, currencies and the Japan-trip story stay fixed in every locale, so the maths is identical everywhere. The homepage is an illustrated story, not a set of screenshots, so it does not follow the per-locale home currencies that real captures on the feature and use-case pages use (the site plan's [Demo content](./seo-site-expansion-plan.md#demo-content)). Every amount is far below the 999,999.99 cap ([site plan D19](./seo-site-expansion-plan.md#d19-the-amount-cap-is-disclosed)), so no locale needs different figures. See [Recorded decisions](#recorded-decisions).

The members, in a pentagon, clockwise from the top: Ava, Ben, Dev, Mei, Sam. Their avatar colours come from the app's palette (`packages/shared/src/user-colors.ts`).

The rates are fixed example rates, labelled as examples: 1 EUR = 160 JPY and 1 EUR = 1.10 USD.

| # | Expense | Paid by | Paid in | In EUR | Split |
|---|---------|---------|---------|--------|-------|
| 1 | Kyoto apartment | Ava | ¥96,000 | €600 | Equally: €120 each |
| 2 | Rail passes, bought before the trip | Ben | €400 | €400 | Equally: €80 each |
| 3 | Airport transfer | Mei | $132 | €120 | Equally: €24 each |
| 4 | Izakaya dinner (“Ava and Ben had the sake.”) | Dev | ¥24,000 | €150 | Exact amounts: Ava €36, Ben €36, Dev €26, Mei €26, Sam €26 |
| 5 | Karaoke room (“Dev went to bed.”) | Sam | ¥16,000 | €100 | Percentage: Ava 40%, Ben 40%, Mei 10%, Sam 10%; Dev not included |

The group spent €1,370. Each person's share: Ava €300, Ben €300, Dev €250, Mei €260, Sam €260.

**Stage 1: 19 IOUs.** Each participant owes each payer their share of each expense: 4 + 4 + 4 + 4 + 3 IOUs.

**Stage 2: 10 debts.** Debts between the same two people cancel out, leaving one debt per pair, €482 in total:

| Debtor → creditor | Amount |
|-------------------|--------|
| Ben → Ava | €40 |
| Dev → Ava | €84 |
| Dev → Ben | €44 |
| Mei → Ava | €96 |
| Mei → Ben | €56 |
| Mei → Dev | €2 (the sticky-note joke) |
| Sam → Ava | €80 |
| Sam → Ben | €40 |
| Sam → Dev | €26 |
| Sam → Mei | €14 |

**Stage 3: balances.** Ava +€300, Ben +€100, Dev −€100, Mei −€140, Sam −€160. They sum to zero.

**Stage 4: 3 payments, €400 in total.** This is the app's algorithm: sort creditors and debtors by size, and the largest debtor pays the largest creditor the smaller of the two amounts. Then advance whichever side reached zero.

1. Sam pays Ava €160, leaving Ava owed €140.
2. Mei pays Ava €140, clearing both.
3. Dev pays Ben €100.

Three is also the true minimum. The members split into two groups that each sum to zero ({Ava, Mei, Sam} and {Ben, Dev}), and five people in two such groups need 5 − 2 = 3 payments. So “three payments settle the lot” is accurate. Even so, the copy avoids promising the fewest possible payments in general, because the greedy method does not always find the minimum.

The data lives in `src/components/home/data/example-group.ts`, in whole cents. The pairwise debts, balances, and payments are computed from it when the site is built, by a port of the app's greedy function. A unit test asserts:

- exactly 19 IOUs, 10 debts, and the payments above;
- balances that sum to zero;
- that no solution with two or fewer payments exists, checked by brute force.

### Graph geometry

These positions are computed when the site is built by `src/components/home/tangle/layout.ts`.

**Desktop** uses a `viewBox` of `0 0 800 520`, centred at (400, 270) with radius 190:

| Member | Position |
|--------|----------|
| Ava | (400, 80) |
| Ben | (581, 211) |
| Dev | (512, 424) |
| Mei | (288, 424) |
| Sam | (219, 211) |

**Phones** use a `viewBox` of `0 0 360 440`, centred at (180, 230) with radius 130.

**Right to left:** x becomes 800 − x (or 360 − x), so Ben and Sam swap sides.

Edges are quadratic curves, so that overlapping threads stay distinguishable. IOU threads bow 8 + 6 × the expense number (14 to 38 units), on opposite sides for opposite directions; debts bow 14 and payments 18. Every edge is shortened by the node radius of 34, so arrowheads stop at the polaroid's edge.

### SVG and HTML structure

```html
<section id="tangle" class="scene scene--tangle" aria-labelledby="tangle-title" data-stage="0">
  <div class="scene__stage">
    <div class="scene__copy">
      <h2 id="tangle-title">…</h2>
      <p>…</p>
      <ol class="tangle__steps">four step captions; the current one is emphasised visually only</ol>
    </div>
    <div class="tangle__visual" role="img" aria-label="{home.tangle.figureLabel}">
      <svg viewBox="0 0 800 520" aria-hidden="true" focusable="false">
        <defs>small cork pattern</defs>
        <g class="tangle__ious">19 × path.thread--iou style="--i:n; --L:length"</g>
        <g class="tangle__pairs">10 × path.thread--pair with a per-path dash pattern, style="--i:n; --L:length", each followed by a separate arrowhead path</g>
        <g class="tangle__payments">3 × path.thread--payment style="--i:n; --L:length", each followed by a separate arrowhead path</g>
        <g class="tangle__pins">5 × circle</g>
      </svg>
      <ul class="tangle__people">5 × li, placed by --x and --y as percentages:
        avatar initials, name, balance in <bdi></ul>
      <ul class="tangle__tags">10 debt tags and 3 payment tags, placed at edge midpoints; the €2 sticky note</ul>
    </div>
    <h3>{home.tangle.afterTitle}</h3>
    <ul class="tangle__payments-list">3 × “Sam pays Ava €160”</ul>
    <details>
      <summary>{home.tangle.showAll}</summary>
      <h3>{home.tangle.beforeTitle}</h3>
      <ul>10 × “Mei owes Ava €96”</ul>
      <ul>5 balances</ul>
    </details>
    <a href="…">{link}</a>
  </div>
  <!-- the fallback stage regions are added by the controller -->
</section>
```

Names, amounts, and captions are HTML laid over the SVG, not SVG `<text>`. That way they use the script's font, handle bidirectional text correctly, and can be read and translated. The SVG draws only lines, pins, and the board.

### Animation stages

The ranges below are percentages of the section's `contain` range. The runway is 280vh on desktop and 240vh on phones, so the stage is pinned for about 180vh and 140vh of scrolling. Both layouts share these ranges.

| Range | Stage | What happens | Caption |
|-------|-------|--------------|---------|
| 0–10% | 0 Board | Polaroids pin in (scale 1.1 → 1, pins drop) and the expense cards fade back | — |
| 10–30% | 1 IOUs | The 19 IOU threads draw (`stroke-dashoffset` from the path's length to 0), staggered by `--i` | “Every expense creates IOUs: 19 of them.” |
| 30–50% | 2 Pairs | IOU threads fade as the 10 debt threads draw. Amount tags appear, and the €2 sticky note lands at 45%. | “Debts between the same two people cancel out: 10 left.” |
| 50–68% | 3 Balances | Debt threads drop to 15% opacity. Balance tags pop onto the polaroids: green `+`, red `−`. | “Add it all up: each person is up or down overall.” |
| 68–90% | 4 Payments | Green threads draw in greedy order: Sam → Ava (68–75), Mei → Ava (75–82), Dev → Ben (82–89). Each balance turns to a tick at zero once its payment lands. | “Match the biggest debts to the biggest credits: 3 payments.” |
| 90–100% | Rest | Debt threads disappear, a “3, not 10” stamp lands, and the payments list is emphasised | — |

The fallback uses six stage regions, at 0–10%, 10–30%, 30–50%, 50–68%, 68–90% and 90–100%. Each stage transitions over 700 ms, with thread draws staggered by `calc(var(--i) * 40ms)`.

### Accessibility

A screen reader hears, in order:

1. the heading and the paragraph;
2. the four step captions as a numbered list;
3. the visual as a single image named “Diagram of five friends: ten debts between them become three payments”;
4. the heading “With Side Badger: 3 payments” and the three payments as a list;
5. a “Show all 10 debts” disclosure holding the ten debts and five balances;
6. the link.

Nothing that matters exists only inside the SVG. Amounts are formatted with `Intl.NumberFormat` for the locale, with no fraction digits and, for balances, `signDisplay: 'exceptZero'`, and wrapped in `<bdi>`. Inactive captions and dimmed props use a muted colour that meets 4.5:1, never reduced opacity.

Colour is never the only signal. Debts are red and dashed; payments are green and solid with a tick. In forced-colours mode, threads use `CanvasText` and `Highlight`.

## Build plan

### Files and components

The new homepage lives in `src/components/home/`, and the old `src/components/HomePage.astro` and `src/styles/homepage.css` are deleted. Scene styles are scoped `<style>` blocks inside each scene component, so parallel packages never edit the same stylesheet.

```text
src/pages/[...locale]/index.astro        imports home/HomePage.astro
src/components/home/
  HomePage.astro                         page shell, scene order, JSON-LD, controller script
  ScrollScene.astro                      shared scroll-scene primitive
  AppFrame.astro                         device and app-card frame; real screenshot slot later
  props/                                 shared prop kit: Paper, Receipt, StickyNote, ChatBubble,
                                         Polaroid, Stamp, Avatar, Doodle (underline, circle, arrow)
  scenes/
    SceneChaos.astro      SceneGroup.astro      SceneExpenses.astro
    SceneCurrencies.astro SceneTangle.astro     SceneSettle.astro
    SceneWorlds.astro     SceneTrust.astro      ScenePricing.astro
  tangle/layout.ts                       pentagon geometry, edge paths, mirroring
  data/
    example-group.ts                     members, expenses, rates; derived debts and payments
    worlds.ts                            four worlds: keys, palette, registry IDs, slug, published flag
    home-features.ts                     registry IDs depicted (available only); feeds JSON-LD
    links.ts                             scene → first-release page, published flag, /go/ launch links
  format.ts                              formatMoney(), mirrorX() (tf() comes from @/i18n)
  scene-controller.ts                    fallback stages, ambient play state, focus, lazy confetti
src/styles/home/
  tokens.css                             direction palette, world palettes, motion tokens, --dir
  scenes.css                             primitive layout, @supports blocks, stage fallback,
                                         reduced motion
src/__tests__/
  home-example-group.test.ts
  home-tangle-layout.test.ts
```

### The scroll-scene primitive

`ScrollScene.astro` takes these props:

| Prop | Purpose |
|------|---------|
| `id` | Section id |
| `titleId` | Id of the heading that labels the section |
| `runway` | `{ desktop, phone }` in vh, or `'entry'` for no pinning |
| `stages` | Stage boundaries as percentages, also used for the fallback stage regions |
| `staticStage` | The stage shown under reduced motion (the tangle shows a before and an after board) |
| `tone` | Selects a world or section palette |

It renders:

- `<section class="scene" style="--runway-desktop:…; --runway-phone:…" data-stages="10,30,50,68,90" data-static-stage="4">`;
- a sticky `.scene__stage` (`top: var(--header-h, 88px)`, `height: calc(100svh - var(--header-h))`);
- slots for copy, visual, and link.

`scenes.css` owns the `view-timeline` and `view-timeline-inset` declarations, the `@supports` blocks, the stage-fallback transitions, and the reduced-motion flattening.

Runways are not pinned:

- on viewports shorter than 560 px;
- under reduced motion;
- for `'entry'` scenes, which use `animation-range: entry 10% cover 40%` instead.

### Translation keys

New keys use the `home.` prefix. Keys contain only letters and dots (camelCase, no digits), and code references them as full string literals. The unused-key check in `translations.test.ts` finds keys only through `t('…')` calls or literals of letters and dots. A `t(\`home.worlds.${id}.title\`)` call would leave the key looking unused.

| Group | Keys (English draft in brackets where not shown above) |
|-------|--------------------------------------------------------|
| Hero | `home.hero.title`, `.lede`, `.audience`, `.ctaPrimary` (“Create a free account”), `.ctaSecondary`, `.trust` (“Free. No ads. No daily limits.”) |
| Chaos props | `home.chaos.chatTaxi` (“who paid for the taxi??”), `.chatPromise` (“I'll send it tonight, promise”), `.chatDeposit` (“wait, was the deposit before or after the refund?”), `.sticky`, `.sheetError` (“TOTAL: ???”), `.receiptTaxi`, `.receiptGroceries`, `.receiptVilla` |
| Shared | `home.scene.tryInApp` (“Try it in Side Badger”) |
| Cast | `home.cast.ava`, `.ben`, `.dev`, `.mei`, `.sam` |
| Group | `home.group.title`, `.body`, `.name` (“Japan trip”), `.inviteLink`, `.copy`, `.scanCode`, `.joined` (“{name} joined”), `.memberCount` (“5 members”) |
| Expenses | `home.expenses.title`, `.body`, `.scanning`, `.fieldDescription`, `.fieldAmount`, `.fieldDate`, `.fieldPaidBy`, `.fieldSplit`, `.splitEqual`, `.splitExact`, `.splitPercent`, `.itemApartment`, `.itemRail`, `.itemTransfer`, `.itemDinner`, `.itemKaraoke`, `.dinnerNote`, `.karaokeNote`, `.scanNote` (“Receipt images are read by Google's AI service.”) |
| Currencies | `home.currency.title`, `.body`, `.convertTo`, `.rate`, `.editRate`, `.groupTotal`, `.exampleRates` |
| Tangle | `home.tangle.title`, `.body`, `.stepIous`, `.stepPairs`, `.stepBalances`, `.stepPayments`, `.smallDebt` (“The {amount} nobody was ever going to chase”), `.beforeTitle`, `.afterTitle`, `.owes` (“{from} owes {to} {amount}”), `.pays` (“{from} pays {to} {amount}”), `.showAll`, `.figureLabel`, `.stamp` (“3, not 10”) |
| Settle | `home.settle.title`, `.body`, `.whoPaid`, `.whoReceived`, `.noteExample` (“Bank transfer”), `.recordSettlement`, `.allSettled` (“All settled up!”), `.history` |
| Worlds | `home.worlds.title` (“Whatever brings your group together”; revised 2026-10-15: the table metaphor only worked if you noticed the drawing; the body now names lists, polls and comments), `.body`, `.previous`, `.next`, `.position` (“{current} of {total}”); then for each of `housemates`, `couples`, `trips`, `celebrations`: `.title`, `.body`, `.propOne`, `.propTwo` |
| Trust | `home.trust.title` (“Built with your privacy in mind”; revised 2026-10-15; `.sellingBody` now matches its heading: not sold, rented or traded, and only group members see the group), `.adsTitle` (“No ads”), `.adsBody`, `.trackersTitle` (“No third-party trackers”), `.trackersBody`, `.sellingTitle` (“We don't sell your personal data”), `.sellingBody`, `.privacyLink` |
| Pricing and call to action | `home.pricing.title`, `.body` (“Free. No ads. No daily limits.”), `.link`; `home.cta.title`, `.body`, `.receiptAds`, `.receiptTrackers`, `.receiptDrama` |

That is about 113 new keys, or about 4,300 strings across the 38 non-English locales.

The worlds' feature chips reuse the existing, already translated `features.*.title` keys. Each chip maps to a registry ID in the worlds table, and a chip appears only for an `available` feature. H2 rewords any title that overstates the registry's approved claims. The links to deeper pages get their own label keys from H16 (W3b), referenced as literals in `data/links.ts`, so no key sits unused.

Interpolation uses the shared `tf(key, params, locale)` helper in `src/i18n/index.ts`, which the restructure's P11 adds (restructure D13) and which replaces `{name}` tokens. Word order varies too much by language to build sentences from fragments.

H2 hands its translator notes to the coordinator, who records them in [Translator notes](#translator-notes). They cover:

- character budgets for prop labels (chat bubbles 40, sticky notes 32, field labels 18);
- the intent behind each joke;
- that the names may be replaced by culturally plausible local names of up to six characters, while amounts, currencies and the Japan-trip story stay exactly as given;
- that “fewer payments”, “record a payment” and “a current exchange rate” keep their hedges in every language, and that nothing may be strengthened to “fewest”, “one tap” or “live rates”;
- that amounts are formatted by code and must never be typed into the strings.

**Keys to retire,** all used only by the homepage:

- `hero.*` (8, including `hero.typewriterWords`);
- `whatsItFor.*` (28);
- `filters.*` (4);
- `narrative.*` (6);
- `littleThings.*` (20);
- `comingSoon.*` (7);
- `whyFree.*` (8);
- `cta.*` (3);
- `features.title`, `features.subtitle`, and the 16 `features.*.desc` keys.

That is 102 keys. The 16 `features.*.title` keys stay, referenced by `home-features.ts` as the interim allowlist until the registry replaces it. `meta.title` and `meta.description` stay, reworded by H2. `meta.description` reads “Free bill splitting with no ads, no daily limits and no third-party trackers.”, which combines the [site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise with the [site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies) trust claim.

**Test changes in `src/__tests__/translations.test.ts`:**

- Delete the `hero.typewriterWords` JSON block.
- Remove `hero.subtitleStatic` from `LEADING_SPACE_ALLOWED`.
- Allow `/^home\.cast\./` (names) to match English.

The `{token}` parity check is added by the restructure's P04.

### Structured data

`HomePage.astro` passes `SoftwareApplication` to `BaseLayout` through its `jsonLd` prop (restructure 2.5), so it joins the page's single `@graph`:

| Field | Value |
|-------|-------|
| `@id` | `{canonical}#app` |
| `name` | `"Side Badger"` |
| `url` | The canonical localized URL |
| `description` | `t('meta.description')` |
| `applicationCategory` | `"FinanceApplication"` |
| `operatingSystem` | `"Web"` |
| `inLanguage` | The locale's `htmlLang` (restructure D5) |
| `featureList` | The localized titles of the `available` registry features actually depicted, from `home-features.ts` |
| `publisher` | `{ "@id": "https://sidebadger.me/#organization" }`, the `Organization` node restructure 2.5 adds to every page |
| `offers` | `{ "@type": "Offer", "price": "0", "priceCurrency": "GBP" }`, matching the [site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise (currency per restructure D7) |

Visible content and schema must agree: no feature appears in the schema that no scene shows. No ratings are added.

### Performance strategy

**Budgets per homepage locale.** The required comparison is with `tasks/baseline-measurements.md`.

| Item | Budget | Today |
|------|--------|-------|
| JavaScript at load | ≤ 8 KB gzipped | About 49 KB |
| Confetti | 4.3 KB gzipped, on demand | Loaded up front |
| CSS | ≤ 20 KB gzipped | 7.5 KB plus 91 KB of font CSS |
| HTML | ≤ 130 KB raw, ≤ 24 KB gzipped | 75 KB raw |
| Fonts | ≤ 2 preloaded WOFF2 files for Latin locales; script fonts only on their own locales | All fonts for every locale |
| LCP | No worse than the baseline; target ≤ 2.0 s in the mobile lab | About 4.0 s locally, unthrottled |
| CLS | No worse than the baseline; target ≤ 0.02 | 0.18 locally |
| Scroll smoothness | No long task over 50 ms while scrolling with 4× CPU throttle | — |

Techniques:

- **Above the fold.** Server-render every scene as HTML and inline SVG; no client rendering. Nothing above the fold is a raster image, except the logo with explicit `width` and `height`. The `h1` is never faded, blurred, or delayed.
- **Starting and pausing.** Ambient CSS animations default to `animation-play-state: paused` and run only while their scene is active.
  - The controller sets `data-near` when a scene comes within one viewport (an IntersectionObserver with `rootMargin: 100% 0px`). `data-near` adds `will-change` only while a stage is active and lets lazy work start.
  - `visibilitychange` pauses everything.
  - Each ambient loop stops after 5 s per activation, which also satisfies WCAG 2.2.2 (Pause, Stop, Hide) without a pause button.
- **No continuous work.** No scroll listeners and no permanent `requestAnimationFrame` loops; confetti runs its own short loop.
- **Rendering cost.** Use `content-visibility: auto` on scenes after the second whose height is explicit, or with `contain-intrinsic-size: auto <measured height>`, never a guess. H1 found that it does not break view timelines, but a wrong intrinsic size caused a 0.08 layout shift. Avoid `filter: blur()` on animated layers, and keep `backdrop-filter` to the header and small interface panels.
- **Fonts.** H4 implements restructure D24. No third-party font requests and no CSS `@import`:
  - Latin, Cyrillic and Greek locales use self-hosted Fontsource WOFF2 in `public/fonts/`: Inter variable, and Space Grotesk 600 for Latin headings, with exactly two preloads and fallback faces using `size-adjust` and ascent overrides to stop the swap from shifting layout;
  - Arabic-script (`ar`, `fa`, `ur`) and Indic (`hi`, `bn`, `te`) locales get one self-hosted Noto Sans variable subset each, loaded only on their own locale with no preload;
  - Japanese, Chinese and Korean use system font stacks with no webfont, and `lang` selects the glyphs;
  - per-locale font links read the `fontScript` field that P11 adds to `localeConfig`.

  This also stops every visitor's IP address reaching Google, which matters for a site that promises no third-party trackers.
- **Old effects.** Retire `CanopyBloom`, `FloatingParticles`, `MagicalCursor`, and the `--scroll-progress` scroll listener site-wide. Remove `tsparticles` and `@tsparticles/slim` from `package.json`.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` turns every scene into its static frame:

- Runways collapse to their natural height and stages stop being sticky.
- Animations are removed, so elements rest at their end state; `data-stage` is fixed at each scene's `staticStage`.
- Ambient animations are removed and `scroll-behavior` returns to `auto`.

The frames are chosen to be attractive and complete: see the storyboard column. The tangle shows before and after side by side. The worlds become a vertical stack.

The controller adds no stage regions and fires no confetti. It listens for the preference changing and sets itself up or tears itself down. Content, headings, and links are identical to the animated page.

### Right to left and scripts

**Layout.**

- Components use only logical properties (`inline-start`, `inline-end`, `margin-inline`). H13 checks that `src/components/home` and `src/styles/home` contain no physical `left` or `right` declarations.
- `:root { --dir: 1 }` and `[dir="rtl"] { --dir: -1 }`. Every horizontal translation multiplies by `--dir`, including the worlds track (`translate: calc(var(--dir) * -1 * var(--travel))`).
- The worlds track width is four panels of `100vw`, so its travel is computable in CSS without measuring.
- SVG geometry is mirrored by `mirrorX()` when each locale is built, rather than flipped with CSS transforms. Text and markers therefore stay correct.
- The native carousel mirrors itself under `dir="rtl"`.
- Directional icons are mirrored. Amounts sit in `<bdi>`.

**Number formatting.** Money is formatted with `Intl.NumberFormat(intlCode, { style: 'currency', currency })` when the site is built. For example, `ar-EG` gets Arabic-Indic digits.

**Fonts and line heights by script.**

| Locales | Font | Heading line height |
|---------|------|---------------------|
| `ar`, `fa`, `ur` | Noto Sans Arabic, including for `ur` ([recorded decision 10](#recorded-decisions)) | 1.25 |
| `hi` | Noto Sans Devanagari | 1.35 |
| `bn` | Noto Sans Bengali | 1.35 |
| `te` | Noto Sans Telugu | 1.35 |
| `ja` | System Japanese stack, no webfont | 1.25 |
| `ko` | System Korean stack, no webfont | 1.25 |
| `zh` | System Chinese stack, no webfont | 1.25 |
| `el`, `uk`, `sr` | Inter for headings, because Space Grotesk has no Greek or Cyrillic | Default |

The font choices follow restructure D24.

**Wrapping.**

- Headings use `text-wrap: balance` and body text `text-wrap: pretty`.
- Japanese gets `word-break: auto-phrase`.
- Props get `hyphens: auto` and `overflow-wrap: anywhere` for long German compounds.
- Prop containers grow to fit their content rather than clipping it.

### Mobile layout

Breakpoints are ≤ 599 px for phones, 600 to 1023 px for tablets, and ≥ 1024 px for desktops. Prop layouts inside a stage use container queries. Below 1024 px the tangle uses its portrait board, with the lede before the pinned stage and one crossfading caption below the board.

On phones:

- Only the expenses, tangle, and settle scenes stay pinned, with the shorter runways in the storyboard.
- Every other scene plays once on entry.
- The worlds strip is a native scroll-snap carousel at 85vw per card, with `overscroll-behavior-x: contain`, previous and next buttons, and a “{current} of {total}” status.

Throughout:

- The `h1`, lede, and primary call to action fit in the first viewport at 390×844 and 360×640.
- Touch targets are at least 44 px.
- No interaction depends on hover.

### Verification

1. **Build and tests.** Build in a private copy of the repository, never in the shared working tree:

   ```sh
   D=$(mktemp -d <scratchpad>/build-XXXX)
   rsync -a --exclude node_modules --exclude dist --exclude .astro ./ "$D"/
   ln -s "$PWD/node_modules" "$D"/node_modules
   (cd "$D" && npm run build)
   ```

   Then run `npm run i18n audit` and `npx vitest run`, which covers the translation test and the two new homepage tests.
2. **Built output.** Check `dist/` for:
   - one `h1` per homepage locale;
   - a `SoftwareApplication` block in `dist/index.html`, `dist/ar/index.html`, `dist/ja/index.html`, and `dist/hi/index.html`;
   - none of the phrases in the [approved substitutions](./seo-site-expansion-plan.md#approved-substitutions) “Instead of” column, in particular “free forever”, “unlimited”, “zero tracking”, “no tracking”, “privacy first”, “your data stays yours”, “no catch”, “single tap”, “one tap”, “fewest”, “minimise”, “real-time”, “live rates” and “any currency”;
   - internal links that all resolve;
   - every launch link goes through `/go/register/` or `/go/app/`, and none points at the app host directly;
   - the HTML size budget met.
3. **Screenshots** with Playwright in Chromium:
   - at 390×844 and 1440×900;
   - in `en`, `ar`, `ja`, and `hi`, plus `de` as a long-string check (before W4, the pseudo-locales `xx-long`, `xx-ar`, `xx-ja` and `xx-hi` stand in for them);
   - for every scene at 10%, 50%, and 90% of its runway;
   - full-page with reduced motion emulated, for each of those locales;
   - in Firefox (the fallback path) for `en` and `ar` on desktop;
   - in forced-colours mode, in `en`.

   H13 covers `en` and the four pseudo-locales and stores its screenshots in `tasks/homepage-screenshots/`. The restructure's P41 repeats this step in `ar`, `ja`, `hi` and `de` in W4b. The coordinator lists both sets in this file.
4. **Keyboard.** Tab through every link in order. Focus is always visible. Focus inside the worlds track brings the right world into view. The skip link works.
5. **Screen reader.** In VoiceOver with Safari, check the reading order of the hero, the tangle, and the worlds, and the tangle's image name and lists.
6. **Automated accessibility.** Run axe-core on the built `en` and `ar` homepages.
7. **Lighthouse.** Mobile and desktop, median of three runs, compared with `tasks/baseline-measurements.md`. H13 reports the numbers and the coordinator records them here.
8. **Scrolling performance.** Record a Chrome trace while scrolling the whole page with 4× CPU throttle. There must be no long task over 50 ms. H13 reports the result and the coordinator records it here.

## Agent execution plan

Each package is sized for one implementation agent and is written HN. The restructure task's [Joint schedule with the homepage task](./restructure-marketing-site.md#joint-schedule-with-the-homepage-task) is the authority on waves, target branches and file holders (restructure D37), and its [rules for every package](./restructure-marketing-site.md#rules-for-every-package) apply here: own branch and worktree, builds in that private copy and never in a shared `dist/`, edits only owned files, and only the coordinator edits the task plans in `tasks/*.md`. Packages in the same wave never share a file. A package that needs a string it does not own lists it in its handover, and the next holder of `en.ts` in the shared-files table adds it.

English first, translation last (restructure D38). Every homepage string is written and verified in English, and checked for long strings, right-to-left and non-Latin scripts in the pseudo-locales (`xx-long`, `xx-ar`, `xx-ja`, `xx-hi`), before the restructure's T1 to T6 translate it in W4a. Homepage work that adds strings merges into the `redesign` branch, never into `main`.

**Model.** "Sonnet" marks clear, mechanical packages a Sonnet agent can run; "default" marks judgement-heavy ones (prototype, copy, design, verification) for the default model.

| Package | Joint wave | Target branch | Model |
|---|---|---|---|
| H1 tangle prototype | W0 | none (scratch only) | default |
| H2 copy deck and English keys | W0, after P04 | `redesign` | default |
| H3 example-group data | W0 | `main` | Sonnet |
| H4 site chrome | W1a, merges after P11 | `main` | default |
| H5 homepage foundation | W1c | `redesign` | default |
| H6 to H10 scenes | W2a | `redesign` | default |
| H11 retire the old homepage | W2b | `redesign` | Sonnet |
| H16 deeper-page link labels | W3b | `redesign` | Sonnet |
| H13 verification and fixes (English and pseudo-locales) | W3c | `redesign` | default |
| H14 documentation | W3c | `redesign` | Sonnet |
| Translation (restructure T1 to T6) | W4a | `redesign` | Sonnet |
| Localized homepage checks (restructure P41) | W4b | `redesign` | default |

H12a to H12d (translation) were replaced by the restructure's T1 to T6, which now run once, at the end. H15 (a real-imagery swap) is withdrawn, because the homepage stays an illustrated story ([recorded decision 4](#recorded-decisions)).

Settled before W0: the [baseline](./baseline-measurements.md) and the [recorded decisions](#recorded-decisions). Restructure outputs arrive by wave: P11's `launchHref()`, `fontScript`, page registry and pseudo-locales (W1a); P12's `jsonLd` prop and `lang`/`dir` (W1b); P23's shell, `--header-h` and Playwright setup (W2a); P22's registered pages (W2b).

### W0: prototype, copy and data

**H1: tangle prototype (feel check).** About 1.5 agent-days.

- **Model:** default.
- **Depends on:** nothing.
- **Inputs:** [The tangle in detail](#the-tangle-in-detail), direction A's storyboard row and motion tokens, [Animation technology](#animation-technology).
- **Owns:** scratch files only, in the agent's scratchpad. Nothing is committed to `src`.
- **Builds:** a throwaway standalone HTML, CSS, and JS version of scene 5 in direction A, using the data and stages above, with a pinned runway and a stage fallback that can be forced.
- **Settles:**
  - the runway and stage ranges, and the easing;
  - compositor transforms versus the `--t` custom property, measured with 4× CPU throttle;
  - the phone layout;
  - right-to-left mirroring;
  - the reduced-motion frame;
  - whether `content-visibility` interferes with view timelines;
  - whether the `overflow-x: hidden` defect blocks sticky positioning.
- **Delivers:** a private Artifact link for the owner to look at, and the findings in its handover, which the coordinator records in [Prototype findings](#prototype-findings).
- **Verifies:** the Artifact plays all stages on the native timeline in Chromium and on the forced fallback, at 1440×900 and 390×844, left to right and mirrored, with no long task over 50 ms at 4× CPU throttle, and the reduced-motion frame shows before and after.

**H2: copy deck and English keys.** About 1 agent-day.

- **Model:** default.
- **Depends on:** P04 (merges after it, because it adds its keys to `src/i18n/pending/keys.json`, which P04 creates).
- **Inputs:** [Scene content](#scene-content-shared-by-every-direction), [Translation keys](#translation-keys), the site plan's [voice rules](./seo-site-expansion-plan.md#voice-and-editorial-rules), [approved substitutions](./seo-site-expansion-plan.md#approved-substitutions) and registry claims.
- **Owns:** `src/i18n/en.ts` and `src/i18n/pending/keys.json`, in their W0 slot.
- **Does:** writes the final English for every key in [Translation keys](#translation-keys), adds the keys in key order and lists them in `pending/keys.json`, and hands the translator notes to the coordinator, who records them in [Translator notes](#translator-notes). It does not remove retired keys (H11 does).
- **Delivers:** a branch merged into `redesign`.
- **Verifies:** no `home.*` English value contains a phrase from the "Instead of" column; `npm run i18n audit` and `translations.test.ts` pass in English-first mode. The unused-key check may report the new `home.*` keys until H6 to H10 reference them; the coordinator checks that the list holds only those keys.

**H3: example-group data and the debt calculation.** About 0.5 agent-days.

- **Model:** Sonnet.
- **Depends on:** nothing.
- **Inputs:** [The example group](#the-example-group), including the app's greedy match described there.
- **Owns:** `src/components/home/data/example-group.ts` and `src/__tests__/home-example-group.test.ts`.
- **Does:** writes the typed data in whole cents and a greedy simplifier ported from the app.
- **Delivers:** a branch merged into `main` (it adds no strings).
- **Verifies:** the test proves 19 IOUs, 10 debts, the 3 payments above, balances summing to zero, and, by brute force, that no solution with two or fewer payments exists; `npm test -- --run` and the build pass.

### W1a: site chrome

**H4: site chrome.** About 2 agent-days. It owns site-wide chrome, fonts and effects, exactly as the restructure task's shared-files table assigns them. No other homepage package edits these files; later edits go through H13.

- **Model:** default (font metrics and the contrast fix need judgement).
- **Depends on:** P02 and P03 merged. Codes against the `fontScript` field P11 adds to `localeConfig` and merges after P11.
- **Inputs:** restructure D24, D25, 5.7, 5.8, B36 and B37; [defects](#defects-found) 1, 3 and 8; direction A's green ink (`#2F6B2E`) for links and button backgrounds.
- **Owns:**
  - `src/styles/global.css`, `src/styles/tokens.css`, `src/styles/easter-eggs.css`, `src/components/EasterEggs.astro` and `public/fonts/`, exclusively;
  - `src/components/layout/BackgroundEffects.astro` (created by P03) and the three effect components `CanopyBloom.astro`, `FloatingParticles.astro` and `MagicalCursor.astro`, all of which it deletes;
  - `src/layouts/BaseLayout.astro`, in its slot between P03 and P12: effects out, font links and preloads;
  - `package.json` and `package-lock.json`, in their slot between P02 and P19: removes `tsparticles` and `@tsparticles/slim`, adds the Fontsource packages.
- **Does:**
  - changes `overflow-x` to `clip`;
  - retires the three effects and the `--scroll-progress` listener site-wide (restructure D25);
  - implements the restructure D24 fonts: self-hosted, no third-party requests, no `@import`; Fontsource WOFF2 for Latin, Cyrillic and Greek (Inter variable, Space Grotesk 600 for Latin headings, two preloads, metric-adjusted fallbacks); one Noto Sans variable subset each for Arabic-script and Indic locales, loaded only on their own locale; system font stacks for Japanese, Chinese and Korean;
  - fixes the button and link contrast (B36) in `tokens.css` and `global.css`;
  - provides `--header-h` fallbacks;
  - makes `EasterEggs` load confetti lazily and fixes its message contrast.
- **Delivers:** a branch merged into `main` (it adds no strings).
- **Verifies:** all four easter eggs still work; the pricing and policy pages look intact against `tasks/baseline-screenshots/`; no `dist/` page requests a third-party font or contains a CSS `@import`; font bytes meet restructure 5.7's budgets on `/`, `/ar/`, `/hi/` and `/ja/`; button text and links reach 4.5:1; the build passes.

### W1c: homepage foundation

**H5: homepage foundation.** About 2.5 agent-days.

- **Model:** default.
- **Depends on:** H1's findings, H2's keys, P11 (`launchHref()`, `src/site/pages.ts`) and P12 (`BaseLayout`'s `jsonLd` prop). The coordinator merges `main` into `redesign` before H5 starts.
- **Inputs:** [Build plan](#build-plan), [Structured data](#structured-data), [Prototype findings](#prototype-findings), [App frames and their app sources](#app-frames-and-their-app-sources).
- **Owns:**
  - `src/components/home/HomePage.astro`, `ScrollScene.astro`, and `AppFrame.astro`;
  - the `props/` kit;
  - `scene-controller.ts`, `format.ts`, `data/links.ts`, and `data/home-features.ts`;
  - `src/styles/home/tokens.css` and `src/styles/home/scenes.css`;
  - `src/pages/[...locale]/index.astro`;
  - placeholder files for all nine scenes.
- **Does:** builds the primitive and controller to the prototype's findings, the shared prop kit, the money helpers (`tf()` comes from `@/i18n`), link resolution, the JSON-LD including the price-0 `offers` block, and the page skeleton with every scene in order. `data/links.ts` maps each scene to its release 1 page id and reads `published` from `src/site/pages.ts`, so a scene links to its page from the moment the page is published and to `/go/app/` (built by `launchHref()` with `from`, `cta` and `lang`) until then, including while the page is not yet in the registry.
- **Delivers:** a branch merged into `redesign`.
- **Verifies:** the skeleton builds; one `h1`; the JSON-LD is present in the `@graph`; the fallback path works when forced; under reduced motion the page is flat; the skeleton renders in `en` and the four pseudo-locales.

### W2a: scenes

The five packages below run in parallel, alongside P21, P23 and P26, and merge into `redesign`. Each owns only its scene files and prop folder; strings it lacks go in its handover for H11.

- **Model:** default for all five.
- **Depends on:** H3 and H5.
- **Inputs:** each scene's row in direction A's storyboard, [Scene content](#scene-content-shared-by-every-direction), [Right to left and scripts](#right-to-left-and-scripts), [Reduced motion](#reduced-motion), [Mobile layout](#mobile-layout) and [App frames and their app sources](#app-frames-and-their-app-sources).
- **Verifies (each):** its scenes in the built page in both motion paths, under reduced motion, in `en` and the four pseudo-locales, and at 390 px width, with screenshots in its handover; still one `h1`; no physical `left` or `right` declarations in its files; `npm test -- --run` and the build pass in English-first mode.

**H6: chaos and group scenes.** About 2 agent-days.

- **Owns:** `scenes/SceneChaos.astro`, `scenes/SceneGroup.astro`, and `props/chaos/`.
- **Delivers:** scenes 1 and 2 with every column of the storyboard done. Scene 1 carries the “Free. No ads. No daily limits.” line and the `/go/register/` button; scene 2 shows the sign-up step.

**H7: expenses and currencies scenes.** About 2.5 agent-days.

- **Owns:** `scenes/SceneExpenses.astro`, `scenes/SceneCurrencies.astro`, and `props/expenses/`.
- **Delivers:** scenes 3 and 4, taking their amounts from `example-group.ts`. Scene 3 shows the filled fields being checked and carries the Google disclosure line ([site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later)).

**H8: tangle scene.** About 3 agent-days.

- **Owns:** `scenes/SceneTangle.astro`, `tangle/layout.ts`, and `src/__tests__/home-tangle-layout.test.ts`.
- **Delivers:** scene 5 as specified in [The tangle in detail](#the-tangle-in-detail).
- **Verifies (also):** the geometry test covers mirroring and edge shortening.

**H9: settle, trust, and pricing scenes.** About 2 agent-days.

- **Owns:** `scenes/SceneSettle.astro`, `scenes/SceneTrust.astro`, and `scenes/ScenePricing.astro`.
- **Delivers:** scenes 6, 8, and 9, including the confetti trigger. The pricing body is the [site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise with a link to `/pricing/`, and the trust scene uses only the [site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies) claims.

**H10: worlds strip.** About 3 agent-days.

- **Owns:** `scenes/SceneWorlds.astro`, `data/worlds.ts`, and `props/worlds/`.
- **Delivers:** scene 7, with desktop horizontal travel, the native carousel, the focus handling hook, and four world palettes (housemates, couples, trips, celebrations). The couples world links to `/go/app/` until its release-2 page is published.

### W2b: retire the old homepage

**H11: retire the old homepage.** About 0.5 agent-days.

- **Model:** Sonnet.
- **Depends on:** H6 to H10 and P23 merged into `redesign` (P23 then releases `en.ts`).
- **Inputs:** the retire list and test changes in [Translation keys](#translation-keys); the W2a handovers' string requests.
- **Owns:** `src/i18n/en.ts`, `src/i18n/pending/keys.json`, `src/__tests__/translations.test.ts`, `src/components/HomePage.astro` (deleted), and `src/styles/homepage.css` (deleted).
- **Does:** removes the 102 retired English keys and lists them under `removed` in `pending/keys.json`, adds any late keys that W2a requested (under `added`), and makes the test changes listed in [Translation keys](#translation-keys).
- **Delivers:** a branch merged into `redesign`.
- **Verifies:** in English-first mode, `npm run i18n audit` and `translations.test.ts` pass, with no unused `home.*` key; nothing imports the old `HomePage.astro` or `homepage.css`; the build passes.

### W3b: deeper-page link labels

**H16: deeper-page link labels.** About 0.25 agent-days.

- **Model:** Sonnet.
- **Depends on:** P22 (the release 1 pages are in the registry) and P31 (releases `en.ts`).
- **Inputs:** the links column of [Scene content](#scene-content-shared-by-every-direction) and the site plan's [homepage brief](./seo-site-expansion-plan.md#homepage) links.
- **Owns:** `src/components/home/data/links.ts`, and `src/i18n/en.ts` and `src/i18n/pending/keys.json` in their W3b slot.
- **Does:** adds one English label key per release 1 page that a scene links to (`home.links.*`, referenced as full literals in `links.ts`), so each scene's link reads right once its page is published. T1 to T6 translate them in W4a; H16 never edits locale files. Release-2 pages get their labels in a later run, when each is published.
- **Delivers:** a branch merged into `redesign`.
- **Verifies:** the unused-key check passes; in a scratch build with `published: true` on `feature/settle-up`, the tangle and settle scenes link to `/features/settle-up/` with the new label, and without it they link to `/go/app/`.

### W3c: verification and documentation

**H13: verification and fixes.** About 2 agent-days.

- **Model:** default.
- **Depends on:** W3b merged into `redesign`.
- **Inputs:** [Verification](#verification), [Performance strategy](#performance-strategy), the [baseline](./baseline-measurements.md), the [acceptance criteria](#acceptance-criteria).
- **Owns:** every file in `src/components/home/` and `src/styles/home/` (all other homepage packages have finished), any later edits to H4's files (`global.css`, `tokens.css`, `easter-eggs.css`, `EasterEggs.astro`, `public/fonts/`), `src/__tests__/home-features.test.ts` (new), `e2e/home.spec.ts` and `e2e/pages/home*.ts` (new), and `tasks/homepage-screenshots/` (new, evidence).
- **Does:** runs every step in [Verification](#verification) in `en` and the four pseudo-locales, fixes what it finds, switches `home-features.ts` to import from `src/data/features.ts`, and adds the test that every depicted ID is `available`. It reports the Lighthouse and trace numbers in its handover, and the coordinator records them here. Strings it needs go to the coordinator, because `en.ts` has no later English holder; the coordinator reopens H16's slot for them.
- **Delivers:** a branch merged into `redesign`, and `e2e/home.spec.ts`, which P41 reruns in the real locales.
- **Verifies:** every step in [Verification](#verification) passes for `en` and the pseudo-locales; the acceptance criteria that do not need translations are met.

**H14: documentation.** About 0.25 agent-days, in parallel with H13.

- **Model:** Sonnet.
- **Depends on:** P19 (which already removed the stale `CausticRipples`, cursor-aurora and glass-layer text from `AGENTS.md` on `main`) and H11.
- **Inputs:** the [Build plan](#build-plan) file tree; the restructure's step 2.7 and 3.3.
- **Owns:** `AGENTS.md`, in its W3c slot on `redesign`.
- **Does:** adds the homepage structure (`src/components/home/`, the scene controller, lazy confetti, the retired effects), the content collections and the policy snapshots to the Components and Pages sections.
- **Verifies:** every path `AGENTS.md` names exists, and no retired component is named.

### W4: translation and localized checks (restructure)

There are no homepage packages in W4. In W4a the restructure's six groups, T1 to T6 ([Translation fan-out](./restructure-marketing-site.md#translation-fan-out)), translate every pending key once, including this file's `home.*` keys and link labels, remove this file's 102 retired keys, keep the key order of `en.ts`, and update their lock files, setting `pages.home` so the homepage leaves `legacy` (restructure D31). A different group's agent then back-checks each locale. This file's handover to them is the [Translator notes](#translator-notes). In W4b, the restructure's P41 reruns `e2e/home.spec.ts` and [Verification](#verification) steps 3 to 7 in `ar`, `ja`, `hi` and `de`, and fixes layout defects it finds.

### Effort

The total was about 29 agent-days. The 6 days of H12a to H12d now sit in the restructure's T1 to T6 fan-out, and H15 is withdrawn, so this file's own total is about 23. The critical path, about 10.5 days, is:

1. prototype (1.5);
2. foundation (2.5);
3. tangle or worlds (3);
4. verification (2);
5. the translation fan-out (T1 to T6, counted in the restructure task).

## Recorded decisions

Every former owner input is settled by the site plan or by a decision below. This file has no D-numbered decisions of its own: decisions elsewhere are cited as “site plan Dn” or “restructure Dn”. None of these reopens the direction.

1. **Pricing wording.** The [site plan D2](./seo-site-expansion-plan.md#d2-the-pricing-promise-is-free-no-ads-no-daily-limits) promise: “Free. No ads. No daily limits.” The hero line, the pricing scene (with a “See pricing” link to `/pricing/`) and the JSON-LD `offers` block (price 0) use it, and `meta.description` combines it with the trust claim: “Free bill splitting with no ads, no daily limits and no third-party trackers.” “Free forever”, “100% free and unlimited” and “free until it isn't” are never used.
2. **Primary call-to-action destination.** The production app, through the first-party `/go/` redirect counter ([site plan D1](./seo-site-expansion-plan.md#d1-launch-links-go-to-production) and [site plan D5](./seo-site-expansion-plan.md#d5-measurement-uses-search-console-and-a-first-party-launch-counter)). “Create a free account” goes to `/go/register/`, which opens `/register`. Scene links go to `/go/app/`. Both carry `from=home`, the position and `lang`. The header's “Open the app” belongs to the shell. The technical plan in [the restructure task](./restructure-marketing-site.md) owns implementing `/go/` (restructure D28) and the `launchHref()` and `LaunchAppCta` helpers; this task depends on them. A deep link that opens “Create group” was rejected, because every visitor needs an account first.
3. **Feature list and claims.** The site plan's [feature registry](./seo-site-expansion-plan.md#product-feature-registry) is the approved source, with its approved and not-approved wording, [site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies), [site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later), [site plan D11](./seo-site-expansion-plan.md#d11-lists-and-polls-are-framed-around-shared-spending), [site plan D12](./seo-site-expansion-plan.md#d12-no-roadmap-on-the-public-site) and [site plan D15](./seo-site-expansion-plan.md#d15-debt-and-settlement-wording). Scenes depict only `available` IDs, listed in [Registry IDs depicted](#scene-content-shared-by-every-direction). The new copy drops “one tap” and “single tap”, “fewest” and “minimise”, “live rates”, “no tracking”, “zero tracking”, “no data selling”, “your data stays yours” and “no catch”. The trust scene uses “No ads”, “No third-party trackers” and “We don't sell your personal data”.
4. **Imagery: an illustrated story, not screenshots.** The homepage's scenes, including the `AppFrame` interface panels, are illustration built from the real app's tokens and labels, with translated HTML text. Their amounts and currencies are the example group's and are fixed in every locale. Real product screenshots appear on the feature, use-case and how-it-works pages, where they use each locale's home currency per the site plan's [Demo content](./seo-site-expansion-plan.md#demo-content) and come from the scripted capture ([site plan D14](./seo-site-expansion-plan.md#d14-product-imagery-comes-from-scripted-captures)). The former real-imagery swap (H15) is withdrawn. Rationale: the maths stays identical in every language, every word stays translatable and selectable, no capture job has to seed the example group in 39 locales, and the above-the-fold stays free of raster images. [App frames and their app sources](#app-frames-and-their-app-sources) lists what each panel copies.
5. **Example names.** Ava, Ben, Dev, Mei and Sam are translatable strings. Translators may substitute culturally plausible names of up to six characters. Amounts, currencies and the Japan-trip story stay fixed in every locale, so the maths is identical.
6. **Fluent reviewers.** The restructure task's policy applies, and this file defines no policy of its own (its [translation release gate](./restructure-marketing-site.md#translation-release-gate), restructure D31 and D38). Translation happens once, in W4a, after the English homepage and the rest of the English site are finished and verified. Agents translate; a second agent back-translates each locale into English and checks it against the source before merge. Locales that pass ship for visitors but stay `noindex` until a fluent human marks them `reviewed`, and until reviewers exist only English is indexed. Rewriting the homepage's English ends its `legacy` status. The [Translator notes](#translator-notes) are the handover to the translators, checkers and reviewers.
7. **Use-case worlds.** Four, matching [site plan D7](./seo-site-expansion-plan.md#d7-page-set-and-release-order) and [site plan D9](./seo-site-expansion-plan.md#d9-use-cases): housemates, couples, group trips, events and celebrations. Clubs, teams, and work is dropped. Couples appears now and links to the app until its release-2 page is published (see [Use-case worlds](#use-case-worlds)).
8. **What the app is.** Postgres and its own API, with Firebase used only for sign-in. No copy or note in this file calls it a Firebase application.
9. **Dark mode.** None in this release, site-wide or on the homepage (see [Chosen direction](#chosen-direction)). Rationale: the site has none, and a dark homepage inside a light shell would look broken.
10. **Urdu typeface.** `ur` uses Noto Sans Arabic like `ar` and `fa`. Rationale: one Arabic-script subset keeps all three locales inside the 250 KB font budget, while a Nastaliq face such as Noto Nastaliq Urdu is several times larger and needs taller line boxes in every animated layout. Reopen if the fluent `ur` reviewer reports that naskh reads as wrong for Urdu marketing copy.

## App frames and their app sources

Each `AppFrame` panel is an illustration built from the app's tokens and labels, using the example group's data ([recorded decision 4](#recorded-decisions)). It is not replaced by a screenshot. The scene packages copy layout and wording from the app source listed here; shot IDs refer to the site plan's shot list, whose captures can serve as visual reference once they exist.

| Scene | App frame | Source in the app |
|-------|-----------|-------------------|
| 2 | Invite screen: link, “Copy”, QR code, “Or scan this code” | `InviteModal`, Link tab (`ViaLinkContent.tsx`); shot S03 |
| 2 | Member list with five avatars | Group detail, members panel |
| 3 | Add-expense form, empty, “Analysing receipt...”, then filled | `ExpenseFormModal` with AI scanning; shot S09 and clip C1 |
| 3 | Split selector: Equally, Exact amounts, Percentage | `SplitTypeSelector`; shots S05 and S06 |
| 4 | Conversion: “Convert to”, “≈”, “Rate”, edit rate | `ExpenseConversionSection` and `ConversionNote`; shot S07 |
| 5 | Balances list with three rows (optional, beside the board) | `BalanceSummary` and `DebtItem`; shot S10 |
| 6 | Settlement form pre-filled from a quick-settle button | `SettlementForm` and `QuickSettleButtons`; shot S11 |
| 6 | “All settled up!” and payment history with reactions | `BalanceSummary` empty state and `SettlementHistoryItem`; shot S12; the “All settled up!” empty state of `BalanceSummary` |
| 7 | Shared list “4 of 7” (housemates) | `group/lists`; shot S16 |
| 7 | Percentage split 60/40 (couples) | Expense form; shot S05 |
| 7 | Poll “Cast your vote” (trips, celebrations) | `group/polls`; `PollDetailModal` while voting is open (S17 shows the closed state) |
| 7 | Comment with a 🎉 reaction (celebrations) | `comments` and `ReactionBar`; shot S08 |
| 9 | Dashboard “Your groups” with multi-currency balances (optional) | `DashboardPage` and `GroupCard`; shot S01 |
| All | Homepage social preview image (not a frame) | The restructure's default social card (P12, D27) |

## Prototype findings

Recorded from H1's handover and its review, 14 October 2026. The prototype is a standalone build of scene 5 (direction A), published as a [private Artifact](https://claude.ai/artifact/EQWafzFB6S8wqogkTA6m6k). It was measured with Playwright 1.64 in Chromium 1248, with a WebKit 27.2 check, at 1440×900 and 390×844, left to right and right to left. Firefox was not tested. These findings are settled, and H5 to H10 build from them.

**Measurement method.** Main-thread time is the change in CDP `Performance.getMetrics` `TaskDuration` over a whole runway, scrolled by wheel 30 px every 16 ms, at 4× CPU throttle. Each cell was run twice. Long tasks and long animation frames were observed throughout.

**Drive: per-element keyframes, no shared `--t`.**

| Drive | Desktop, 4× (task / style ms) | Phone, 4× | Long tasks |
|---|---|---|---|
| Per-element keyframes on the view timeline | 267–297 / 24–30 | 129–141 / 11–13 | 0 |
| One `@property --t` on the stage, every element derived with `calc()` | 1014–1094 / 800–830 | 456–484 / 341–342 | 0 (one 53 ms animation frame) |
| Fallback driven by `--t` transitions | 1947–2384 / 1698–2103 | 1331–1339 / 1144–1147 | 0 |

- Every animated element has its own `@keyframes`, with `animation-timeline: --scene` and its own `animation-range: contain a% contain b%`. Multi-phase elements (in, dim, out) list several animations on the same timeline.
- No scene registers or animates `--t`. It costs 3.4–4× the main-thread time, almost all of it style recalculation.
- Thread draws animate `stroke-dashoffset`. That runs on the main thread but is cheap: 24–30 ms of style time over the whole desktop run at 4×.

**Timeline alignment.**
- The scene declares `view-timeline-inset: var(--header-h, 88px) 0`. The `contain` range then runs exactly while the stage is pinned under the header, and progress equals scroll position to three decimal places. Without the inset, everything starts about 3% late.
- Under the iOS dynamic toolbar, the stage (`100svh`) unpins up to (lvh − svh) px before `contain 100%`. That falls inside the 90–100% rest stage. H13 checks it on a device.

**Runways and stages.**
- The runway is 280vh on desktop (pinned for 1676 px at 900 px tall) and 240vh on phones (1238 px at 844 px tall).
- The stage ranges stay as planned, and both layouts share them:

| Range | What happens | Timing |
|---|---|---|
| 3–10% | Expense cards dim to 35% | |
| 10–29.5% | IOUs draw | 6% each, staggered 0.75% |
| 30–36% | IOUs fade to 2% | |
| 30–47.8% | Debts draw | 7% each, staggered 1.2% |
| 44–47% | Sticky note lands | |
| 50–54% | Debts dim to 15% | |
| 52–63% | Balances pop | |
| 68–75%, 75–82%, 82–89% | One payment draws in each range, then its tag and a tick | |
| 90–94% | Debts and sticky note leave | |
| 93–96% | Stamp lands | |

**Easing.** The motion tokens are kept: the thread ease on draws, the paper ease on polaroids, the snap ease on pins, tags, the sticky note and the stamp, and linear on opacity fades.

**Threads and arrowheads.**
- Paths use their real length. It is computed at build time and passed as `--L`. There is no `pathLength="1"`.
- Solid threads use `stroke-dasharray: L L`.
- Dashed debt threads use a per-path pattern: `7 4` dashes whose run totals no more than L (`floor(L / 11)` pairs), then a gap of at least L. A longer run leaves dash stubs visible before the draw. The prototype had this bug.
- Arrowheads are separate small paths. Each is placed at build time at the end of its thread and rotated to the thread's tangent. It fades in over the last 1.2% of its thread's draw. `marker-end` is not used, because markers render before the dash draw reaches them.
- Bows: IOUs bow 8 + 6 × the expense number (14 to 38), on opposite sides for opposite directions. Debts bow 14 and payments 18. Edges are shortened by 34 at each end.

**Fallback.**
- The controller appends six hidden, absolutely positioned stage regions to the scene. They span 0–10, 10–30, 30–50, 50–68, 68–90 and 90–100% of the pinned range, offset by `50svh − var(--header-h)`.
- One IntersectionObserver with `rootMargin: '-50% 0px -50% 0px'` sets `data-stage` from the highest intersecting region. When none intersects, it sets 5 if the scene's top is above the viewport and 0 otherwise. Regions, unlike 1 px sentinels, give the right stage on load and after fast flicks.
- Each element has an end-state rule per `[data-stage]`. It transitions `opacity`, `transform` and `stroke-dashoffset` over 700 ms, with its own ease and `transition-delay: calc(var(--i) * 40ms)`.
- The fallback does not transition a shared `--t`. That measured 7–10× the keyframe drive's cost and double-eased.
- The forced fallback plays every stage in Chromium and WebKit.

**Phone and tablet layout.**
- Below 1024 px the tangle uses the portrait board (viewBox `0 0 360 440`), sized `min(100%, (100svh − var(--header-h) − 215px) × 360 / 440)`.
- The heading sits above the board. The four captions share one grid cell below it and crossfade, each opaque only during its own stage. The payments list replaces them from 90%.
- On phones the lede sits in normal flow before the pinned stage. It is never visually hidden.
- `.tangle__visual` has `container-type: inline-size`, so it needs a definite width; it cannot size from its content.

**Right to left.**
- SVG paths and arrowheads are mirrored with `mirrorX()` at build time.
- HTML overlays (polaroids, tags, cards, sticky note, stamp) keep their left-to-right percentages in `inset-inline-start`, with `translate: calc(-50% * var(--dir)) -50%`. No second set of coordinates is needed.
- Signed balances are formatted with `Intl.NumberFormat(intlCode, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0, signDisplay: 'exceptZero' })`, so the sign stays with the number, and the whole result is wrapped in `<bdi>`. Every tangle amount is a whole euro with no decimals.
- Step numbers use the locale's digits.

**Captions and contrast.**
- On desktop all four captions stay visible, and the current one is emphasised.
- Inactive captions, the payments list before 90%, and dimmed expense cards use a muted colour that meets 4.5:1, not reduced opacity. The prototype's 0.45 opacity measured about 2.6:1.

**Reduced motion.**
- Runways collapse and stages are static.
- The tangle renders two boards with visible captions:
  - "Before: 10 debts", the end of stage 2, with ten debts, tags and the sticky note;
  - "After: 3 payments", the rest state, with payments, ticks and the stamp.
- The boards sit side by side above 700 px of available width (`repeat(auto-fit, minmax(min(100%, 340px), 1fr))`) and stack below it.
- Both boards sit inside the one `role="img"` element with the plan's label, so the accessibility tree is identical to the animated page.
- The before board is in the HTML for every visitor but is hidden except under reduced motion. It adds about 15 KB raw.
- Under reduced motion, `animation: none` leaves every element at its end state. The before board gets its stage-2 state from an `.is-before` class.

**`content-visibility`.**
- On the pinned scene itself it does not affect the view timeline.
- On neighbouring sections with a wrong `contain-intrinsic-size`, it caused a 0.0835 layout shift.
- Use it only on scenes after the second whose height is explicit (pinned runways), or with `contain-intrinsic-size: auto <measured height>` per scene. Never use a guessed size.

**`overflow-x`.** With `overflow-x: hidden` on `html` and `body`, the stage scrolls away and the timeline freezes, with progress stuck at 0.669. With `overflow-x: clip`, behaviour is identical to `visible`. This confirms defect 1; H4 fixes it.

**Not yet verified (H13).** Firefox release (the fallback path), tablet widths (600–1023 px), viewports shorter than 560 px (the no-pin rule), and the iOS dynamic toolbar.

## Translator notes

Recorded by the coordinator from H2's handover and review, 14 October 2026. T1–T6 read these before translating `home.*`.

**Budgets.** Chat bubbles ≤ 40 characters; sticky notes and world props ≤ 32; field labels ≤ 18, except the settle form labels, which mirror the app and may run to about 28 ("Who received the payment?"). Keep titles near the English length; bodies ≤ about 220 characters. These are tight animated layouts, so check German and CJK in the pseudo-locales.

**Hedged wording that must survive.**
- "fewer payments" (hero lede): never "fewest" or "minimum".
- "record the payment", "Record Settlement": no money moves; never "pay in the app" or "one tap".
- "can convert … at a current exchange rate, and you can change the rate": never "live", "real-time" or "automatically".
- "140 currencies": never "any currency".
- "fills in … for you to check": no accuracy claim. "Receipt images are read by Google's AI service": keep it unsoftened.
- "Free. No ads. No daily limits.": a fixed promise; never add "forever" or "unlimited".
- The trust items are fixed claims; never strengthen them to "zero tracking", "privacy first" or "your data stays yours". "Only members of a group can see that group." keeps its scope.

**Names.** `home.cast.*` may become culturally plausible local names of up to six characters. Edit together with the cast: `home.chaos.sticky` (Ben), `home.expenses.dinnerNote` (Ava, Ben), `home.expenses.karaokeNote` (Dev); Dev is the one who skips karaoke. Amounts, currencies, Kyoto, izakaya, karaoke, the Japan trip and the baked counts (5 members, 19, ten, three, 10, 4 of 7, 60/40) stay identical; digits may use the locale's numerals.

**Jokes: translate the intent.**
- `chaos.*` and the sticky note: the group chat nobody can follow; the unkept "I'll send it tonight, promise"; a vague half-remembered IOU, where "…" and "?" carry the doubt. `chaos.sheetError` "TOTAL: ???" is a spreadsheet that has given up.
- `expenses.itemRail` "bought early": a mildly smug early purchase.
- `dinnerNote` and `karaokeNote` explain the uneven splits; they are not jabs. Never mock whoever pays less.
- `tangle.smallDebt`: the tiny leftover debt nobody will chase; gentle. `tangle.stamp` "3, not 10": a very short stamped slogan.
- `worlds.title` "Whatever brings your group together": plain and warm; no metaphor to carry.
- World bodies are one dry aside each; "quarterly finance review", "emergency umbrellas" and "someone braver" may become local equivalents. `housemates.propTwo` is housemate fatigue, never blame.
- `cta.receipt*` are short receipt-line nouns, each followed by a "0" the code formats; no price claim.

**Composed by code.** `currency.rate`, `currency.groupTotal` and `currency.convertTo` are bare labels; code appends values. `tangle.owes` and `tangle.pays` may reorder `{from}`, `{to}` and `{amount}` but never drop one. `group.joined` takes `{name}`; `worlds.position` takes `{current}` and `{total}`. Emoji stay unchanged.

**Labels that mirror the app.** `settle.whoPaid`, `settle.whoReceived`, `settle.recordSettlement`, `settle.history`, `expenses.scanning`, `expenses.fieldPaidBy`, `expenses.fieldSplit`, `currency.convertTo`, `group.inviteLink`, `group.copy` and `group.scanCode` use the app's own wording in that language (`webapp-v2/src/locales/<lang>/translation.json` in the app repo).

## Work plan

### 1. Workshop

- [x] Propose two or three distinct creative directions. For each, describe the visual metaphor, motion language, palette, and how each scene turns into the next, with a scene-by-scene storyboard and a rough build and performance cost.
- [x] Recommend one direction.
- [x] Record the chosen direction in this file. The owner asked for the choice to be made in the plan rather than at a stop.
- [x] Build a throwaway prototype of the debt-simplification scene to check the feel, and record the findings (H1). It may adjust details, not the direction.

### 2. Build

- [x] Choose the animation approach on its merits, and record the choice and its bundle cost here.
- [ ] Build the scenes as HTML and SVG with translatable text, not as images with text baked in (H5 to H10).
- [ ] Reuse, rework, or retire the existing effects (`CanopyBloom`, `FloatingParticles`, `MagicalCursor`, glassmorphism tokens) as decided in the audit, and keep `EasterEggs` working (H4).
- [ ] Write every new string in English (H2, H11, H16), then add it to every supported locale once the English site is finished (the restructure's T1 to T6, W4a).
- [ ] Remove homepage translation keys that are no longer used (H11 in English, then the restructure's T1 to T6 in W4a).

### 3. Verify

- [ ] Check in a real browser at mobile and desktop widths, taking screenshots of each scene: in `en` and the pseudo-locales (H13, W3c), then in `ar`, `ja`, `hi` and `de` (the restructure's P41, W4b).
- [ ] Check the reduced-motion version and the fallback path (H13).
- [ ] Re-run Lighthouse and compare with the baseline (H13).

## Constraints

### Motion and interaction

- No scroll-jacking. The wheel and trackpad stay in the visitor's control. A horizontal section moves because the page scrolls, and keyboard and screen-reader users can reach and read all of it. No smooth-scrolling library.
- Design mobile as its own layout, not a squashed desktop one. A horizontal section may become native swipe with snap points, or a vertical stack.
- Under `prefers-reduced-motion`, show a complete, attractive static version with the same content and links.
- In right-to-left locales (Arabic, Persian, Urdu), horizontal travel and directional animation mirror correctly.
- Browsers without scroll-driven animations get stepped transitions with the same content.
- No automatic loop runs for more than 5 s without the visitor scrolling (WCAG 2.2.2).
- The site's celebration happens outside device frames, because the app itself does not celebrate.

### Localization

Follow the translation requirements and release gate in the restructure task. The homepage is built and verified in English first and translated in W4a (restructure D38). On this page in particular:

- expect long German strings and CJK and Indic scripts in tight animated layouts, and check every scene in the pseudo-locales before translation;
- translate the intent of jokes rather than the words;
- never bake text into images or SVG `<text>`;
- format amounts in code for each locale;
- keep amounts, currencies and the Japan-trip story identical in every locale. Only the five names may change;
- every homepage translation passes the restructure task's back-translation check (restructure D31) before merge, and unreviewed locales stay `noindex` until a fluent human marks them `reviewed`.

### Performance

- Do not let LCP or CLS get worse than the baseline.
- Start scenes only when they approach the viewport, and pause animation loops while they are offscreen or the tab is hidden.
- Adopt a heavy or 3D library only when the effect clearly justifies its cost.
- Meet the budgets in [Performance strategy](#performance-strategy).

### Honesty

- Depict only what the app does:
  - three split types;
  - conversion at entry with an editable current rate;
  - settling records a payment and moves no money;
  - simplification is a greedy match within one currency, so the copy says “fewer payments”;
  - the exchange rate is a current rate, fixed when the expense is saved;
  - receipt scanning fills in details for the user to check, with the Google disclosure ([site plan D10](./seo-site-expansion-plan.md#d10-receipt-scanning-is-shown-disclosed-and-gets-its-own-page-later));
  - only registry features whose status is `available`, and only the [site plan D3](./seo-site-expansion-plan.md#d3-trust-claims-match-the-policies) trust claims.
- Example rates are labelled as examples.

## Acceptance criteria

- [x] The chosen creative direction is recorded with its rationale.
- [ ] The homepage answers what, who, why, and what next within the first viewport at 390×844.
- [ ] Every depicted feature is a registry feature with status `available` (IDs listed in `home-features.ts`), and the pricing scene says exactly “Free. No ads. No daily limits.”
- [ ] The example group's numbers are computed from data by the same algorithm as the app, and tested.
- [ ] Each scene links to its first-release page once published, otherwise to the app through `/go/app/`. Sign-up buttons use `/go/register/`, and nothing links straight to the app host.
- [ ] The worlds are the four approved use cases. Couples links to the app until its release-2 page is published, and there is no clubs, teams, or work world.
- [ ] The built homepage contains none of the [approved substitutions](./seo-site-expansion-plan.md#approved-substitutions) “Instead of” phrases, and scene 3 carries the Google disclosure for receipt scanning.
- [ ] Scrolling is never hijacked, and all content is reachable by keyboard and screen reader.
- [ ] The reduced-motion, fallback, and right-to-left versions are complete and correct.
- [ ] There is one `h1`, a sensible heading order, and the homepage JSON-LD appears in the built HTML.
- [ ] LCP and CLS are no worse than the recorded baseline, and the JavaScript and HTML budgets are met.
- [ ] `CanopyBloom`, `FloatingParticles`, `MagicalCursor`, and the tsParticles dependencies are gone, and every easter egg still works.
- [ ] `npm run build`, `npm run i18n audit`, `src/__tests__/translations.test.ts`, and the three new homepage tests pass: in English-first mode through W3, and in strict mode after W4a.
- [ ] Screenshots exist for every scene in `en`, `ar`, `ja`, and `hi` at mobile and desktop widths, the localized ones taken after translation (P41).
- [ ] Every `AppFrame` panel matches its source in [App frames and their app sources](#app-frames-and-their-app-sources), and the homepage contains no screenshots.

## Out of scope

- Feature, use-case, and how-it-works pages, which belong to the restructure task.
- Changes to the external app, including seeding the example group for screenshots.
- Dark mode, site-wide or on the homepage ([recorded decision 9](#recorded-decisions)).
