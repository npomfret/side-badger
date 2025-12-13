# Side Badger - Developer & AI Context

Marketing website for a white-label bill splitting app. The actual app is Firebase-hosted externally; this repo is just the marketing site.

## Architecture

- **Framework**: Astro 5 (static site generation)
- **Deployment**: Docker → Nginx on `sidebadger.com`
- **CI/CD**: GitHub Actions auto-deploys on push to `main`

## Key Files

| File | Purpose |
|------|---------|
| `src/i18n/en.ts` | All user-facing text, URLs, copy |
| `src/styles/tokens.css` | Design tokens (colors, spacing, typography) |
| `astro.config.mjs` | Site URL, i18n config |
| `nginx.conf` | Server config, caching, health checks |

## Code Patterns

**Translations**: Use `t('key')` from `@/i18n`:
```typescript
import { t } from '@/i18n';
const url = t('app.url');
```

**Path aliases**:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@styles/*` → `src/styles/*`

**CSS**: Uses CSS custom properties from `tokens.css`. Glassmorphism pattern with `--glass-bg`, `--glass-border`.

## Internationalization (i18n)

- **Text & Routing**: All text is handled via `src/i18n/*.ts`. Astro's dynamic routes provide locale-based URLs (e.g., `/ja/pricing`).
- **RTL Support**: The layout automatically flips for RTL languages (e.g., Arabic) using `[dir="rtl"]` styles in `layout.css`.
- **Fonts**: Loads and applies locale-specific fonts (`Noto Sans JP`, `Noto Sans Arabic`) via `:lang()` styles in `global.css`.
- **SEO**: `BaseLayout.astro` generates `hreflang` tags and a correct `og:locale` meta tag for social sharing.
- **Formatting**: The `src/i18n/index.ts` file includes helpers like `getFormattedDate` for locale-aware date formatting.

### Adding a New Language

`src/i18n/index.ts` is the **single source of truth**. See the checklist at the top of that file. Pages use `getLocalePaths()` and `astro.config.mjs` imports `locales` from there, so you only update one file.

## Components

- `BaseLayout.astro` - HTML wrapper, header/footer, background effects
- `HomePage.astro` - Landing page with features, CTA sections
- `PolicyPage.astro` - Fetches markdown from API, renders legal pages
- `ParticleStarfield.astro` - tsParticles background (respects reduced motion)
- `EasterEggs.astro` - Konami code, disco mode, hidden interactions

## Pages

All in `src/pages/` (file-based routing):
- `index.astro` - Homepage
- `pricing.astro` - Free tier explanation with FAQ schema
- `privacy.astro`, `terms.astro`, `cookies.astro` - Policy pages (fetch from API)

## Docker

```bash
npm run docker:start   # Dev with hot-reload (port 4321)
npm run docker:stop
npm run docker:logs
```

Multi-stage Dockerfile:
1. `base` - Node 22, install deps
2. `dev` - Dev server
3. `builder` - Build static files
4. `production` - Nginx serving `dist/`

## External Dependencies

Policy pages fetch markdown from:
- `{api.baseUrl}/api/policies/{policy-type}/text`

The app URL (`app.url`) points to the external Firebase-hosted app.

## Styling Notes

- Aurora background effect via CSS animations in `global.css`
- Confetti via `canvas-confetti` on CTA clicks
- All animations respect `prefers-reduced-motion`
- Fluid typography using `clamp()`