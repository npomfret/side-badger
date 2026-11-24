# Astro/nginx security update and TeamCity migration

Owner approved production security updates on 23 November and directed that
Side Badger verification run on the estate TeamCity Mac agents.

Astro is 7.4.13 with matching official integrations and a fresh exact lockfile;
nginx is pinned to official 1.30.7. Critical production dependency advisories
block the canonical verify command. Static URL/content/locale/collision checks
remain. Astro 7's new whitespace default caused a language-tooltip regression;
`compressHTML: true` preserves the previous output. The exact regression passes.
Astro's supported `--ignore-lock` keeps preview in the foreground for Playwright.
The failed GitHub run passed 884 cases before catching that regression and never
deployed. Its remaining jobs were cancelled, and GitHub Actions is now retired.

TeamCity applies exact revision 37ec5b9. Compile, Static Checks, Unit Tests,
Integration Tests and three serial Browser Tests feed All Checks. Every agent
leg and production deployment use the existing high_cpu writer lock; every test
runner uses one worker. Clean workspaces expire after artifacts publish, even
on failure. The terminal VCS trigger preserves push-to-main deployment while
the nightly All Checks does not deploy. This documented exception to placing
VCS triggers on composites avoids nightly production releases.

Accepted on 24 November:

- Compile 3431 and Static Checks 3432 passed.
- Unit 3433: runner and JUnit processing both report 1,243 cases. Two pre-existing
  fixture tests have the same label, producing 1,242 unique TeamCity names.
- Integration 3434: 185 output checks, four real-Git/fake-SSH transport scenarios.
- Browser 3435/3436/3437: 885, 884 and 884 cases; all 2,653 pass. Each JUnit
  processed count matches its runner. All Checks 3438 passed.
- Deploy 3439 passed through the new dedicated production identity. The host
  built the exact Git archive, passed all 185 output checks and 353 existing
  nginx smoke checks, including launch-log privacy and Markdown negotiation.
  Container health and public HTTPS passed. The whole deployment took about
  seven minutes; builder build/output checks took about 335 seconds on prod.
- The live healthy container is exact 37ec5b9, image
  sha256:25b49416056762dd5fabf0bdb9ac7b627aceaa031712086b1736d97a824bab42;
  nginx reports 1.30.7. The previous immutable image remains tagged for rollback.

The new deployment selects its pinned public identity/host key and requires an
exact APPLIED receipt. Failed container/public acceptance restores the previous
immutable image. Fixed owned tags and current/previous source retention avoid
unbounded releases while leaving older untagged layers to estate GC. No volume
is pruned. SSH keys live in iCloud and TeamCity; only public material is committed.
GitHub source access uses a separate read-only key. Existing human, backup and
old CI authorizations remain intact. Scoped operations registration never pauses
the queue or changes other projects/agents. Operations b1ba282/69118f8 passed
5 registration, 11 Linux-root key and 7 virtual-runtime guard cases.

Independent reviews are clean after correcting verify composition, retained
launch-log checks, bounded image/source retention and trust rejection diagnostics.
All four deployment transport cases passed serially. The
TeamCity shim matches the canonical shared template. Durable operations are in
docs/ci.md. Final production scan completed 24 November at 00:41:16 UTC:
all 21 running images scanned without failure. The live Side Badger image
25b494160567 has zero critical findings; its nginx/Brotli findings are cleared.
One libxml2 high remains outside this critical-remediation scope. No acceptance
entry was added. Operations evidence: sec10-footy-betty-scan-report-20261124T004118.json.
Acceptance is complete; delete this task in a separate follow-up commit.
