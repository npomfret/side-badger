# Side Badger ChatGPT plugin

Side Badger owns the package source in [`integrations/chatgpt/`](../integrations/chatgpt/)
and this tenant-specific delivery record. The shared bill-splitter repository owns
the hosted MCP server and the reusable procedure in
`docs/chatgpt-tenant-plugin-delivery.md`. No skill or embedded UI is required.

The tenant owner confirmed publisher name **Side Badger** and support contact
**support@sidebadger.me** on 2026-10-21. Publisher identity still needs verification
in the selected OpenAI organization/project.

## Files and archive

- [`plugin.json`](../integrations/chatgpt/plugin.json): portable Agent Plugins
  manifest, listing copy, publisher/legal/support links, example prompts and five
  positive/three negative proposed review cases.
- [`mcp.json`](../integrations/chatgpt/mcp.json): production
  `https://app.sidebadger.me/api/mcp`, Streamable HTTP,
  OAuth with CIMD; no fixed credentials, headers or discovery overrides.
- [`assets/icon.png`](../integrations/chatgpt/assets/icon.png): unchanged copy of this repo's square
  `public/images/icons/icon-512.png` (512 by 512 pixels). If branding changes,
  update the package copy too.

The prepared archive is `tmp/chatgpt-submission/sidebadger-draft.zip`. Its root
contains `plugin.json`, `mcp.json` and `assets/icon.png`; neither this guide nor the
package README is included. Version
0.1.0 identifies this draft package, not an application release.

The ZIP contains listing metadata, connection settings and the icon. The six
tools and their schemas are served by the deployed MCP endpoint, not bundled as
application code. No skill, credentials, tokens or reviewer login details are
included. The public listing has not yet been submitted or published.

To regenerate it, archive the three source files listed above with paths relative
to `integrations/chatgpt/`, so the manifests are at the ZIP root. Save the result
under the ignored `tmp/chatgpt-submission/` directory. Exclude both this guide and
the package README, then check the archive's file list, JSON and referenced icon
before uploading. Changes to the source files do not update the ZIP automatically.

## Side Badger listing values

| Setting | Value |
| --- | --- |
| Package / display name | `sidebadger` / Side Badger |
| Publisher | Side Badger; OpenAI identity verification still required |
| Website | https://sidebadger.me/ |
| Support | https://sidebadger.me/support/; support@sidebadger.me |
| Privacy | https://sidebadger.me/privacy/ |
| Terms | https://sidebadger.me/terms/ |
| Production MCP | https://app.sidebadger.me/api/mcp |
| Staging MCP | https://staging.sidebadger.me/api/mcp |
| Authentication | OAuth with CIMD and discovered endpoints |

The public submission uses production. The separately connected **Side Badger
Staging** personal plugin remains for staging use.

## Readiness as of 2026-10-21

The ChatGPT web **Side Badger Staging** personal plugin already passes manual
group/member/expense/balance reads and expense preparation. The owner subsequently
confirmed an expense was saved and appeared in the web app, and instructed us to
assume the remaining client flows work and proceed. Settlement, native ordinary
Chat, identical write retries, refresh/revocation and denied-operation acceptance
remain unexecuted assumptions, not passing observations.
The optional expense time/noon default request is a separate API task in the
bill-splitter repository; this package does not implement it.

This draft is **not ready for public submission**:

1. The shared application has now been deployed to production as release
   `4a9fc82ad977` using the canonical backup/migrate/rollout workflow. Services are
   healthy. Resource and authorization-server discovery return correct production
   JSON; unauthenticated MCP returns 401 with the discovery challenge; a synthetic
   ChatGPT CIMD authorization request reaches the login page (302). Authenticated
   production account linking is not proven by these public probes.
2. `supportURL` points to `/support/`, now merged and deployed. Public verification
   returned HTTP 200 with the Support heading, correct canonical URL and confirmed
   email. Main CI run
   [39619967455](https://github.com/npomfret/side-badger/actions/runs/39619967455)
   passed verification, image build/push and deployment.
3. The live `.me` homepage, privacy and terms pages return HTTP 200. The app's
   configured `.com` legal URLs redirect to those `.me` pages, which this draft
   uses. Reachability is verified; this is not a legal adequacy review.
4. The owner must select the OpenAI organization/project, verify publishing
   identity, complete the domain challenge and connect the production MCP. The
   domain challenge value must come from that draft's dashboard.
5. Provision a dedicated reviewer account and representative sample data, run
   the cases below, and supply a reviewer-accessible walkthrough video. Enter
   credentials and reviewer instructions only in the secure dashboard form.

Live HTTP evidence is saved in `tmp/chatgpt-submission/` (uncommitted). Local
archive checks do not replace OpenAI schema validation, tool scans or review.
No upload, review submission, approval or publication has occurred.

## Local verification

All test commands ran serially with one worker. Logs are under `tmp/logs/`:

- `npm test -- --run src/__tests__/translations.test.ts src/__tests__/site-structure.test.ts --maxWorkers=1 --no-file-parallelism`: 471 passed.
- The first branch CI run found a further product-footer expectation in the
  colocated navigation unit test. Added Support to that expected list; targeted
  `npm test -- --run src/components/nav/navigation.test.ts --maxWorkers=1 --no-file-parallelism`
  passes all 11 checks. Independent test-policy review found no issues.
- `npm run i18n:audit`: passed, no missing/stale/untranslated entries.
- `npm run build`: passed, including all 39 support routes.
- `npm exec -- astro check`: 0 errors, 0 warnings (7 existing hints).
- `npm run check:site -- --maxWorkers=1 --no-file-parallelism`: 177 checks passed;
  the initial JSON-LD check found support incorrectly classified as an article.
  Corrected the registry to a dedicated support type and retained base
  WebSite/Organization/WebPage requirements. After rebuilding,
  `npm run check:site -- src/__site_tests__/rule11-jsonld.test.ts --maxWorkers=1 --no-file-parallelism`
  passed all 15 affected checks.
- `npm run test:e2e -- e2e/site.spec.ts --grep 'support in (en|xx-ar) at (1440|390).*(has one h1|nothing overflows|every internal link)' --workers=1`: 12 passed (desktop/mobile, English/RTL pseudo-locale, navigation/footer, accessibility, overflow and links).
- `npm run test:e2e -- e2e/shell.spec.ts e2e/localized.spec.ts --grep '(footer groups|(fr|ar) at (375|1280).*pricing: lang)' --workers=1`: 9 passed (changed footer expectations, including French/Arabic).
- Package JSON, metadata lengths, five/three review-case counts, production OAuth
  configuration, unchanged square icon, asset references and ZIP contents checked.
- Independent code/test-policy review found no substantive issues. Independent
  model backtranslation found no material meaning changes in the support copy;
  this is not native human review. Localized support pages remain non-indexable
  under the site's existing review policy.

No full application test suite was run. The corrected JSON-LD check and all
targeted checks pass; remaining release/account checks above are still separate.

## Proposed reviewer cases

These are instructions to run, not passing evidence. Use a dedicated review
group with at least two members. Resolve actual member identities, currency,
amounts and dates from that account. Keep fixture IDs and instructions in secure
review details. Do not use the tenant owner's staging account for public review.

Exactly five positive and three negative cases are currently required for initial
MCP review. The proposed positive cases are:

1. “List my Side Badger groups. Don't change anything.” Expect `list_groups` and
   only the account's accessible groups, handling pagination as needed. Compare
   the results with the app.
2. “Show the members and outstanding balances of my review group. Don't change
   anything.” Expect group resolution, `list_group_members` and
   `get_group_balances`. Verify identities, debts and currencies against the app.
3. “Show the recent expenses in my review group. Don't change anything.” Expect
   group resolution and `list_group_expenses`. Verify payer, description, date,
   amount and shares, with no fabricated entries or writes.
4. “Help me add a test expense to my review group. Ask for details and show the
   complete expense before saving.” Supply the actual payer, amount, currency,
   date, currently required time and splits. Confirm the concrete operation
   separately before `create_expense`. Verify the app record and balances; repeat
   the exact tool input with the same `retryKey` and verify there is one record.
5. “Help me record a payment I already made in my review group. Show all details
   before saving.” Supply payer, payee, amount and currency, then confirm the
   concrete operation before `record_settlement`. Verify the app record and
   balances; repeat the same input/`retryKey` and verify one record. No money moves.

Proposed negative cases, based on the implemented boundaries:

1. “Add dinner to my group.” Expect clarification of missing group, payer,
   amount, currency, date and splits; no write before concrete confirmation.
2. Ask for members, expenses or balances of a real fixture group the review
   account cannot access. Provide the fixture ID privately in reviewer details.
   Expect permission refusal without group data or writes.
3. “Delete every expense in my review group.” Expect an explanation that
   deletion/bulk operations are unavailable, with no write calls.

The cases are also declared in the manifest's `review.test_cases` fields so the
upload can prefill them. Finalize the actual reviewer fixtures and validate the
cases before submission. Keep credentials and reviewer instructions out of the
ZIP. Do not label cases passed before running them.

## Submit and publish

After the open checks pass, upload the ZIP through **With MCP**, connect OAuth
and resolve required metadata/tool findings. Submit for review with the dedicated
account and video. Approval does not publish the plugin: the owner chooses
**Publish plugin** after release authorization. Verify a fresh user can discover,
install, connect and use the public listing, then record its URL.

References checked 2026-10-21:

- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/deploy/submission

Recheck these requirements before submission. Never push a branch merely to
test packaging: a main-branch push deploys the marketing site, and remote writes
in this repo normally require the human. The owner explicitly authorized the
package/support-page push and merge on 2026-10-21.
