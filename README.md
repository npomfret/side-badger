i# Side Badger - White Label Bill Splitting Website

A customizable marketing website for white-label expense splitting applications. Built with Astro, deployed via Docker.

## Quick Start

```bash
# Requires Docker
npm run docker:start    # Start dev server at http://localhost:4321
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

## Tech Stack

- **Astro 5** - Static site generation
- **TypeScript** - Type safety
- **Docker + Nginx** - Production deployment
- **GitHub Actions** - CI/CD