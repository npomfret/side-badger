# Production deployment SSH

`scripts/deploy-ci.sh` deploys to `root@77.68.112.97` using the repository's
`SSH_PRIVATE_KEY` secret and the committed Ed25519 server key in
`production_known_hosts`. The host key was obtained over the estate's existing
trusted SSH connection and has fingerprint
`SHA256:BC+iVb0Dg/eVNJX1OFB5psoK5dSRMMaA5WREYdlhshM`.

The workflow keeps its existing verify/e2e/build prerequisites and deployment
commands. It uses standard SSH/SCP, requires strict Ed25519 host verification,
creates a mode-0600 identity in a private runner temporary directory, removes
the secret from child environments and deletes the temporary directory on exit.
If the host key changes, verify the replacement independently before updating
this file; do not disable checking.

The Snowmonkey operations repo prepares the dedicated CI key and installs its
public half through `scripts/install-sidebadger-ci-key.sh`. Activation updates
this repository's existing `SSH_PRIVATE_KEY` secret after new-key SSH and SFTP
checks; no secret rename or source-code secret is needed. The workflow is also
compatible with the old secret during this staged rollout. Never commit private
keys or add them to test fixtures.

The dedicated key has PTY and forwarding disabled by `restrict`, but still
allows root commands required by the current deployment. Credential separation
does not establish least privilege. A named deployment identity and constrained
command wrapper remain estate security work. Keep the human administrator and
restricted database-backup keys intact.
