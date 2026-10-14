import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { locales, pseudoLocales } from './src/i18n/index.ts';
import { previewPseudoEnabled } from './src/i18n/pseudo.ts';

export default defineConfig({
  site: 'https://sidebadger.me',
  output: 'static',
  // Every URL ends with a slash and is written as <path>/index.html (restructure D1)
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  experimental: {
    // Two routes producing the same URL fail the build (D19)
    failOnPrerenderConflict: true,
  },
  i18n: {
    defaultLocale: 'en',
    // Imported from src/i18n/index.ts - single source of truth. Regional aliases are
    // not pages (D3), and the preview pseudo-locales exist only under PREVIEW_PSEUDO=1 (D38).
    locales: previewPseudoEnabled() ? [...locales, ...pseudoLocales] : locales,
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false
    }
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000
      }
    }
  }
});
