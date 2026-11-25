# Search-result pricing copy

The owner flagged an indexed homepage/pricing screenshot promising "totally free"
and "Free Forever"; Side Badger will have a paid tier. Public HTTP checks on
25 November 2026 confirm that neither phrase is currently served by `/` or
`/pricing/`, and both `/en-gb/pricing` forms redirect directly to `/pricing/`.
The screenshot is stale relative to production; Search Console's index state is
not available in this checkout.

Tighten the current pricing metadata as well: name the pricing page without a
blanket free claim, and describe the included free features, current limits and
pricing terms. Keep the current homepage metadata, which already scopes "free"
to receipt scanning. Do not announce an unreleased paid plan or its price.

Scope inventory before editing: `pricing.meta.title` and
`pricing.meta.description` in the 39 maintained catalogues: en, ar, bn, cs, cy, da,
de, el, es, eu, fa, fi, fr, ga, hi, hr, hu, id, is, it, ja, ko, lv, nl-BE, no,
pcm, ph, pl, pt, ro, sl, sr, sv, sw, te, tr, uk, ur, zh; the corresponding
38 non-English locks; and the Search Console owner action in `tasks/follow-ups.md`.
No new keys, routes, components or metadata mechanism. `PricingPage` already
supplies these keys to `SeoHead`, which owns title, description, social metadata
and JSON-LD; the Markdown build uses the rendered page. Use `i18n-manager` import
and key-specific locks rather than a second catalogue editor. Agent translations
are not fluent-human-reviewed.

Acceptance: the scoped metadata no longer implies a perpetual or universal free
offer; all 39 catalogues agree in meaning, strict i18n checks pass, and rendered
pricing metadata/Markdown reflect the new values. Existing alias redirects remain
the consolidation mechanism. Record recrawl as an owner action rather than
claiming that a push changes Google's cached result immediately.

The owner also requested the shorter English heading "Uses". Its visible label
inventory is `nav.useCases` (desktop header, mobile menu, hub footer link and
ancestor breadcrumbs), `footer.useCases` (footer group heading), and the hub's
English content `navLabel`. Keep the existing IDs and `/use-cases/` URLs. The
38 existing localized labels still mean uses/examples of use, so their text
remains appropriate for this English wording simplification; refresh only these
two source-key locks and the hub content hashes after checking that the source
label is the only content change. No new headings, controls or translation keys.

The approved substitutions registry also bans "totally free" and "completely
free", reusing its existing English-copy checks. The lasting paid-tier decision
is recorded in `docs/marketing-site-design.md` D2; it does not announce a plan.

Verified serially with one worker: strict `i18n:audit`; 432 translation and
11 navigation tests; 44 registry tests (including the expanded substitutions);
15 existing desktop-header, footer and mobile-menu browser checks in English
and the four pseudo-locales; strict compile/build with zero errors and warnings,
1,249 pages and 1,131 Markdown representations; and the complete production
output suite (185 checks). English desktop-header and phone-menu screenshots were inspected;
the new pricing title and description also appear in generated Markdown.

Independent UI review found no substantive findings, including the final banned
phrase and durable-documentation changes. New translated strings are exactly
`pricing.meta.title` and `pricing.meta.description` in the 38 non-English
catalogues above; they are agent-written and have not had fluent-human review.
Existing localized Uses labels and hub copy are unchanged. The Pidgin pricing
title naturally matches English and is explicitly approved with the existing
`i18n-manager lock --identical` mechanism.

Implementation is verified and reviewed; delivery is pending. Search Console
ownership/recrawl remains in `tasks/follow-ups.md`, outside this copy change.
