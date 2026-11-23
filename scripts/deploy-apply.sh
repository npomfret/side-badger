#!/usr/bin/env bash
# Host half of the verified source deployment; invoked only by deploy.sh.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
REVISION=$1 ROOT=$2 PROJECT=$3 DOMAIN=$4
[[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] && [[ "$ROOT" =~ ^/opt/[a-zA-Z0-9_-]+$ ]] &&
  [[ "$PROJECT" =~ ^[a-zA-Z0-9_-]+$ ]] && [[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 2
cd "$(dirname "$0")/.."
[ "$(pwd)" = "$ROOT/releases/$REVISION" ]
exec 9>"$ROOT/deploy.lock"
flock -n 9 || { echo 'Another Side Badger deployment is running'; exit 1; }
IMAGE=side-badger:candidate
PREVIOUS_REVISION=''
if [ -f "$ROOT/DEPLOYED_SHA" ]; then PREVIOUS_REVISION=$(cat "$ROOT/DEPLOYED_SHA"); fi
PREVIOUS=$(docker inspect -f '{{.Image}}' side-badger-website-me)
docker build --target builder --build-arg "PUBLIC_DOMAIN=$DOMAIN" -t side-badger:acceptance .
docker build --build-arg "PUBLIC_DOMAIN=$DOMAIN" --label "org.opencontainers.image.revision=$REVISION" -t "$IMAGE" .
docker run --rm --network none "$IMAGE" nginx -t
IMAGE_ID=$(docker image inspect -f '{{.Id}}' "$IMAGE")
printf 'RELEASE_IMAGE=%s\n' "$IMAGE_ID" > release.env
bash scripts/check-nginx.sh --image "$IMAGE_ID" --markdown-image side-badger:acceptance \
  --log nginx-smoke.log
compose() { docker compose -p "$PROJECT" -f docker-compose.prod.yml --env-file release.env "$@"; }
restore() {
  printf 'RELEASE_IMAGE=%s\n' "$PREVIOUS" > release.env
  compose up -d --no-build --wait --wait-timeout 60 --remove-orphans
}
if ! compose up -d --no-build --wait --wait-timeout 60 --remove-orphans; then
  echo 'New container failed health acceptance; restoring previous image'
  restore
  exit 1
fi
if ! curl -fsS --max-time 15 -o /dev/null "https://$DOMAIN/"; then
  echo 'Public acceptance failed; restoring previous image'
  restore
  exit 1
fi
# Fixed owned tags retain exactly the current and previous images for rollback;
# older untagged layers remain eligible for the estate's existing bounded GC.
docker tag "$PREVIOUS" side-badger:previous
docker tag "$IMAGE_ID" side-badger:current
printf '%s\n' "$REVISION" > "$ROOT/.DEPLOYED_SHA.next"
mv "$ROOT/.DEPLOYED_SHA.next" "$ROOT/DEPLOYED_SHA"
# Source archives are owned by this deployer. Retain the current and previous
# accepted releases; never traverse symlinks or remove any other directory name.
for release in "$ROOT"/releases/*; do
  name=${release##*/}
  if [[ "$name" =~ ^[0-9a-f]{40}$ ]] && [ "$name" != "$REVISION" ] &&
     [ "$name" != "$PREVIOUS_REVISION" ] && [ -d "$release" ] && [ ! -L "$release" ]; then
    rm -rf -- "$release"
  fi
done
echo "APPLIED $REVISION"
