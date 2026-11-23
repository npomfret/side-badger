#!/usr/bin/env bash
# TeamCity transport: its Deploy Production snapshot dependency owns verification.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "${1:-}" = --help ]; then
  echo 'Usage: scripts/deploy.sh --config FILE --revision SHA [--dry-run]'
  exit 0
fi
CONFIG='' REVISION='' DRY_RUN=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) CONFIG=${2:?Missing configuration file}; shift 2 ;;
    --revision) REVISION=${2:?Missing revision}; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo 'Usage: scripts/deploy.sh --config FILE --revision SHA [--dry-run]' >&2; exit 2 ;;
  esac
done
[ -n "$CONFIG" ] && [[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] || exit 2
mkdir -p "$ROOT/tmp/logs"
LOG="$ROOT/tmp/logs/deploy-$(date -u +%Y%m%dT%H%M%SZ).log"
printf '%s\n' "$LOG"
exec >> "$LOG" 2>&1
trap 'status=$?; if [ "$status" -ne 0 ]; then printf "{\"timestamp\":\"%s\",\"severity\":\"ERROR\",\"label\":\"deploy-failed\",\"status\":%s,\"line\":%s}\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$status" "$LINENO"; fi' EXIT
cd "$ROOT"
unset DEPLOY_SERVER DEPLOY_DIR DEPLOY_PROJECT DEPLOY_DOMAIN DEPLOY_IDENTITY DEPLOY_KNOWN_HOSTS DEPLOY_FINGERPRINT
# shellcheck source=/dev/null
source "$CONFIG"
: "${DEPLOY_SERVER:?}" "${DEPLOY_DIR:?}" "${DEPLOY_PROJECT:?}" "${DEPLOY_DOMAIN:?}"
: "${DEPLOY_IDENTITY:?}" "${DEPLOY_KNOWN_HOSTS:?}" "${DEPLOY_FINGERPRINT:?}"
[[ "$DEPLOY_SERVER" =~ ^root@[0-9.]+$ ]] && [[ "$DEPLOY_DIR" =~ ^/opt/[a-zA-Z0-9_-]+$ ]] &&
  [[ "$DEPLOY_PROJECT" =~ ^[a-zA-Z0-9_-]+$ ]] && [[ "$DEPLOY_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 2
[ "$(git rev-parse HEAD)" = "$REVISION" ] || { echo 'Checkout does not match the verified revision'; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo 'Tracked source is dirty'; exit 1; }
IDENTITY="$ROOT/$DEPLOY_IDENTITY" KNOWN="$ROOT/$DEPLOY_KNOWN_HOSTS"
[ "$(ssh-keygen -lf "$IDENTITY" -E sha256 | awk '{print $2}')" = "$DEPLOY_FINGERPRINT" ] || { echo "Deployment public key fingerprint mismatch; expected $DEPLOY_FINGERPRINT"; exit 1; }
[ "$(ssh-keygen -lf "$KNOWN" -E sha256 | awk '{print $2}')" = 'SHA256:BC+iVb0Dg/eVNJX1OFB5psoK5dSRMMaA5WREYdlhshM' ] || { echo 'Production host key fingerprint mismatch'; exit 1; }
ssh-add -l -E sha256 | awk '{print $2}' | grep -qxF "$DEPLOY_FINGERPRINT" || { echo "Required TeamCity deployment identity is not loaded: $DEPLOY_FINGERPRINT"; exit 1; }
printf '{"timestamp":"%s","severity":"INFO","label":"deploy-validated","revision":"%s","identity":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$REVISION" "$DEPLOY_FINGERPRINT"
[ "$DRY_RUN" -eq 0 ] || exit 0
ssh_args=(-F /dev/null -o BatchMode=yes -o ConnectTimeout=20 -o ControlMaster=no -o ControlPath=none
  -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o PasswordAuthentication=no
  -o KbdInteractiveAuthentication=no -o ForwardAgent=no -o StrictHostKeyChecking=yes
  -o HostKeyAlgorithms=ssh-ed25519 -o GlobalKnownHostsFile=/dev/null -o "UserKnownHostsFile=$KNOWN"
  -o UpdateHostKeys=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i "$IDENTITY")
WORK=$(mktemp -d "$ROOT/tmp/deploy.XXXXXXXX")
cleanup() { rm -rf -- "$WORK"; }
trap 'status=$?; cleanup; if [ "$status" -ne 0 ]; then printf "{\"timestamp\":\"%s\",\"severity\":\"ERROR\",\"label\":\"deploy-failed\",\"status\":%s}\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$status"; fi' EXIT
git archive --format=tar "$REVISION" > "$WORK/source.tar"
RELEASE="$DEPLOY_DIR/releases/$REVISION"
ssh "${ssh_args[@]}" "$DEPLOY_SERVER" "install -d -m 755 '$RELEASE'"
scp -q "${ssh_args[@]}" "$WORK/source.tar" "$DEPLOY_SERVER:$RELEASE/source.tar"
# A committed file avoids Docker consuming an SSH stdin script.
if ssh -n "${ssh_args[@]}" "$DEPLOY_SERVER" \
  "tar -xf '$RELEASE/source.tar' -C '$RELEASE' && bash '$RELEASE/scripts/deploy-apply.sh' '$REVISION' '$DEPLOY_DIR' '$DEPLOY_PROJECT' '$DEPLOY_DOMAIN'" > "$WORK/applied.log" 2>&1; then
  :
else
  status=$?
  cat "$WORK/applied.log"
  exit "$status"
fi
cat "$WORK/applied.log"
grep -qxF "APPLIED $REVISION" "$WORK/applied.log"
printf '{"timestamp":"%s","severity":"INFO","label":"deploy-complete","revision":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$REVISION"
