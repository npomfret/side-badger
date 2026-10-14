/**
 * The page registry (restructure D17). Routes, navigation, footer, breadcrumbs, the sitemap and
 * the output checks all read this list, so site structure lives in one place.
 *
 * Slugs are English in every locale (D18): `/fr/pricing/` is the French form of `/pricing/`.
 * A page is built only when `published` is true (or PREVIEW_UNPUBLISHED=1 is set for review).
 */
import type { Locale, TranslationKey } from '../i18n';
import { previewPages } from './preview-pages';

export type PageType =
  | 'home'
  | 'how-it-works'
  | 'hub'
  | 'feature'
  | 'use-case'
  | 'comparison'
  | 'pricing'
  | 'legal'
  | 'article';

export interface PageDef {
  /** 'home', 'pricing', 'features', 'feature/split-expenses', … */
  id: string;
  type: PageType;
  /** English path, slash-terminated */
  path: `/${string}`;
  /** Breadcrumbs and hub membership */
  parent?: string;
  published: boolean;
  locales: 'all' | readonly Locale[];
  nav?: { order: number; labelKey: TranslationKey };
  footer?: { group: 'product' | 'useCases' | 'legal'; order: number };
  related?: readonly string[];
  /** Registry feature ids the page depicts (`src/data/features.ts` arrives with the registry data) */
  features?: readonly string[];
  /** The content entry that fills the page, for pages built from content collections */
  content?: { collection: 'featurePages' | 'useCasePages' | 'sitePages'; slug: string };
  indexing: 'per-locale-review' | 'english-only';
}

export const pages = [
  {
    id: 'home',
    type: 'home',
    path: '/',
    published: true,
    locales: 'all',
    indexing: 'per-locale-review',
  },
  {
    id: 'pricing',
    type: 'pricing',
    path: '/pricing/',
    published: true,
    locales: 'all',
    nav: { order: 4, labelKey: 'footer.pricing' },
    footer: { group: 'product', order: 1 },
    indexing: 'per-locale-review',
  },
  {
    id: 'privacy',
    type: 'legal',
    path: '/privacy/',
    published: true,
    locales: 'all',
    footer: { group: 'legal', order: 1 },
    indexing: 'english-only',
  },
  {
    id: 'terms',
    type: 'legal',
    path: '/terms/',
    published: true,
    locales: 'all',
    footer: { group: 'legal', order: 2 },
    indexing: 'english-only',
  },
  {
    id: 'cookies',
    type: 'legal',
    path: '/cookies/',
    published: true,
    locales: 'all',
    footer: { group: 'legal', order: 3 },
    indexing: 'english-only',
  },
] as const satisfies readonly PageDef[];

/** Ids of the pages registered today. Later packages add entries above. */
export type PageId = (typeof pages)[number]['id'];

const previewEnabled = (): boolean =>
  typeof process !== 'undefined' && process.env?.PREVIEW_UNPUBLISHED === '1';

/** Every registered page, including the preview-only pages (which are never built by default). */
export function allPages(): readonly PageDef[] {
  return [...pages, ...previewPages];
}

/**
 * Pages that get a route: the published registry pages. Under PREVIEW_UNPUBLISHED=1 the
 * unpublished and preview-only pages are built too; they are `noindex`, carry `data-unpublished`
 * and are left out of navigation and the sitemap by the SEO and shell packages.
 */
export function builtPages(): readonly PageDef[] {
  if (previewEnabled()) return allPages();
  return (pages as readonly PageDef[]).filter(page => page.published);
}

export function getPage(id: string): PageDef | undefined {
  return allPages().find(page => page.id === id);
}

export function requirePage(id: string): PageDef {
  const page = getPage(id);
  if (!page) throw new Error(`Unknown page id "${id}"`);
  return page;
}
