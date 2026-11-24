# December homepage lights

Add a small festive string of lights along the top of the homepage each December.

The inventory is the shared `HomePage.astro` used by the English and localized homepage routes; other pages keep their existing shell. `ChristmasLights.astro` owns the decorative SVG and styles, with palette and header clearance in the shared token layer. The homepage's existing before-paint script selects December using the visitor's local calendar, so a November static build still works in December. A reload outside December hides the lights. Without JavaScript the decoration stays hidden.

The lights remain steady, are hidden from assistive technology and cannot intercept input. A December-only header offset leaves space for the strand while retaining the existing `--header-h` geometry for content and scenes. No text or translation keys change.

Reuse search: no Christmas-light or seasonal-decoration implementation exists in this repo or the other project workspaces (cross-workspace matches were unrelated RiTa dictionaries). Use the existing `HomePage` head script, token layer and `SitePage` browser driver with its audited waiting boundary; the SVG follows the homepage's existing decorative illustration approach rather than the interface icon set.

Acceptance: lights show on December 1 and 31, stay hidden on November 30 and January 1, work on desktop and 320px phones including Arabic and reduced motion, leave navigation usable and content clear of the header, and never appear on pricing. Browser checks use a controlled browser clock, one worker, and serial execution.

The December header removes 24px from short-phone pinned stages. Extra regression checks caught a deterministic 12px overflow in the Japanese pseudo-locale at 320×568 in both scene engines (copy starts 6px above the stage; link ends 6px below). A failure investigator confirmed the existing AppFrame fitting contract is the appropriate mechanism. The existing ≤599px/≤600px settle rule now uses `--frame-zoom: 0.55` only in December, keeping the internal width, text wrapping and heading/link sizes unchanged. Other months retain 0.6.

Verification (24 November 2026), run serially with one worker:

- `npx playwright test e2e/christmas-lights.spec.ts --workers=1`: all 26 passed after the regression fix. Includes local-calendar boundaries in a timezone differing from UTC, English/Arabic desktop and 320px layouts, native/fallback settle fitting with expanded Latin/Japanese pseudo-locales, menu opening/dismissal, reduced motion/axe and pricing exclusion.
- `npm run compile`: 0 errors, 0 warnings; strict 1,249-page build passed after the final CSS change.
- Final `npm run check:site -- --maxWorkers=1`: all 185 output checks passed against that strict build.
- Desktop English and 320px Arabic previews visually inspected; captures retained under root `tmp/logs/christmas-*.png`. Original clipping evidence is in `tmp/logs/christmas-clipping-before/`; accepted browser and compile logs use the `christmas-accepted-*` prefix.
- Independent `ui-change-reviewer`: no substantive findings, including review of the December-only fitting adjustment. Reviewer and investigator ran no tests or builds.

Status: implementation verified and independently reviewed; ready to land. Durable component behaviour is recorded in `docs/site-structure.md`.
