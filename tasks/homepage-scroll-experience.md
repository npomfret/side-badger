# Build the homepage scroll experience

## Status

Planned

## Objective

Replace the current homepage with a scroll-driven story that is very visually pleasing, explains Side Badger quickly, and routes visitors into deeper pages and the app.

This is the homepage item in step 6 of [the marketing site restructure](./restructure-marketing-site.md). The homepage's responsibilities, voice, and editorial guardrails are defined in [the site plan](./seo-site-expansion-plan.md#homepage).

The finished homepage should:

- feel alive: the world transforms scene by scene as the visitor scrolls, with playful animations showing use cases and features in action rather than a wall of feature cards;
- answer what Side Badger is, who it helps, why it is different, and what to do next;
- send each scene to the page that covers it in depth, and every visitor towards the app;
- stay accessible, localized, fast, and complete with motion turned off.

## Dependencies

These come from the restructure task. If one is not yet done when this work starts, do it here or record why it is deferred.

- **Rendered head slot** (step 2): required for the homepage `SoftwareApplication` JSON-LD to reach the built page.
- **Lighthouse and Core Web Vitals baseline** (step 1): capture before changing the homepage.
- **Feature status** (step 4): until the feature registry exists, depict only features in `src/i18n/en.ts` under `features.*`. Never depict `comingSoon.*` items.
- **Free-tier promise** (step 4): do not say “free forever” until the pricing conflict is resolved.
- **Deeper pages** (step 6): link a scene to its feature or use-case page once that page is published. Until then, the scene's call to action leads to the app. Do not publish placeholder pages to satisfy a link.

## Story outline

This is a starting point. Expand and improve it during the workshop.

1. **Chaos.** Crumpled receipts, a doomed group-holiday spreadsheet, a group chat full of “who paid for the taxi?”. Scrolling begins to pull it into order.
2. **A group forms.** An invite link or QR code goes out and people drop in.
3. **Expenses land.** Split equally, by exact amounts, or by percentage. A receipt is photographed and its details lift themselves out of the image.
4. **Currencies collide.** Euros, dollars, and yen convert at live rates.
5. **The tangle.** A messy web of who-owes-whom arrows simplifies into the fewest payments. This is the strongest visual and should be the centrepiece.
6. **Settle up.** One tap, payment history, emoji reactions, a small celebration.
7. **Worlds.** A strip, horizontal where it suits the design, in which each use case is its own environment with its own palette and props, and the same group and expense mechanics play out inside it.
8. **Trust.** No ads, no tracking, no data selling. Short and visual.
9. **Pricing summary and launch call to action.**

### Use-case worlds

Start from the five clusters below, then expand them with sub-scenarios, sharper personas, and the features each one relies on. These pairings are assumptions to validate in the workshop, not approved claims.

| World | Example situations | Features it leans on |
|-------|--------------------|----------------------|
| Housemates | Rent, bills, shared groceries, the toilet roll nobody else buys | Shared lists, balances, settlements |
| Couples and families | Shared household costs, uneven incomes, children's activities | Percentage splits, balances |
| Holidays and group travel | The villa, the taxis, the unclaimed cocktail round | Multiple currencies, live rates, receipt scanning, polls |
| Parties, weddings, and gifts | Venue deposits, stag and hen weekends, group presents | Polls, comments, invites |
| Clubs, teams, and work | Pitch fees, team lunches, offsites, school trips | Permissions, QR invites, settlements |

## Work plan

### 1. Workshop

- [ ] Propose two or three distinct creative directions. For each, describe the visual metaphor, motion language, palette, and how each scene turns into the next, with a scene-by-scene storyboard and a rough build and performance cost.
- [ ] Recommend one direction.
- [ ] Build a throwaway prototype of the hardest scene, either the debt simplification or the worlds strip, to judge the feel.
- [ ] Stop for a decision, then record the chosen direction in this file.

### 2. Build

- [ ] Choose the animation approach on its merits: native CSS scroll-driven animations (`animation-timeline: view()` and `scroll()`) as progressive enhancement, or GSAP with ScrollTrigger for pinned sections. Record the choice and its bundle cost here.
- [ ] Build the scenes as HTML and SVG with translatable text, not as images with text baked in.
- [ ] Reuse, rework, or retire the existing effects (`CanopyBloom`, `FloatingParticles`, `MagicalCursor`, glassmorphism tokens) so the page reads as one coherent design. Keep `EasterEggs` working.
- [ ] Add every new string to every supported locale.
- [ ] Remove homepage translation keys that are no longer used.

### 3. Verify

- [ ] Check in a real browser at mobile and desktop widths in `en`, `ar`, `ja`, and `hi`, taking screenshots of each scene.
- [ ] Check the reduced-motion version.
- [ ] Re-run Lighthouse and compare with the baseline.

## Constraints

### Motion and interaction

- No scroll-jacking. The wheel and trackpad stay in the visitor's control. A horizontal section moves because the page scrolls, and keyboard and screen-reader users can reach and read all of it.
- Design mobile as its own layout, not a squashed desktop one. A horizontal section may become native swipe with snap points, or a vertical stack.
- Under `prefers-reduced-motion`, show a complete, attractive static version with the same content and links.
- In right-to-left locales (Arabic, Persian, Urdu), horizontal travel and directional animation mirror correctly.

### Localization

Follow the translation requirements and release gate in the restructure task. On this page in particular, expect long German strings and CJK and Indic scripts in tight animated layouts, and translate the intent of jokes rather than the words.

### Performance

- Do not let LCP or CLS get worse than the baseline.
- Start scenes only when they approach the viewport, and pause animation loops while they are offscreen or the tab is hidden.
- Adopt a heavy or 3D library only when the effect clearly justifies its cost.

## Acceptance criteria

- [ ] The chosen creative direction is recorded with its rationale.
- [ ] The homepage answers what, who, why, and what next before the visitor has scrolled far.
- [ ] Every depicted feature is listed as available, and the page makes no unresolved pricing promise.
- [ ] Each scene links to its published deeper page or to the app.
- [ ] Scrolling is never hijacked, and all content is reachable by keyboard and screen reader.
- [ ] The reduced-motion and right-to-left versions are complete and correct.
- [ ] There is one `h1`, a sensible heading order, and the homepage JSON-LD appears in the built HTML.
- [ ] LCP and CLS are no worse than the recorded baseline.
- [ ] `npm run build`, `npm run i18n audit`, and `src/__tests__/translations.test.ts` pass.
- [ ] Screenshots exist for every scene in `en`, `ar`, `ja`, and `hi` at mobile and desktop widths.
- [ ] Placeholders still awaiting real product imagery are listed in this file.

## Out of scope

- Feature, use-case, and how-it-works pages, which belong to the restructure task.
- Changes to the external Firebase application.
