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

Push to `main` → TeamCity verifies the exact revision on our Mac agents →
production builds and smoke-tests the image → health-gated deployment.

```bash
python3 scripts/teamcity.py status
python3 scripts/teamcity.py failures
npm run deploy                    # Queue the same gated production deployment
```

The nightly verifies without deploying. See [CI operations](docs/ci.md) for
credentials, artifacts and rollback. GitHub Actions is retired.

## Policy Pages

Privacy, Terms, and Cookie pages fetch their text from the app API in the visitor's browser (the build never calls it, and no copy is kept here):
- `GET {api.baseUrl}/api/policies/privacy-policy/text`
- `GET {api.baseUrl}/api/policies/terms-of-service/text`
- `GET {api.baseUrl}/api/policies/cookie-policy/text`

Expected response: Markdown text (`text/plain`; a JSON, HTML or empty reply counts as a failure). `GET .../current` supplies `createdAt`, the publication date shown on the page.

## Optional website analytics

The footer's analytics checkbox is off by default. It stores only a browser
choice (`sidebadger:analytics`) and reloads after a change; other open tabs reload
when that choice changes. The optional Cloudflare beacon loads only for direct,
clean-URL visits to published marketing pages on `sidebadger.me`. DNT/GPC,
calculators, preview pages, staging and the private app are excluded. Withdrawal
can send the current page's final exit measurement during reload, as disclosed
in the privacy policy. The public site token is configuration, not an API secret.

Publish a change to the shared policies in the app; the site shows it on the next
page load, with no site deploy. Existing no-third-party-analytics claims refer
specifically to the private app.

## Tech Stack

- **Astro 7** - Static site generation
- **TypeScript** - Type safety
- **Docker + nginx** - Production image; nginx serves the static build behind the shared Snowmonkey proxy
- **TeamCity** - CI/CD on our own Mac agents
