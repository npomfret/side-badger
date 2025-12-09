# Side Badger Website

Marketing website for Side Badger - a free, no-tracking bill splitter.

## Local Development

Requires Docker.

```bash
# Start dev server with hot-reload
npm run docker:start

# Stop
npm run docker:stop

# Restart
npm run docker:restart

# View logs
npm run docker:logs
```

Site runs at http://localhost:4321

## Production Build

```bash
npm run build
```

Output goes to `dist/`.

## Deployment

The site auto-deploys to `sidebadger.com` when you push to `main`.

### How it works:

1. Push to `main` triggers GitHub Actions
2. Docker image is built and pushed to `ghcr.io/npomfret/side-badger`
3. Server pulls the new image and restarts the container

### First-time setup:

1. Add SSH private key as GitHub secret:
   - Go to: https://github.com/npomfret/side-badger/settings/secrets/actions
   - Click "New repository secret"
   - Name: `SSH_PRIVATE_KEY`
   - Value: Contents of `~/.ssh/id_rsa`

2. Ensure server can pull from GitHub Container Registry:
   ```bash
   ssh root@sidebadger.com "docker login ghcr.io -u npomfret"
   # Use a GitHub Personal Access Token with `read:packages` scope as password
   ```

### Manual deploy (if needed):

```bash
ssh root@sidebadger.com "cd /opt/side-badger-website && docker pull ghcr.io/npomfret/side-badger:latest && docker compose up -d"
```

### Rollback to previous version:

```bash
# Find available tags
# Check https://github.com/npomfret/side-badger/pkgs/container/side-badger

# Deploy specific version
ssh root@sidebadger.com "cd /opt/side-badger-website && docker pull ghcr.io/npomfret/side-badger:<sha> && docker compose up -d"
```

### Server location:
- Host: `sidebadger.com`
- Path: `/opt/side-badger-website/`
- Container: `side-badger-website`
- Image: `ghcr.io/npomfret/side-badger:latest`
