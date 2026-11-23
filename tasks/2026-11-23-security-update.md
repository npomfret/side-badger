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
review; main pushed; existing GitHub workflow deploys successfully; live routes
and image scan confirm the fix. Preserve the previous deployed image for rollback.

Local acceptance passes: 1,243 unit tests, Astro check with zero errors/warnings,
1,249 generated pages and all 185 output checks. Existing Vitest configs run
one worker without file parallelism. The critical production-dependency audit
passes; remaining audit findings are development tooling (including an unused
Vitest UI advisory) and are not runtime image packages. Keep the existing
GitHub browser shards serial (`max-parallel: 1`, one browser worker).

The old experimental prerender-conflict flag moved to the stable
`prerenderConflictBehavior: 'error'` option. This preserves collision rejection
instead of accepting Astro's warning-only default. Existing Markdown alternates,
schemas, locales and route policies passed their output checks unchanged.
