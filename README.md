i# Side Badger - White Label Bill Splitting Website

A customizable marketing website for white-label expense splitting applications. Built with Astro, deployed via Docker.

## Quick Start

```bash
# Requires Docker
npm run dev             # (Re)start the dev container at http://localhost:4321, hot-reloading
npm run docker:stop     # Stop
npm run docker:logs     # View logs
```

## Setting Up Your White Label

Add a CNAME record for your app subdomain pointing to `splitifyd.web.app`:

```
app.yourdomain.com  CNAME  splitifyd.web.app
```

The app will run on your subdomain (e.g., `app.yourdomain.com`).

## Project Structure

```
src/
├── i18n/en.ts          # All text content (customize here)
├── styles/tokens.css   # Design tokens (colors, spacing, fonts)
├── components/         # Reusable components
├── layouts/            # Page layouts
└── pages/              # Routes (index, pricing, privacy, etc.)
```

## Deployment

### Automatic (GitHub Actions)

Push to `main` → Docker image builds → Deploys to your server.

Setup requirements:
1. Add `SSH_PRIVATE_KEY` as GitHub secret
2. Configure server path in `.github/workflows/deploy.yml`
3. Login to ghcr.io on server: `docker login ghcr.io -u YOUR_USERNAME`

### Manual

```bash
npm run build                    # Build static site to dist/
docker build -t your-app .       # Build Docker image
docker run -p 80:80 your-app     # Run container
```

## Policy Pages

Privacy, Terms, and Cookie pages fetch content from your API:
- `GET {api.baseUrl}/api/policies/privacy-policy/text`
- `GET {api.baseUrl}/api/policies/terms-of-service/text`
- `GET {api.baseUrl}/api/policies/cookie-policy/text`

Expected response: Markdown text.

## Optional website analytics

The footer's analytics checkbox is off by default. It stores only a browser
choice (`sidebadger:analytics`) and reloads after a change; other open tabs reload
when that choice changes. The optional Cloudflare beacon loads only for direct,
clean-URL visits to published marketing pages on `sidebadger.me`. DNT/GPC,
calculators, preview pages, staging and the private app are excluded. Withdrawal
can send the current page's final exit measurement during reload, as disclosed
in the privacy policy. The public site token is configuration, not an API secret.

Policy snapshots must be refreshed with `npm run policies:sync` after publishing
the shared policies and before deploying a changed collection practice. Existing
no-third-party-analytics claims refer specifically to the private app.

## Tech Stack

- **Astro 5** - Static site generation
- **TypeScript** - Type safety
- **Docker + nginx** - Production image; nginx serves the static build behind the shared Snowmonkey proxy
- **GitHub Actions** - CI/CD
