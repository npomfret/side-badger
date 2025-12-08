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
