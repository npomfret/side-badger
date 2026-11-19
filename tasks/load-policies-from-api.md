# Load legal policies dynamically from the app API

Requested by the owner on 19 November 2026. Status: captured; implementation pending.

## Direction

Restore browser-side loading of the current legal policies from the production app API. The app owns the policies; this repository should not keep copies, periodically sync them or require a marketing-site deployment to publish policy changes.

Build the static policy page shells without contacting the API. Fetch the policy when a visitor opens the page. If the API is down, do not show policy text on the page; the rest of the page and site still load. This must not prevent the marketing site from building or serving its pages. Show a clear loading/error state and a retry control instead of a bundled stale copy.

This owner instruction replaces the snapshot approach recorded in follow-ups decision D10. The current implementation remains until this task is carried out; this task does not ask for unrelated changes to the legal wording or account-deletion feature registry.

## History

- Dynamic API policy pages were introduced in `0461f9e` on 10 December 2025.
- Commit `7b26b2ca3cd61cc22fcaccb4ac9071695a4680db`, on 14 October 2026 at 22:25 BST, replaced them with committed snapshots, build-time rendering and a daily sync/PR workflow. Its subject is “Pre-render policies from committed snapshots and sync them daily”. The parent version of `PolicyPage.astro` is a useful reference for the previous browser-side loader, rather than a change to revert wholesale.
- Commit `8a27422` on 18 November 2026 refreshed the snapshots; it did not introduce the architecture.

## Implementation

- [ ] Keep `/privacy/`, `/terms/` and `/cookies/` and their localized shells, navigation, metadata and indexing rules. Fetch current Markdown from `https://app.sidebadger.me/api/policies/{policy-type}/text` in the browser. Use `/current` for publication metadata if needed; verify the actual API contract when implementing.
- [ ] Render fetched Markdown safely, sanitizing generated HTML and link destinations before insertion. Preserve readable headings, accessible keyboard-scrollable tables, and a single page h1.
- [ ] Provide translated loading, failure and retry UI, appropriate busy/status announcements, a bounded request timeout and a usable no-JavaScript explanation/link to the source policy. Keep the English notice and `lang="en"`/`dir="ltr"` while the source policy is English. Display publication dates only from API metadata.
- [ ] Check browser access from the production marketing origins, including CORS and the site's CSP. Any necessary API-side configuration belongs in the app repository. Never use staging as the production source.
- [ ] Remove `src/content/policies/*.md`, its collection/schema in `src/content.config.ts`, `scripts/sync-policies.mjs`, `.github/workflows/policy-sync.yml`, the `policies:sync` package command and any snapshot-only dependencies or checks. Retain unrelated content configuration and feature evidence.
- [ ] Update `AGENTS.md`, follow-ups D10 and its obsolete policy-sync/token/timestamp owner actions, plus other current documentation that prescribes committed copies. Record the new runtime dependency accurately.
- [ ] Reconcile generated Markdown alternates with dynamic policies: do not represent a loading shell as the complete policy or reintroduce policy copies to feed the Markdown build. Choose an honest source link or exclude these alternates as appropriate, and update their output checks.

## Validation and acceptance

- [ ] A clean strict build and the normal output checks succeed with policy API access unavailable; no build step fetches policy text or needs local policy snapshots.
- [ ] Browser checks show the current API content on all three policy pages, including a localized shell and an RTL locale. Updating the API policy is visible on a fresh page load without a marketing-site rebuild or deployment.
- [ ] Exercise delayed, failed, timed-out, empty and malformed API responses and successful retry; ensure unsafe Markdown cannot execute script and tables remain usable by keyboard and on mobile.
- [ ] Run appropriate unit/output/browser checks serially with one worker, first confirming no other controlled test run is active. Update checks that assume policies are rendered at build time.
- [ ] No committed policy bodies, scheduled policy-sync PRs or duplicate source of policy truth remain. The marketing page shell still loads when the app API is unavailable.
