# Homepage hero redesign: one scan, less clutter

Requested by the owner on 21 November 2026, after the receipt-scan hero (landed 20 November): "it's very easy to miss... it still looks cluttered... what do you think to moving some of the stuff into a section of its own?"

## Why

- **The scan is easy to miss.** Before the scan starts, the receipt sits among the messy-table props, and the result appears in a separate phone. Nothing on the page holds the eye, and the 3-second pass is over before a reader reaches the visual.
- **The copy column is busy.** It has the h1, then a five-line lede that lists features (split methods, 133 currencies, who pays whom), then the actions, then two pieces of small print. The header already has a Sign in button.

## Decisions

1. **The hero keeps the h1 and the primary action together.** It holds four things: the h1, a one-line summary, "Start a group" with the "See how it works" link beside it, and the visual. The owner's sketch moved the whole action block into a band below the hero. That was rejected: on phones it would push "Start a group" below the fold, and the hero would have no action.
2. **Supporting facts move to their own full-width band** directly under the hero copy and visual. It is a list of four short items, each with an icon, and has no heading (UI rule):
   - "Split equally, exactly or by percentage" (`expense-splitting`)
   - "133 currencies" (`multi-currency`; approved substitution for "any currency")
   - "A short list of who pays whom" (`balances`; approved substitution)
   - "Free. No ads. No daily limits." (the existing `home.hero.trust`, approved wording)

   The band is part of the hero scene (`SceneChaos`), after the stage, so it reads as the hero's footing rather than a new section. On a 1280×800 desktop it sits just above the fold. On phones it stacks two by two under the visual.
3. **The lede becomes one line.** New key `home.hero.summary`: "The bill-splitting app for housemates, couples, group trips and celebrations." It keeps the audience words for search and drops the feature list, which now lives in the band. `home.hero.lede` is deleted: it has a new meaning, so it gets a new ID.
4. **The hero small print is removed.** "Already have an account? Sign in" duplicates the header's Sign in button. The trust line moves into the band.
5. **The visual is one phone, larger.** The messy-table props leave the hero. The visual is a single `AppFrame` phone, about 20rem wide on desktop. It is the only object in the right-hand column and plays the whole story inside the screen:
   - **Stage 0, viewfinder:** the taxi receipt fills the screen inside camera corner marks.
   - **Stage 1, scanning:** a scan line sweeps down the receipt, with "Analysing receipt..." (`home.expenses.scanning`).
   - **Stage 2, fields land:** the receipt shrinks to an attachment thumbnail at the top of the form. Description, amount and date land in turn and are ticked.
   - **Stage 3, rest:** the filled form under "For you to check" (`home.hero.scanReview`).

   Motion: only transforms and opacity, including the scan line, which moves with `translateY`. Every stage's space is reserved, so the layout cannot shift.
6. **Pacing gives a reader time.** The pass lasts 4500 ms, with stage boundaries at 15/50/80% (scanning at 675 ms, fields at 2250 ms, review at 3600 ms). It starts after two paint frames on desktop, and on 25% entry on phones, as now. It plays once.
7. **A replay button.** At rest, a small icon button (Lucide `rotate-ccw`) in the phone's corner plays the pass again. Its accessible name and tooltip are the new key `home.hero.replay`, "Play again". It is shown only when a timed engine is running (`native` or `stages`, without reduced motion). In the static engine and without JavaScript it is `hidden`. Replay goes through the existing `playTimedStages`: the controller resets the scene to pending and starts a new pass. A second click cancels the running pass first. No new script file. The added code must keep the homepage within its script budget: currently 4346 bytes gzipped against the 10 KB limit.
8. **No internal workings.** No provider, AI or processing wording appears anywhere (owner rule, `AGENTS.md`).
9. **Dead code goes.** `props/chaos/` pieces used only by the hero (`Spreadsheet`, `ChatPhone`, if no other caller), the hero-only `home.chaos.*` keys (`sheetError`, `receiptGroceries`, `receiptVilla`, `chatDeposit`, `chatPromise`) and `ScanReceipt`, if the phone replaces it, are deleted once their last caller goes. Keys that `page-art.ts` still uses (`chatTaxi`, `sticky`) and `receiptTaxi` stay.

## Plan

1. Build the phone visual from shared props:
   - Extend or reuse `AppFrame`, `AddExpenseForm` and `Receipt`. Add a scan-line, viewfinder and thumbnail treatment owned by `props/expenses/`.
   - The hero maps its stages to the semantic `--scan-*` hooks.
2. Add replay support to `scene-controller.ts` for timed scenes, with a `data-scene-replay` button inside the scene. Unit-test it with the injected scheduler.
3. Add the hero facts band, a new `props/` or `home/` component that `SceneChaos` renders, with inline Lucide icons like the existing inline SVG icons.
4. Copy:
   - English keys: `home.hero.summary`, `home.hero.fact.split`, `home.hero.fact.currencies`, `home.hero.fact.payments`, `home.hero.replay`.
   - Delete `home.hero.lede` and `home.hero.haveAccount` if unused elsewhere.
   - Translate into all 38 locales with blind back-checks, then lock.
5. Tests:
   - Update `e2e/pages/homePage.ts` and `e2e/home-receipt-hero.spec.ts` for the new stages, the band and replay.
   - Run the serial hero spec 20 times.
   - Run `home.spec` and `localized.spec`.
   - Run strict verify.
   - Take screenshots at 1280×800, 375×667 and 375×812 in en, ar, ja and xx-long.
6. Independent UI review, then land.

## Success criteria

- At 1280×800 the phone is the only object beside the h1. The scan line, the fields landing and the ticks are all visible without scrolling, and the facts band starts above the fold.
- The copy column is the h1, one summary line and one action row. There is no small print.
- At rest, "Play again" replays the pass. Under reduced motion the phone shows the filled form and the replay button is not rendered.
- CLS is 0 and the homepage script stays within its budget. A Lighthouse run follows only if the owner asks for one.
- Strict verify passes. The hero spec passes 20/20 serially.
