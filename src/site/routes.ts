/**
 * Route generation from the page registry (restructure D17, D19, D38).
 *
 * Route files call `pathsFor(pageId)` or `pathsForType(type)` in `getStaticPaths()`. A path is
 * produced only when the page is built (published, or PREVIEW_UNPUBLISHED=1) and the locale is
 * one `getBuildLocales()` allows. In English-first mode (I18N_MODE=english-first) that also
 * drops every locale that lacks a key and every page/locale pair that lacks its content entry,
 * so no English fallback is ever built at a localized URL.
 */
import {
  getBuildLocales,
  getI18nMode,
  isPseudoLocale,
  localeConfig,
  pendingPageIds,
  type Locale,
} from '../i18n';
import { allPages, builtPages, getPage, requirePage, type PageDef, type PageType } from './pages';

export interface StaticPath {
  params: { locale: string | undefined; slug?: string };
  props: { pageId: string; locale: Locale };
}

const CONTENT_DIRS: Record<NonNullable<PageDef['content']>['collection'], string> = {
  featurePages: 'features',
  useCasePages: 'use-cases',
  sitePages: 'pages',
  guides: 'guides',
  comparePages: 'compare',
};

// Only the file names matter, so the modules are never loaded
const contentFiles = import.meta.glob('/src/content/**/*.yaml', { query: '?url' });

/** The content file a page needs in a locale, or undefined for a page with no content entry. */
export function contentFileFor(page: PageDef, locale: Locale): string | undefined {
  if (!page.content) return undefined;
  const dir = CONTENT_DIRS[page.content.collection];
  return `/src/content/${dir}/${page.content.slug}/${locale}.yaml`;
}

/**
 * Whether a page/locale pair has its content entry. English and the pseudo-locales (whose text
 * is generated from English) always count as having one. A real locale missing its entry is an
 * error in strict mode, and a skipped route in English-first mode.
 */
export function hasContentEntry(page: PageDef, locale: Locale): boolean {
  const file = contentFileFor(page, locale);
  if (!file || locale === 'en' || isPseudoLocale(locale)) return true;
  if (file in contentFiles) return true;
  if (getI18nMode() === 'strict') {
    throw new Error(
      `Page "${page.id}" has no content entry for "${locale}" (${file}). ` +
        'Strict mode needs every locale; use I18N_MODE=english-first while translation is pending.'
    );
  }
  // English-first: an entry may be missing only for a page pending/pages.json lists (D38)
  if (!pendingPageIds().includes(page.id)) {
    throw new Error(
      `Page "${page.id}" has no content entry for "${locale}" (${file}) and is not listed in ` +
        'src/i18n/pending/pages.json.'
    );
  }
  return false;
}

function localesFor(page: PageDef): Locale[] {
  const built = getBuildLocales();
  const allowed = page.locales === 'all' ? built : built.filter(l => page.locales.includes(l));
  return allowed.filter(locale => hasContentEntry(page, locale));
}

function segmentsOf(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function pathsOfPage(page: PageDef): StaticPath[] {
  const segments = segmentsOf(page.path);
  const slug = segments.length >= 2 ? segments[segments.length - 1] : undefined;
  return localesFor(page).map(locale => ({
    params: {
      locale: locale === 'en' ? undefined : locale,
      ...(slug === undefined ? {} : { slug }),
    },
    props: { pageId: page.id, locale },
  }));
}

/** `getStaticPaths()` entries for one page. Empty when the page is not built. */
export function pathsFor(pageId: string): StaticPath[] {
  const page = requirePage(pageId);
  return builtPages().includes(page) ? pathsOfPage(page) : [];
}

/**
 * `getStaticPaths()` entries for every built page of a type. Pages whose path has two or more
 * segments (`/features/split-expenses/`) also get a `slug` param holding the last segment.
 */
export function pathsForType(type: PageType): StaticPath[] {
  return builtPages()
    .filter(page => page.type === type)
    .flatMap(pathsOfPage);
}

export interface PageMatch {
  page: PageDef;
  locale: Locale;
}

/**
 * Map a URL or path back to its registry page and locale (the sitemap filter and the output
 * checks use this). A regional alias prefix (`/en-gb/…`) matches nothing, because aliases are
 * not pages (D3). Query strings, hashes and a missing trailing slash are tolerated.
 */
export function pageForPath(input: string): PageMatch | undefined {
  let path = input;
  const origin = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i);
  if (origin) path = path.slice(origin[0].length);
  path = path.replace(/[?#].*$/, '') || '/';
  if (!path.startsWith('/')) path = `/${path}`;

  const [first] = segmentsOf(path);
  let locale: Locale = 'en';
  let rest = path;
  // English has no prefix, so `/en/…` is not a page
  if (first === 'en') return undefined;
  if (first && Object.hasOwn(localeConfig, first)) {
    locale = first as Locale;
    rest = path.slice(first.length + 1) || '/';
  }
  if (!rest.endsWith('/')) rest += '/';

  const page = allPages().find(candidate => candidate.path === rest);
  if (!page) return undefined;
  if (page.locales !== 'all' && !page.locales.includes(locale)) return undefined;
  return { page, locale };
}

export { getPage };
