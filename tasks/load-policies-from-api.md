# Load legal policies dynamically from the app API

Requested by the owner on 19 November 2026. Status: done. Landed and deployed on 19 November 2026 (`7d79914`, back-check `2749502`, e2e fix `c504e06`; CI run 44514200268 deployed), and checked in production.

## Direction

Restore browser-side loading of the current legal policies from the production app API. The app owns the policies; this repository should not keep copies, periodically sync them or require a marketing-site deployment to publish policy changes.

Build the static policy page shells without contacting the API. Fetch the policy when a visitor opens the page. If the API is down, do not show policy text on the page; the rest of the page and site still load. This must not prevent the marketing site from building or serving its pages. Show a clear loading/error state and a retry control instead of a bundled stale copy.

This owner instruction replaces the snapshot approach recorded in follow-ups decision D10 (D10 is rewritten). This task does not ask for unrelated changes to the legal wording or account-deletion feature registry.

## History

- Dynamic API policy pages were introduced in `0461f9e` on 10 December 2025.
- Commit `7b26b2ca3cd61cc22fcaccb4ac9071695a4680db`, on 14 October 2026 at 22:25 BST, replaced them with committed snapshots, build-time rendering and a daily sync/PR workflow. Its subject is “Pre-render policies from committed snapshots and sync them daily”. The parent version of `PolicyPage.astro` is a useful reference for the previous browser-side loader, rather than a change to revert wholesale.
- Commit `8a27422` on 18 November 2026 refreshed the snapshots; it did not introduce the architecture.

## Implementation

- [x] Keep `/privacy/`, `/terms/` and `/cookies/` and their localized shells, navigation, metadata and indexing rules. Fetch current Markdown from `https://app.sidebadger.me/api/policies/{policy-type}/text` in the browser. Use `/current` for publication metadata if needed; verify the actual API contract when implementing.
- [x] Render fetched Markdown safely, sanitizing generated HTML and link destinations before insertion. Preserve readable headings, accessible keyboard-scrollable tables, and a single page h1.
- [x] Provide translated loading, failure and retry UI, appropriate busy/status announcements, a bounded request timeout and a usable no-JavaScript explanation/link to the source policy. Keep the English notice and `lang="en"`/`dir="ltr"` while the source policy is English. Display publication dates only from API metadata.
- [x] Check browser access from the production marketing origins, including CORS and the site's CSP. Any necessary API-side configuration belongs in the app repository. Never use staging as the production source.
- [x] Remove `src/content/policies/*.md`, its collection/schema in `src/content.config.ts`, `scripts/sync-policies.mjs`, `.github/workflows/policy-sync.yml`, the `policies:sync` package command and any snapshot-only dependencies or checks. Retain unrelated content configuration and feature evidence.
- [x] Update `AGENTS.md`, follow-ups D10 and its obsolete policy-sync/token/timestamp owner actions, plus other current documentation that prescribes committed copies. Record the new runtime dependency accurately.
- [x] Reconcile generated Markdown alternates with dynamic policies: do not represent a loading shell as the complete policy or reintroduce policy copies to feed the Markdown build. Choose an honest source link or exclude these alternates as appropriate, and update their output checks.

## Validation and acceptance

- [x] A clean strict build and the normal output checks succeed with policy API access unavailable; no build step fetches policy text or needs local policy snapshots.
- [x] Browser checks show the current API content on all three policy pages, including a localized shell and an RTL locale. Updating the API policy is visible on a fresh page load without a marketing-site rebuild or deployment.
- [x] Exercise delayed, failed, timed-out, empty and malformed API responses and successful retry; ensure unsafe Markdown cannot execute script and tables remain usable by keyboard and on mobile.
- [x] Run appropriate unit/output/browser checks serially with one worker, first confirming no other controlled test run is active. Update checks that assume policies are rendered at build time.
- [x] No committed policy bodies, scheduled policy-sync PRs or duplicate source of policy truth remain. The marketing page shell still loads when the app API is unavailable.

## Implementation record (19 November 2026)

Verified contract (curl, production): `GET /api/policies/{privacy-policy,terms-of-service,cookie-policy}/text` is 200 `text/plain; charset=utf-8` Markdown (`/api/policies/privacy/text` is 404); `/current` is 200 `application/x-serialized-json` carrying `id`, `policyName`, `currentVersionHash`, `text` and `createdAt` (the publication date). Both send `cache-control: no-store`.

Decisions:

- **CORS and CSP.** The API answers with `access-control-allow-origin` set to the requesting origin: checked for `https://sidebadger.me`, `https://www.sidebadger.me` and an unrelated origin. The site's CSP (`nginx/default.conf`) is only `frame-ancestors 'self'; upgrade-insecure-requests`, with no `connect-src`, so no change is needed here. No API-side change is required today; the dependency is that the app keeps allowing the production marketing origins (and keeps the policy ids and `/text`, `/current` paths).
- **No custom request headers and `credentials: 'omit'`**, so the browser sends no preflight (the API allows only `Content-Type`, `Authorization` and `X-Correlation-ID`). Do not add `cache: 'no-store'` to the fetch: browsers turn it into `Cache-Control` request headers and a preflight that the API refuses.
- **Rendering.** `marked` only tokenizes (`Lexer`); tokens become an allowlisted element tree (`src/components/policy/policy-tree.ts`) built with `createElement`/`setAttribute`/`createTextNode`. Raw HTML is never parsed (block HTML shows as text, inline tags are dropped), images become their alt text, link destinations must be http, https, mailto or relative (control characters and whitespace are stripped first), and external links carry `rel="noopener noreferrer"`. `marked` is 13 KB gzipped, so it is a separate chunk fetched with the request; the page script is 2.4 KB gzipped (budget 10 KB at load).
- **Headings** shift so the shallowest becomes h2 (the page keeps one h1). Tables sit in `role="region" tabindex="0"` scroll regions labelled by the preceding heading (or the h1).
- **States.** Always-present `role="status"` polite region shows the loading message, then the failure message plus a Try again button; the body has `aria-busy`. Timeout is 10 s via `AbortController`, also bounding the parser chunk. HTTP errors, network errors, empty bodies, JSON/HTML/XML replies, NUL bytes, over 1,000,000 characters and Markdown with nothing to show are all failures. The date comes only from `/current` `createdAt` and never delays the text; no date if that request fails. `<noscript>` explains and links to the source text.
- **Markdown alternates.** Legal pages are excluded (`hasMarkdownAlternate` in `src/site/pages.ts`, used by the `<link rel="alternate">`, the generator and the output check): a Markdown copy of a loading shell would pass the shell off as the policy, and a copy of the policy would bring back a stored duplicate. `scripts/check-markdown.mjs` now also checks that `/privacy/index.md` and `/fr/terms/index.md` are 404 and that `Accept: text/markdown` on the legal pages still gets HTML.
- **JSON-LD.** The English legal pages no longer emit `dateModified` (it came from the snapshot), so rule 11's "English legal WebPage has a dateModified" requirement and its fixtures were removed.
- **Strings.** Five new keys (`policy.loading`, `policy.error`, `policy.retry`, `policy.noscript`, `policy.sourceLink`) in every locale, translated by the implementing agent (machine; nothing marked reviewed) and locked with `npm run i18n lock`. Worth a fluent look: the three RTL locales (`ar`, `fa`, `ur`).
- **Removed:** `src/content/policies/*.md`, the `policies` collection, `scripts/sync-policies.mjs`, `.github/workflows/policy-sync.yml`, the `policies:sync` script. `marked` and `github-markdown-css` stay (the page and the Markdown tests use them).
- **Docs:** `AGENTS.md`, `README.md`, `docs/markdown-representations.md`, `tasks/follow-ups.md` (D10 rewritten, the sync-PR and timestamp owner rows and the open-work bullet updated).

Evidence (all one command at a time, worktree `tmp/worktrees/policies-api`, logs in its `tmp/logs/`):

- `npx vitest run --maxWorkers=1`: 29 files, 1233 tests passed (`unit-all.log`); new: `policy-markdown.test.ts` (XSS payloads, `javascript:` links, raw HTML, `onerror`, heading shift, table regions), `policy-source.test.ts` (500, network failure, timeout, empty, JSON/HTML, NUL, metadata cases), site-structure test for `hasMarkdownAlternate`.
- `npm run i18n:audit`: in sync, 0 unconfirmed (`i18n-audit.log`). `npx astro check`: 0 errors (`astro-check.log`).
- Strict `npm run build` with every connection to `*.sidebadger.me` refused by a preloaded guard (`tmp/ad-hoc-scripts/block-app-network.cjs`; a control request was caught and logged, the build logged none): exit 0, 1249 pages, 1131 Markdown representations, no policy fetch (`build.log`). `npm run check:site`: 16 files, 184 tests passed (`check-site.log`).
- `npx playwright test e2e/policy.spec.ts --workers=1` (API stubbed with `page.route`): success on all three pages, delayed, 500, retry then success, 10 s timeout (page clock), timeout then retry, empty, JSON, NUL-byte body, no metadata, XSS payload (no dialog, no `window.__xss`, no script/img/iframe/handler/`javascript:` link), no-JavaScript fallback, 375 px table scroll and keyboard, `de` and `ar` at 1280 and 375 including axe: 25 passed on the first full run after the fix and the 8 localized cases re-run green (`e2e-policy.log`, `e2e-policy-locales.log`). The other page objects (`SitePage`, `SiteAudit`, `LocalizedPage`) stub the API so no other spec reaches the real one.
- Live API, real Chromium (`tmp/ad-hoc-scripts/live-policy-check.mjs`, `live-check.log`): `/privacy/`, `/terms/`, `/cookies/` in `en`, `de` and `ar` each showed the current policy (first line equal to the live `/text`), one h1, the date from `/current`, no console errors, `ar` with `dir="rtl"` and the policy body `lang="en" dir="ltr"`. A policy change is therefore visible on the next load with no rebuild (the page has no build-time policy content).
- `npm run check:nginx` before landing: 353 passed, 0 failed, including the Markdown suite with the legal-page 404s.
- Strings: the five `policy.*` keys were back-checked blind in 38 locales by four independent agents (PL-check); nine locales fixed for register or wording.
- CI: shell.spec failed once on axe colour contrast because the check could sample the policy table mid-fade. Fixed in `c504e06`: a shared `expectAnimationsSettled` before shell axe checks, and `SitePage`/`SiteAudit` wait for the stubbed policy text on legal pages.

Review (independent agent): no sanitizer or race defects found. Fixed: focus after a successful Try again moves to the policy body. Rebutted: `/text` content type is `text/plain` (verified by curl, recorded above), so the JSON/HTML guard is safe; the current policies contain no relative or in-page links (only two https links), so link rebasing and heading slugs are not needed yet; a failed parser chunk lands in the catch and shows Retry. Not done: an e2e for Retry during an in-flight request and a late `/current` reply (guarded by the attempt counter, covered by reasoning only).

Production check, 19 November 2026 (`tmp/ad-hoc-scripts/live-policy-check.mjs`): `/privacy/`, `/terms/`, `/cookies/`, `/de/privacy/` and `/ar/terms/` on https://sidebadger.me each loaded the live policy (one h1, `aria-busy="false"`, body `lang="en" dir="ltr"`, `/ar/` page `dir="rtl"`, no page errors); the date from `/current` shows a moment after the text. `/privacy/index.md` and `/cookies/index.md` return 404; `scripts/check-markdown.mjs https://sidebadger.me` passed 145 checks.

Upstream note (app data, not this repo): the cookie policy `createdAt` (17 November) differs from its text's "Last revised: 16 November".
