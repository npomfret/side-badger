# Astro and nginx security updates

Owner approved the production application security updates on 23 November.
Upgrade Astro 5 to 7.4.13 with its official sitemap/check integrations and
follow the Astro 6 and 7 migration guides. Add the existing estate convention
`audit:deps` (critical production-dependency advisories) to `verify`, which CI
already requires before building/deploying. Pin the static runtime to official
nginx 1.30.7, fixing the nginx/Brotli package findings in the deployed image.

Keep the static output, URL rules, content/locale checks and browser acceptance.
Read current custom Markdown integration/schema callers before adapting APIs;
do not remove output or collision checks to make the upgrade pass.

Acceptance: lockfile-exact install, critical audit, serial unit/output checks,
Astro checks/build, browser suite and actual-image nginx smoke pass; independent
review; main pushed; TeamCity verification and deployment succeed; live routes
and image scan confirm the fix. Preserve the previous deployed image for rollback.

Local acceptance passes: 1,243 unit tests, Astro check with zero errors/warnings,
1,249 generated pages and all 185 output checks. Existing Vitest configs run
one worker without file parallelism. The critical production-dependency audit
passes; remaining audit findings are development tooling (including an unused
Vitest UI advisory) and are not runtime image packages. The GitHub browser run was cancelled after its first failing shard; no production deployment occurred.

The old experimental prerender-conflict flag moved to the stable
`prerenderConflictBehavior: 'error'` option. This preserves collision rejection
instead of accepting Astro's warning-only default. Existing Markdown alternates,
schemas, locales and route policies passed their output checks unchanged.

The first browser shard found one regression (884 cases passed): Astro 7's
new default JSX whitespace compression removed the separator between the
language name and regional subtitle, making the tooltip say `EnglishAmerican`.
Independent source/artifact investigation confirmed the old rendered output
contained that space. Keep the prior lossless `compressHTML: true` policy;
retain the existing tooltip assertion and rerun that exact browser case before
the full gate. Remaining jobs from the failed run were cancelled; it did not
deploy to production.

Local browser startup also exposed Astro 7's automatic background preview
server in agent sessions. Playwright requires a foreground process; the
supported `--ignore-lock` flag selects that behavior. Stop the owned background
server through Astro's own stop command. Preserve web-server stdout in the
existing Playwright configuration so build/startup failures have diagnostics.

Owner directed that Side Badger checks run on the estate's TeamCity agents.
Replace the GitHub workflow and two divergent deployers with the shared shim,
Kotlin settings and one gated deployment. Compile, static checks, unit, output
integration and three browser shards use clean workspaces, one worker and the
existing estate high_cpu writer lock. JUnit and failure artifacts always publish.
A VCS trigger on terminal Deploy (Production) deliberately preserves automatic
main deployment; nightly All Checks does not ship. This is the reason for the
exception to the composite-only VCS trigger convention.

The production host builds the exact Git archive and runs the existing nginx
checker, including launch-log privacy checks. Its Node-only Markdown checker
runs in the builder image, so neither the host nor the CI agents need another
toolchain. The current and previous immutable runtime image IDs are retained
under fixed owned tags; older untagged images follow estate garbage collection.
Source cleanup selects only owned hexadecimal release directories, retaining
the current and previous accepted revisions.

The old GitHub private deployment key cannot be retrieved from encrypted
secrets. A new dedicated TeamCity production identity is held in iCloud and
installed through the operations key helper; it does not remove human/backup
or old CI authorization. Repository access uses a separate read-only key.
Scoped registration reuses the existing SSH-only API transport and never pauses
the queue or changes other projects/agents/Root resources.

Four transport integration tests pass serially using real local Git archives
and fake SSH processes: exact revision/clean source, host and identity pinning,
upload/apply errors, mandatory completion receipt, scratch cleanup and retained
remote errors. The focused tooltip regression passes (1 case, 29.2 seconds).
Independent review caught dropped Astro diagnostics, skipped launch-log checks
and unbounded tagged images; all three were corrected. Full TeamCity import,
complete test chain, actual-image acceptance and live scan remain pending.

Migration verification repeated successfully: all 1,243 unit tests and 185 output
checks pass with JUnit output, Astro diagnostics remain zero, and 1,249 strict
pages build. All four transport tests pass after adding precise trust rejection
diagnostics. Independent follow-up review has no substantive findings. Shell
syntax/checks pass and the TeamCity shim matches the shared template exactly.
The ops registration/key installer is pushed as b1ba282; production key SSH/SFTP
checks passed and GitHub confirms the repository key is read-only. Full TeamCity
verification and live deployment are still the acceptance gate.
