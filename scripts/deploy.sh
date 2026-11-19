#!/usr/bin/env bash
# The remote paths are meant to expand locally before ssh sends them. The directive sits
# before the first command so it covers the whole file.
# shellcheck disable=SC2029
set -euo pipefail

# The box by address, not the site's hostname, so a deploy during a DNS change cannot land on
# the old box. sidebadger.me moved to the footy-betty box (77.68.112.97) on 2026-10-14.
SERVER="root@77.68.112.97"
REMOTE_DIR="/opt/side-badger-website"

echo "🦡 Deploying Side Badger Website..."

# Gate the deploy: abort (set -e) if tests, audit or build fail.
echo "🔎 Verifying..."
npm run verify

: "${REMOTE_DIR:?REMOTE_DIR must not be empty}"

# Create remote directory
echo "📁 Creating remote directory..."
ssh "$SERVER" "mkdir -p '$REMOTE_DIR'"

# Copy deployment files
echo "📦 Copying files..."
deployment_sources=(
  Dockerfile .dockerignore docker-compose.yml package.json
  astro.config.mjs tsconfig.json vitest.site.config.ts
)
if [[ -f package-lock.json ]]; then
  deployment_sources+=(package-lock.json)
fi
# No --delete here: unrelated files at the remote deployment root must be preserved.
rsync -a -e ssh "${deployment_sources[@]}" "$SERVER:$REMOTE_DIR/"

# Copy source directories. scripts/markdown is the Markdown generator astro.config.mjs imports during the build.
echo "📦 Copying source files..."
ssh "$SERVER" "mkdir -p '$REMOTE_DIR/src' '$REMOTE_DIR/public' '$REMOTE_DIR/nginx' '$REMOTE_DIR/scripts/markdown'"
# Trailing slashes sync each tree's contents (including dotfiles), not a nested
# directory. Keep --delete confined to these destinations, never REMOTE_DIR.
rsync -a --delete -e ssh src/ "$SERVER:$REMOTE_DIR/src/"
rsync -a --delete -e ssh public/ "$SERVER:$REMOTE_DIR/public/"
rsync -a --delete -e ssh nginx/ "$SERVER:$REMOTE_DIR/nginx/"
rsync -a --delete -e ssh scripts/markdown/ "$SERVER:$REMOTE_DIR/scripts/markdown/"

# Build and deploy
echo "🐳 Building and starting container..."
ssh "$SERVER" "cd '$REMOTE_DIR' && docker compose build && docker compose up -d"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check status with:"
echo "  ssh $SERVER 'docker ps | grep side-badger'"
echo ""
echo "View logs with:"
echo "  ssh $SERVER 'docker logs side-badger-website'"
echo ""
echo "🦡 Happy badgering!"
