# Receipt scan in the homepage hero

Requested by the owner on 19 November 2026. Status: built and landed on 20 November 2026; Lighthouse before/after run on 21 November 2026 (no change, within D36). Only the four-week measurement remains, tracked in `follow-ups.md`.

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

1. [x] Build the hero visual from the existing props. `props/expenses/ScanReceipt` owns the factored camera frame, receipt and persistent Google disclosure; `AddExpenseForm` supports a taxi sample and timed scan/review presentation. The original hero copy is unchanged. Normal-flow form/receipt reserve every stage's space.
2. [x] Add one-shot playback to the existing controller. `play="once"`, `duration={3000}`, boundaries `[13, 50, 90]`: stage 0 receipt/mess, stage 1 scanning at 390 ms, stage 2 fields at 1500 ms, stage 3 review at 2700 ms; final opacity transition ends at 3000 ms. Desktop starts after two paint frames; phones observe 25% visual entry. Stages/native use the same timers, separate from scroll-stage observers. Cleanup cancels timers/observers and invalidates late callbacks; a started pass rests rather than replaying after breakpoint/motion changes. Static/reduced motion/no-JS rest at stage 3.
3. [x] Trim `SceneExpenses` to filled form at stage 0 and ledger at stage 1, with updated header comment, ranges and `docs/site-structure.md`. The form has no scan animation there.
4. [x] Add and confirm translations. `home.hero.scanReview` (English: “For you to check”) added in English and all 38 locales. The coordinator blind back-checked all 38 translations and corrected Arabic to “جاهزة لمراجعتك”, then ran `npm run i18n -- lock --all --keys home.hero.scanReview`. The lock updates are intentional; agent back-check does not claim fluent human review.
5. [x] Author page-object-only homepage coverage: all stages and actual rendered fields/camera/captions, taxi field values, rest, no replay on re-entry, reduced motion, static short viewport, `?scenes=stages`, 375×667 phone entry from below the hero, axe after `expectAnimationsSettled`, and overflow. Arabic, Japanese and `xx-long` rest layouts are included. The settle helper waits eligible pending/playing timed scenes before finite animations, with audited assertion outcomes. The page object uses e2e-local formatting (`INTL` from `layoutsFixtures`), because app modules depend on `import.meta.env` and cannot load in Playwright.
6. [x] Independent UI review, review fixes (below), browser re-runs and a visual check.

## Success criteria

- At 1280×800, a first-time visitor sees the scan play beside the h1 within about a second of load, without scrolling. It ends on a filled form marked for checking, with the Google disclosure visible.
- On a 375×667 phone it plays when the visual scrolls into view. Under reduced motion it shows the filled form at once, with no motion.
- No accuracy claim, no splitting by item and no PDF scanning appears anywhere. The approved registry claims still pass `registry.test.ts`.
- The hero copy stays the LCP element (the lede paragraph, before and after). The visual sits in normal flow with every stage's space reserved, so the animation cannot shift the layout: CLS is 0.
- Strict `npm run verify` passes. The homepage e2e specs pass serially, and the new timing tests are repeated 20 times.

## Verification evidence (20 November 2026, after the review fixes)

- **E2E,** all serial with `--workers=1`:
  - `e2e/home-receipt-hero.spec.ts` passed 260/260 with `--repeat-each=20`.
  - `e2e/home.spec.ts` plus `e2e/localized.spec.ts` passed 258/258.
- **Strict `npm run verify`:** 1238 unit tests, the i18n audit, `astro check` with 0 errors, the build, and `check:site` 185/185.
- **The e2e records the stage sequence in the page** (`recordTimedStages` in `e2e/pages/homePage.ts`) rather than sampling a stage that lasts under 400 ms. The no-replay check asserts that the sequence is still `0, 1, 2, 3` after the visitor leaves and comes back.
- **Phone-entry test and axe.** The phone-entry test leaves out axe, because mid-page the next scene's scroll-linked fades are part-way through. The rest tests run axe at 375 and 1280 in en, ar, ja and xx-long.
- **Screenshots** of the built site at 1280×800, 375×812 and 375×667:
  - At stage 0 the disclosure sits above the mess, on the scene's own surface colour (`--surface`), so there is no visible box at rest.
  - The scanning frame and "Analysing receipt..." show mid-pass.
  - The rest state shows the ticked fields and "For you to check".
  - At 375×812 the visual is about half on screen at load and plays immediately. At 375×667 it waits until scrolled into view.
- **Bundle size:** the loaded homepage bundles total 4346 bytes gzipped, within the 10 KB script budget.

## Review fixes

- Restored the expenses phone ledger override's scene and phone-entry qualifiers so its compiled selector outranks the common entry rule.
- Shared receipt/form props consume semantic CSS state hooks, with the numbered stage mapping owned by `SceneChaos`. Inactive captions also use visibility transitions; static/no-JS rests on the review cue. Reveal duration and field stagger use shared motion tokens.
- Stacked the full receipt column above the mess and backed the disclosure with the scene's surface token (`--surface`, which is `--table` in the hero). ChatPhone retains AppFrame's responsive `min(100%, 17.5rem)` width, border-box sizing and 9/17 aspect ratio inside a 42%-wide, scaled mess wrapper. Containment was confirmed in screenshots at 375 and 1280.
- Removed the unused scene exit mode from props, emitted attributes, controller observer/branch and CSS. `ScrollScene` now discriminates timed playback so `play="once"` requires a numeric duration.

## Lighthouse (21 November 2026)

`scripts/lighthouse-local.sh --dist … --urls / --devices mobile --runs 5`, strict builds of `7b110c1` (before the hero) and `1d42585` (main), medians:

| Build | Perf | FCP | LCP | CLS | TBT | a11y | SEO | Script | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| Before | 99 | 1.28 s | 1.95 s | 0 | 0 ms | 100 | 100 | 5650 B | 155 KB |
| After | 99 | 1.28 s | 1.95 s | 0 | 0 ms | 100 | 100 | 5936 B | 155 KB |

The LCP element is the hero lede in both builds. There are no third-party requests. Every D36 threshold is met. The run also fixed `--dist` mode, which had stopped working once nginx began including the build's generated `markdown-headers.conf`.

## Remaining work

- **Measurement,** below, four weeks after release.

## Measurement

Compare `/go/register/` clicks from `from=home&cta=hero` for four weeks before and after release. The counts are first-party (D28), and a change is a signal, not proof.
