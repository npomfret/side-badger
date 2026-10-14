#!/usr/bin/env bash
set -euo pipefail
# The remote paths are meant to expand locally before ssh sends them.
# shellcheck disable=SC2029

# The box by address, not the site's hostname, so a deploy during a DNS change cannot land on
# the old box. sidebadger.me moved to the footy-betty box (77.68.112.97) on 2026-10-14.
SERVER="root@77.68.112.97"
REMOTE_DIR="/opt/side-badger-website"

echo "🦡 Deploying Side Badger Website..."

# Gate the deploy: abort (set -e) if tests, audit or build fail.
echo "🔎 Verifying..."
npm run verify

# Create remote directory
echo "📁 Creating remote directory..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Copy deployment files
echo "📦 Copying files..."
scp Dockerfile $SERVER:$REMOTE_DIR/
scp docker-compose.yml $SERVER:$REMOTE_DIR/
scp package.json $SERVER:$REMOTE_DIR/
scp package-lock.json $SERVER:$REMOTE_DIR/ 2>/dev/null || true
scp astro.config.mjs $SERVER:$REMOTE_DIR/
scp tsconfig.json $SERVER:$REMOTE_DIR/
scp vitest.site.config.ts $SERVER:$REMOTE_DIR/

# Copy source directories
echo "📦 Copying source files..."
ssh $SERVER "mkdir -p $REMOTE_DIR/src $REMOTE_DIR/public $REMOTE_DIR/nginx"
scp -r src/* $SERVER:$REMOTE_DIR/src/
scp -r public/* $SERVER:$REMOTE_DIR/public/
scp -r nginx/* $SERVER:$REMOTE_DIR/nginx/

# Build and deploy
echo "🐳 Building and starting container..."
ssh $SERVER "cd $REMOTE_DIR && docker compose build && docker compose up -d"

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
