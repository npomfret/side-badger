#!/bin/bash
set -e

SERVER="root@sidebadger.com"
REMOTE_DIR="/opt/side-badger-website"

echo "🦡 Deploying Side Badger Website..."

# Create remote directory
echo "📁 Creating remote directory..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Copy deployment files
echo "📦 Copying files..."
scp Dockerfile $SERVER:$REMOTE_DIR/
scp nginx.conf $SERVER:$REMOTE_DIR/
scp docker-compose.yml $SERVER:$REMOTE_DIR/
scp package.json $SERVER:$REMOTE_DIR/
scp package-lock.json $SERVER:$REMOTE_DIR/ 2>/dev/null || true
scp astro.config.mjs $SERVER:$REMOTE_DIR/
scp tsconfig.json $SERVER:$REMOTE_DIR/

# Copy source directories
echo "📦 Copying source files..."
ssh $SERVER "mkdir -p $REMOTE_DIR/src $REMOTE_DIR/public"
scp -r src/* $SERVER:$REMOTE_DIR/src/
scp -r public/* $SERVER:$REMOTE_DIR/public/

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
