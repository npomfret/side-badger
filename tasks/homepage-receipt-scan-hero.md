# Receipt scan in the homepage hero

Requested by the owner on 19 November 2026. Status: planned, not started.

## Why

Receipt scanning is Side Badger's strongest feature: snap a receipt and the expense form fills itself in. The homepage already shows it, but as scene 3 (`SceneExpenses`), after the hero (`SceneChaos`) and the group scene (`SceneGroup`). Most visitors have to scroll past two scenes to see it, and on phones it is far below the fold. The owner wants it near the top.

## What exists

- `SceneExpenses` (`src/components/home/scenes/SceneExpenses.astro`) has four stages:
  - 0: a receipt beside an empty add-expense form.
  - 1: scanning, with a camera frame and "Analysing receipt..." (`home.expenses.scanning`).
  - 2: the description, amount and date land in the form as strips and are ticked off.
  - 3: three expense cards in the ledger.
- `SceneExpenses` is pinned on desktop and tablets and plays as you scroll; on phones it plays on entry. Reduced motion rests at stage 3. The Google disclosure (`home.expenses.scanNote`) sits under the receipt whenever the receipt is on screen.
- The props it uses are `Receipt` and the `props/expenses/` kit: `AddExpenseForm`, `LedgerCard` and `helpers.ts`.
- The hero is `SceneChaos`: the h1, the lede and the actions, beside a "messy table" of props (a taxi receipt, a spreadsheet, a chat phone, a sticky note). It tidies as it scrolls out and rests at the mess under reduced motion.
- Registry facts (`receipt-scanning` in `src/data/features.ts`):
  - What it does: on a new expense, the AI fills in the description, total, currency, date, time and place, plus a text copy in the notes, for you to check.
  - Approved claims: "Snap the receipt and Side Badger fills in the total, date and place for you to check", "Free, with no scan credits", and the Google disclosure.
  - Not approved: any accuracy claim, splitting by item, "works with PDFs", and on-device or private processing.

## Decisions

1. **The scan becomes the hero's visual.** The taxi receipt from the messy table is scanned into the add-expense form while the rest of the mess fades back. That tells problem and fix in one image, above the fold on desktop. Rejected alternatives:
   - Moving `SceneExpenses` to scene 2: cheaper, but still below the fold.
   - A separate scan section under the hero: it would duplicate the hero's job and lengthen the page.
2. **The hero plays it once, after load.** The hero is the first thing on screen, so it can't depend on scroll.
   - The sequence is receipt, scanning frame, fields landing and ticks, then a rest on the filled form with the fields marked for checking. It takes about 3 seconds, starting shortly after first paint.
   - It doesn't loop. Under reduced motion, and in the `static` engine, it rests on the filled form.
   - On phones the visual sits under the call to action, so it plays when it enters the viewport.
   - Use the scene controller's existing mechanisms (stages, entry scenes, `data-static-stage`). If a timed "play on load" mode is missing, add it to `scene-controller.ts`. Add no new script and no scroll listener (AGENTS.md homepage rules).
3. **`SceneExpenses` drops its scan stages.** It starts from the filled form and keeps "split it your way" and the ledger cards, so the scan isn't shown twice. Update its stage contract and the controller's `data-*` documentation.
4. **"For you to check" is shown, not just said.** The rest state marks the filled fields as ready to review, for example with ticks and a "check the details" cue. Showing a perfect, final result would amount to an unapproved accuracy claim.
5. **Copy reuses what exists.**
   - Reuse the existing `home.expenses.*` strings (scanning, field labels, the scan note) and the approved registry wording. If the hero needs one short caption, add a single `home.hero.scan*` key, of at most six words, drawn from the approved claim.
   - The Google disclosure stays visible whenever the receipt is on screen, in the hero too.
   - Mock-up labels follow the app's own `webapp-v2` translations (follow-ups "App-mirroring labels follow the app").
6. **Performance and layout.**
   - The h1 stays the LCP element. The visual's size is reserved, so there is no layout shift (CLS ≤ 0.05).
   - Animate only transforms and opacity.
   - The homepage keeps within its current script size.
   - Use logical properties, and check `/ar/`, a CJK locale and the `xx-long` pseudo-locale.
7. **It fits the hero tidy-up of 19 November.** The copy column stays: the h1, the lede, one actions row, and one small-print line with the trust text and Sign in. This task changes only the visual slot.

## Plan

1. Build the hero visual from the existing props: `Receipt`, `AddExpenseForm` and the scanning frame from `SceneExpenses`. Factor shared pieces into `props/expenses/` rather than copying them.
2. Add the timed one-shot playback to the scene controller if it's needed. Wire the hero's stages; the rest state is the static stage.
3. Trim `SceneExpenses` to its non-scan stages and update its header comment and `docs/site-structure.md`.
4. New strings, if any, go into `en.ts` and all 38 locales: translated, then back-checked blind (D31), with a strict build before landing.
5. Update the homepage page object and e2e specs (`e2e/pages/homePage.ts`). Cover the stages, reduced motion, `?scenes=stages`, the phone entry path, axe after the animation settles (`expectAnimationsSettled`), and no horizontal overflow.

## Success criteria

- At 1280×800, a first-time visitor sees the scan play beside the h1 within about a second of load, without scrolling. It ends on a filled form marked for checking, with the Google disclosure visible.
- On a 375×812 phone it plays when the visual scrolls into view. Under reduced motion it shows the filled form at once, with no motion.
- No accuracy claim, no splitting by item and no PDF scanning appears anywhere. The approved registry claims still pass `registry.test.ts`.
- Homepage Lighthouse on mobile, run with `scripts/lighthouse-local.sh` before and after: LCP and CLS within the D36 thresholds, and no regression against the current homepage.
- Strict `npm run verify` passes, and the homepage e2e specs pass serially with one worker. Any new timing wait is repeated 20 times.

## Measurement

Compare `/go/register/` clicks from `from=home&cta=hero` for four weeks before and after release. The counts are first-party (D28), and a change is a signal, not proof.
