# Follow-ups after the redesign release

The site redesign (restructure task, homepage task and release 1 of [the site plan](./seo-site-expansion-plan.md)) shipped to production on 15 October 2026. The completed plans were deleted on 16 October 2026; read them in git history at `d4b0a08` (`tasks/restructure-marketing-site.md`, `tasks/homepage-scroll-experience.md`, `tasks/baseline-measurements.md`). This file keeps what is still open and the decisions other documents cite.

## Open work

- **App policy data (upstream).** The policy pages load the app's current text in the browser (D10; `AGENTS.md` External Dependencies). In the app's data, the cookie policy `createdAt` (17 November 2026) differs from its text's "Last revised: 16 November"; correcting it belongs in `wl-bill-splitter`.
- **P35 app screenshots.** Waits for the capture script and demo scenario in `wl-bill-splitter` (site plan follow-up 9 and D14). This repo owns the shot list (site plan "Shot list", `src/data/screenshots.ts`), optimization and placement. Until then English pages may use `placeholder-en` shots, and localized pages show none.
- **Release 2** shipped: calculators, guides, four feature pages, couples, page art, the Splitwise comparison and the help page. Its plan was deleted on 20 November 2026; read it in git history (`tasks/release-2-plan.md`, last at `5dc2138`). The Splitwise reframe is open in [reframe-app-comparison.md](./reframe-app-comparison.md).
- **AI discovery and integration docs** are tracked in [ai-discovery-and-integration-docs.md](./ai-discovery-and-integration-docs.md): research-led product copy, Markdown delivery for agents, Pro API documentation, standalone MCP access, and ChatGPT/Claude plugins combining MCP and skills. Implementation has started with Markdown delivery; API contracts, entitlement decisions and integration release verification remain dependencies.
- **Search reviews** at 4, 8 and 12 weeks after release (site plan success measures, `/go/app/` counts by `from`), once Search Console and Loki access exist.
- **Menu button has no tooltip.** Below 30rem the header's Menu button shows only its icon (`MobileNav.astro`, `nav.css`) but has no Tooltip, unlike the sign-in and language buttons. At large text on a phone it is also the only way to Sign in (the bar drops its link below 20rem).
- **Settle scene clips at 320 x 568 in long text.** In the `xx-long` pseudo-locale on a 320 x 568 phone, the pinned settle scene's h2 starts about 26 px above its stage and the "see how" link ends about 26 px below it, so both are clipped (measured 21 November 2026 with `tmp/ad-hoc-scripts/pinned-clip-probe.mjs`; it was there before the homepage moved onto the shared content column, which added 3 to 4 px). English and 360 x 640 fit.
- **Header logo vs content edge.** The floating header bar has its own inset (`--header-inset`), so its logo does not sit on the content column's edge: 1 to 9 px off on phones and tablets, about 25 px at 1024 to 1247 px, on it at 1280 and wider. Aligning it means deriving the bar's inset from the column, which changes how far the bar sits from the window's sides; an owner design call.
- **Calculator script headroom.** The split calculator loads 10,020 bytes of gzipped script against the 10,240-byte budget (21 November 2026, after the shared Tooltip and the LanguageSwitcher's tooltip setter). The next script added to the calculator pages needs a matching saving first.
- **"No ads" and "no paid tier" elsewhere.** The owner took them out of the hero row because ads and a paid tier may come (22 November 2026). The rest of the site still promises both: `footer.tagline` on every page, `meta.description`, `home.pricing.body`, `home.trust.adsTitle`, the pricing page, some feature content, the registry (`privacy-posture.no-ads`) and the approved substitution in `substitutions.ts`. The owner has not yet said whether the decision covers the whole site.
- **Real-device checks** of the homepage: the iOS toolbar behaviour, and a VoiceOver pass.
- **Install happens in the app.** Since 17 October 2026 this site has no web manifest; its copy says
  sign in, then add Side Badger to the home screen. The app now offers installation itself and its
  manifest passes Chrome's installability check (app commits `276634759`, `683b85b1b`), and its
  sign-up page sends signed-in visitors to the dashboard. Still open: watch `/go/app/` counts for
  `cta=header` and `cta=menu` to see how returning phone users sign in. The hero's own
  sign-in link (`cta=hero-sign-in`) was removed in the hero redesign of 21 November 2026.
- **Receipt scan hero measurement.** The hero receipt scan shipped on 20 November 2026; Lighthouse before and after was unchanged (mobile 99, LCP 1.95 s, CLS 0). From 18 December 2026, compare `/go/register/` clicks with `from=home&cta=hero` for the four weeks before and after release. The hero was redesigned again on 21 November 2026 (one phone scan and a new facts band), so treat the window as covering both changes. The counts are first-party (D28), and a change is a signal, not proof. The plan is in git history (`tasks/homepage-receipt-scan-hero.md`).

## Owner actions

| Dependency | Owner action | Default until then |
|---|---|---|
| Search Console | Confirm the domain property, submit the sitemap, export baseline reports. | The search reviews wait. |
| Production field data | Run PageSpeed Insights on production (CrUX at p75: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). | Lab measurements only. |
| Branch protection | Require the `verify` check on `main`. | The CI gate still blocks deploys. |
| Manual deploy | `scripts/deploy.sh` (now rsync, `--delete` confined to `src/`, `public/`, `nginx/`, `scripts/markdown/`) uploads the local `docker-compose.yml` (service `website`), but CI's `scripts/deploy-ci.sh` installs `docker-compose.prod.yml` (service `side-badger`, the proxy's alias) in the same directory. A manual deploy would overwrite CI's compose file and its container would likely get no traffic; the next CI deploy removes it. Decide whether to retire `deploy.sh` or make it deploy the prod compose. | Deploy through CI only. |
| Loki access | Read access to the edge box's Loki. | The `/go/` counter logs; counts are read later. |
| ChatGPT listing | The ChatGPT listing must go live (and Claude be accepted end to end) to back the homepage claim (release 2 R10). | From 21 November 2026 the homepage claims "Works with ChatGPT and Claude" (owner decision, ahead of the listing; registry `ai-assistants`). |
| Fluent reviewers | Find reviewers for the priority markets, starting with any locale with at least 50 clicks a month in its Search Console baseline. | Only English is indexed (D31). |
| Translated policies | Translated, legally reviewed policies are a task in `wl-bill-splitter`. | Localized policy pages show the English text with a translated notice. |

## Fluent review

Every localized page is `checked` (independently back-translated by an agent) and `noindex`. Before a marketing drive, the owner wants a detailed human review. Its input is [docs/fluent-review-notes.md](../docs/fluent-review-notes.md): a full Codex review of 22 locales on 20 November 2026, with points left for a fluent human. 16 locales (cs, el, fi, hr, hu, id, is, lv, ph, pl, sl, sr, sv, sw, tr, uk) have not had that review. A fluent human reviews a complete locale (all published pages) in one pass and records `reviewed` with their name and date; only then is the locale indexed. Agents never write `reviewed`. Agents may run `review-translations` as a pre-review pass.

Open questions for reviewers:
- whether `pricing.faq.q2.answer` quotes the English terms or a translation (locales differ);
- ar: "Side Badger" in Latin script against older "سايد بادجر" strings;
- de: du/Sie mix in older keys;
- sr: "AI" left in Latin script;
- pt: "enquetes" is the Brazilian form in otherwise European Portuguese;
- pcm: the English-identical values in `identicalApproved` need confirming;
- the style notes in each back-check commit body (`git log --grep=back-check`).

## Translation rules learned in W4a

- **App-mirroring labels follow the app.** UI labels on the homepage mock-ups and UI names in page prose use the app's own `webapp-v2/src/locales/<locale>/translation.json` wording. Exceptions: where the app's string is ungrammatical (fr `recordSettlement`, ga `scanning`), over the label budget (id `fieldPaidBy`), and pt (below).
- **pt is European Portuguese** (`intlCode` pt-PT). The app's `pt` is Brazilian, so app labels use European equivalents (Registar, A analisar, Ou leia este código, gerido). Revisit if the app adds pt-PT or the site adds pt-BR.
- **Numbers typed in prose use the locale's format**, including £ amounts in worked examples, the 999,999.99 cap and 2,000,000 rupiah. Symbol placement follows the locale (de "2.000 £", fr "2 000 £", nl-BE "£ 2.000", id "£2.000"); ga, cy and the locales that write numbers English-style keep "£2,000". Percent signs follow the locale too (eu "%30").
- **Common back-check failures**, worth checking first: a hedge dropped ("no set limit" → "no limit"); a limit changed ("older than 18" for "18 or over"); the pricing description claiming the terms guarantee it stays free (they promise notice); rupiah read as rupee; "weekend" as "week"; a paragraph moved to a different section.

## Decisions still in force

Numbered as in the deleted restructure task; the site plan cites them as "restructure Dn".

| ID | Decision |
|----|----------|
| D8 | A page in a locale is indexable only when it is published and its review status is `reviewed` (fluent human) or `legacy`. Every other built page carries `noindex` and is left out of the sitemap and `hreflang`. |
| D10 | Legal policies are not copied into this repository. The policy pages are static shells that fetch the current Markdown (`/api/policies/<id>/text`) and publication date (`/current`) from the production app API in the visitor's browser, so a policy change shows on the next page load without a site deploy. The build never calls the API. If the API fails, times out (10 s) or answers with an empty or malformed body, the page shows a translated message with a Retry button and no policy text (owner decision of 19 November 2026; it replaces the committed-snapshot design of 14 October). Legal pages have no Markdown alternate, because their built HTML is only a shell. Localized policy URLs show a translated "English only" notice and the English text marked `lang="en"`, and carry `noindex`. |
| D11 | Long-form localized copy lives in YAML content collections, one file per page per locale, validated by Zod schemas in `src/content/schemas.ts`. Rich text is inline Markdown only. |
| D16 | The feature registry is a typed TS module, `src/data/features.ts` (with `use-cases.ts` and `types.ts`), English and internal, transcribed from the site plan's registry. |
| D20 | `/features/` and `/use-cases/` hubs; articles live under `/guides/<slug>/`. The wait for search data was lifted on 21 October 2026 (release 2 plan R4, in git history). |
| D24 | No third-party font requests. Latin, Cyrillic and Greek locales use self-hosted Inter and Space Grotesk; Arabic-script and Indic locales add one self-hosted Noto Sans subset each; CJK locales use system fonts. |
| D27 | Social cards are language-neutral 1200×630 PNGs built by `src/pages/og/[card].png.ts`; the localized title is in `og:title`. |
| D28 | No client analytics. Launch clicks are counted by nginx at `/go/app/` and `/go/register/` (no IP, user agent or referrer). |
| D31 | Agents translate (`machine`); an independent agent back-translates and compares (`checked`). Only `checked` or `reviewed` content reaches `main`. `checked` pages ship for visitors but stay `noindex` until a fluent human sets `reviewed`. |
| D33 | Screenshots come from the app repo's capture script (seeded fictional data, every locale, desktop and mobile). Manual English captures only as `placeholder-en`, shown on English pages only. |
| D36 | Inner pages meet fixed thresholds: Lighthouse mobile performance ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.05, accessibility ≥ 98, SEO 100 on indexable pages, no third-party requests, script at load ≤ 10 KB gzip, total transfer ≤ 300 KB. `scripts/lighthouse-local.sh` measures them. |
| D38 | English content may be built before its translations in English-first mode (`I18N_MODE=english-first`, see `AGENTS.md`), but `main` always runs strict: every locale complete before anything deploys. |
