# TeamCity

All checks run on the estate Mac agents. `python3 scripts/teamcity.py status`
reports the project; `settings --sync-status` reports Kotlin import errors.
A push to main queues Deploy (Production), which snapshots All Checks and every
verification leg at the same revision. The nightly All Checks at 22:00 London
forces clean dependencies without deploying. Every leg uses the existing estate
`high_cpu` writer lock to honor the owner's serial test rule; no agent requires
Docker. Test reports and failure traces/screenshots publish even after failure.

`npm run deploy` queues the same gated deployment. Its uploaded SSH key is
`side-badger-prod`, dedicated to this site. Its private file is stored in the
project's iCloud secrets directory and TeamCity; only the public key and pinned
prod host key are committed. The separate read-only GitHub key is
`side-badger-ci`. Neither tests nor repository checkout can use the production
credential. GitHub Actions no longer tests or deploys this repository.

The deploy transports a Git archive of the exact checked revision to prod,
selecting only the dedicated SSH identity and pinned host key. The host builds
and tests the actual nginx image before replacing the existing container.
Compose waits for health; failed container or public acceptance restores the
previous immutable image. Application state is static, and no volume is pruned.
The successful revision is recorded in `/opt/side-badger-website/DEPLOYED_SHA`.
