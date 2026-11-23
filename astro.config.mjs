import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { locales, pseudoLocales, isPseudoLocale } from './src/i18n/index.ts';
import { previewPseudoEnabled } from './src/i18n/pseudo.ts';
import { isIndexable } from './src/seo/indexability.ts';
import { pageForPath } from './src/site/routes.ts';
import { hasMarkdownAlternate } from './src/site/pages.ts';
import { canonicalFor } from './src/seo/urls.ts';
import { markdownSite } from './scripts/markdown/index.mjs';

export default defineConfig({
  site: 'https://sidebadger.me',
  output: 'static',
  // Every URL ends with a slash and is written as <path>/index.html (restructure D1)
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // Two routes producing the same URL fail the build (stable since Astro 6).
  prerenderConflictBehavior: 'error',
  // Only indexable page/locale pairs reach the sitemap (D8, D9); pseudo-locales never do
  integrations: [
    markdownSite({
      resolvePage: path => {
        const match = pageForPath(path);
        if (!match || !hasMarkdownAlternate(match.page) || isPseudoLocale(match.locale)) return undefined;
        return {
          url: canonicalFor(match.page.id, match.locale),
          locale: match.locale,
          indexable: isIndexable(match.page.id, match.locale),
        };
      },
    }),
    sitemap({
      filter: url => {
        const match = pageForPath(url);
        return !!match && isIndexable(match.page.id, match.locale);
      },
    }),
  ],
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
