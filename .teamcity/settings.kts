import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildFeatures.sshAgent
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.schedule
import jetbrains.buildServer.configs.kotlin.triggers.vcs

version = "2026.1"

// Green proves the existing strict checks, unit/output suites and all three serial
// browser shards passed. Local acceptance on 23 November: 1,243 unit tests and 185
// output checks. The complete browser gate must pass here before production ships.
// Docker and actual-image nginx acceptance run on prod during deployment; the Mac
// agents neither run Docker nor test live services. No credentials enter test legs.

val requireNode = """
    set -eu
    required_node=26
    required_npm=10

    version_file=.node-version
    [ -f "${'$'}version_file" ] || { echo "no ${'$'}version_file in the checkout; it names the Node version this build runs on." >&2; exit 1; }
    wanted="${'$'}(tr -d '[:space:]' < "${'$'}version_file")"

    NVM_DIR="${'$'}{NVM_DIR:-${'$'}HOME/.nvm}"
    [ -s "${'$'}NVM_DIR/nvm.sh" ] || { echo "this agent has no nvm at ${'$'}NVM_DIR; side-badger selects Node ${'$'}wanted through nvm." >&2; exit 1; }
    # nvm is not written to survive `set -u`, and --no-use keeps it off the default version.
    set +u
    . "${'$'}NVM_DIR/nvm.sh" --no-use
    nvm use "${'$'}wanted" >/dev/null 2>&1 || { set -u; echo "this agent's nvm cannot provide Node ${'$'}wanted (from ${'$'}version_file); install it there." >&2; exit 1; }
    set -u

    command -v node >/dev/null 2>&1 || { echo "nvm selected Node ${'$'}wanted but left no 'node' on PATH." >&2; exit 1; }
    command -v npm >/dev/null 2>&1 || { echo "nvm selected Node ${'$'}wanted but left no 'npm' on PATH." >&2; exit 1; }
    node_major="${'$'}(node -p 'process.versions.node.split(".")[0]')"
    npm_major="${'$'}(npm --version | cut -d. -f1)"
    [ "${'$'}node_major" -ge "${'$'}required_node" ] || { echo "side-badger needs Node 26 or newer; this agent has ${'$'}(node --version)." >&2; exit 1; }
    [ "${'$'}npm_major" -ge "${'$'}required_npm" ] || { echo "side-badger needs npm 10 or newer; this agent has ${'$'}(npm --version)." >&2; exit 1; }
    echo "node ${'$'}(node --version), npm ${'$'}(npm --version)"

    echo "##teamcity[setParameter name='env.PATH' value='${'$'}(dirname "${'$'}(command -v node)"):${'$'}PATH']"
""".trimIndent()

fun BuildType.workspace(directory: String) {
    maxRunningBuilds = 1
    publishArtifacts = PublishMode.ALWAYS
    params {
        param("env.TMPDIR", "%system.teamcity.build.tempDir%")
        param("system.teamcity.build.checkoutDir.expireHours", "0")
        param("env.I18N_MODE", "strict")
        param("env.CI", "true")
    }
    vcs {
        root(DslContext.settingsRoot)
        checkoutDir = directory
        cleanCheckout = true
    }
    // Owner requires serial builds/tests on the shared Mac, including unit and
    // compilation legs. A writer deliberately excludes every high_cpu reader.
    features { sharedResources { writeLock("high_cpu") } }
}

fun console(command: String) = """
    set -eu -o pipefail
    mkdir -p tmp/ci-logs
    $command 2>&1 | tee tmp/ci-logs/check.log
""".trimIndent()

fun leg(identifier: String, title: String, command: String, report: String? = null, browser: Boolean = false) = BuildType {
    id(identifier)
    name = title
    workspace("side-badger-" + identifier.lowercase())
    artifactRules = "tmp/ci-logs/*.log => console-logs\ntest-results/*.xml => junit-reports\ntest-results/playwright/** => browser-evidence.zip"
    steps {
        script { name = "toolchain"; scriptContent = requireNode }
        script { name = "install"; scriptContent = console("npm ci") }
        if (browser) {
            script { name = "Chromium"; scriptContent = console("npx --no-install playwright install chromium") }
        }
        script { name = title; scriptContent = console(command) }
    }
    if (report != null) {
        features {
            feature {
                type = "xml-report-plugin"
                param("xmlReportParsing.reportType", "junit")
                param("xmlReportParsing.reportDirs", "+:" + report)
                param("xmlReportParsing.verboseOutput", "true")
            }
        }
    }
    // Previous serial browser shards took 19, 12 and 14 minutes on GitHub.
    // Preserve their existing 30-minute budget; other gates previously fit 10.
    failureConditions { executionTimeoutMin = if (browser) 30 else 15 }
}

val compile = leg("Compile", "Compile", "npm run compile")
val checks = leg("StaticChecks", "Static Checks", "npm run verify:checks")
val unit = leg("UnitTests", "Unit Tests", "npm test -- --run", "test-results/unit.xml")
val integration = leg("IntegrationTests", "Integration Tests", "npm run verify:integration", "test-results/site.xml")
val browsers = (1..3).map { shard ->
    leg("BrowserTests$shard", "Browser Tests ($shard)", "npm run test:e2e -- --shard=$shard/3", "test-results/playwright.xml", true)
}
val verification = listOf(compile, checks, unit, integration) + browsers

val allChecks = BuildType {
    id("AllChecks")
    name = "All Checks"
    type = BuildTypeSettings.Type.COMPOSITE
    maxRunningBuilds = 1
    vcs { root(DslContext.settingsRoot) }
    dependencies {
        verification.forEach { dependency -> snapshot(dependency) { onDependencyFailure = FailureAction.ADD_PROBLEM } }
    }
    triggers {
        schedule {
            schedulingPolicy = daily { hour = 22; minute = 0; timezone = "Europe/London" }
            branchFilter = "+:<default>"
            triggerBuild = always()
            withPendingChangesOnly = false
            enforceCleanCheckout = true
            enforceCleanCheckoutForDependencies = true
        }
    }
}

val deploy = BuildType {
    id("DeployProduction")
    name = "Deploy (Production)"
    type = BuildTypeSettings.Type.DEPLOYMENT
    workspace("side-badger-deploy")
    artifactRules = "tmp/logs/deploy-*.log => deploy-logs"
    steps {
        script {
            name = "deploy verified revision"
            scriptContent = "bash scripts/deploy.sh --config deploy/production.conf --revision %build.vcs.number%"
        }
    }
    features { sshAgent { teamcitySshKey = "side-badger-prod" } }
    dependencies {
        snapshot(allChecks) {
            onDependencyFailure = FailureAction.CANCEL
            onDependencyCancel = FailureAction.CANCEL
            reuseBuilds = ReuseBuilds.SUCCESSFUL
        }
    }
    // Deliberate exception to composite-only VCS triggers: preserve the existing
    // push-to-main deployment while nightly All Checks verifies without deploying.
    // The terminal trigger pulls in the entire revision-matched snapshot chain.
    triggers {
        vcs {
            branchFilter = "+:<default>"
            triggerRules = "+:**\n-:tasks/**\n-:docs/**\n-:**/*.md\n-:*.md"
        }
    }
    failureConditions { executionTimeoutMin = 45 }
}

project {
    description = "Managed Side Badger marketing CI; repository Kotlin settings are authoritative."
    cleanup { baseRule { artifacts(days = 7); history(days = 30) } }
    verification.forEach { buildType(it) }
    buildType(allChecks)
    buildType(deploy)
}
