import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { locales } from './src/i18n/index.ts';

export default defineConfig({
  site: 'https://sidebadger.com',
  output: 'static',
  integrations: [sitemap()],
  i18n: {
    defaultLocale: 'en',
    // Imported from src/i18n/index.ts - single source of truth
    locales: locales,
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
