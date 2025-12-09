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

```
git push main
    ↓
GitHub Actions triggers
    ↓
Docker image built (~1 min)
    ↓
Image pushed to ghcr.io/npomfret/side-badger:latest
    ↓
Server pulls image and restarts container
```

### Monitoring:

- **View deployments:** https://github.com/npomfret/side-badger/actions
- **View images:** https://github.com/npomfret/side-badger/pkgs/container/side-badger

### Manual deploy (if needed):

```bash
ssh root@sidebadger.com "cd /opt/side-badger-website && docker pull ghcr.io/npomfret/side-badger:latest && docker compose up -d"
```

### Rollback to previous version:

```bash
# 1. Find the SHA of the version you want from the packages page or git log
# 2. Deploy that specific version:
ssh root@sidebadger.com "cd /opt/side-badger-website && docker pull ghcr.io/npomfret/side-badger:<sha> && docker compose up -d"
```

### First-time setup (already done):

1. Add SSH private key as GitHub secret `SSH_PRIVATE_KEY`
2. Login to ghcr.io on server: `ssh root@sidebadger.com "docker login ghcr.io -u npomfret"`

### Server details:
- **Host:** `sidebadger.com`
- **Path:** `/opt/side-badger-website/`
- **Container:** `side-badger-website`
- **Image:** `ghcr.io/npomfret/side-badger:latest`
