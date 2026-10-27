#!/bin/bash
# GitHub Actions deployment; private key exists only in a private runner temp dir.
set +x
set -euo pipefail
: "${SSH_PRIVATE_KEY:?Dedicated repository deployment key required}"
deploy_private_key=$SSH_PRIVATE_KEY
export -n deploy_private_key
unset SSH_PRIVATE_KEY
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KNOWN="$ROOT/.github/ssh/production_known_hosts"
EXPECTED=SHA256:BC+iVb0Dg/eVNJX1OFB5psoK5dSRMMaA5WREYdlhshM
FINGERPRINT=$(ssh-keygen -lf "$KNOWN" -E sha256 | awk '{print $2}')
[ "$FINGERPRINT" = "$EXPECTED" ] || { echo 'Production SSH host key differs' >&2; exit 1; }
: "${RUNNER_TEMP:?Private runner temporary storage required}"
umask 077
deploy_ssh_dir=$(mktemp -d "$RUNNER_TEMP/side-badger-ssh.XXXXXXXX")
cleanup() { rm -rf -- "$deploy_ssh_dir"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '%s\n' "$deploy_private_key" > "$deploy_ssh_dir/identity"
unset deploy_private_key
ssh_args=(-F /dev/null -o BatchMode=yes -o ConnectTimeout=20 -o IdentitiesOnly=yes
    -o PreferredAuthentications=publickey -o StrictHostKeyChecking=yes
    -o HostKeyAlgorithms=ssh-ed25519 -o GlobalKnownHostsFile=/dev/null
    -o "UserKnownHostsFile=$KNOWN" -o UpdateHostKeys=no
    -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i "$deploy_ssh_dir/identity")
scp -q "${ssh_args[@]}" "$ROOT/docker-compose.prod.yml" root@77.68.112.97:/opt/side-badger-website/
ssh "${ssh_args[@]}" root@77.68.112.97 'set -eu
cd /opt/side-badger-website
mv docker-compose.prod.yml docker-compose.yml
docker pull ghcr.io/npomfret/side-badger:latest-me
docker compose up -d --remove-orphans'
