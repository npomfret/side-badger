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
  | 'support'
  | 'legal'
  | 'article'
  | 'tool';

/** The page types that describe the product. A guide links to at least two of them (restructure D20). */
export const PRODUCT_PAGE_TYPES: readonly PageType[] = ['feature', 'use-case', 'how-it-works'];

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
  /** Registry feature ids the page depicts (`src/data/features.ts`) */
  features?: readonly string[];
  /** The content entry that fills the page, for pages built from content collections */
  content?: { collection: 'featurePages' | 'useCasePages' | 'sitePages' | 'guides' | 'comparePages'; slug: string };
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
    nav: { order: 4, labelKey: 'nav.pricing' },
    footer: { group: 'product', order: 6 },
    indexing: 'per-locale-review',
  },
  {
    id: 'support',
    type: 'support',
    path: '/support/',
    published: true,
    locales: 'all',
    footer: { group: 'product', order: 7 },
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
  {
    id: 'how-it-works',
    type: 'how-it-works',
    path: '/how-it-works/',
    published: true,
    locales: 'all',
    nav: { order: 3, labelKey: 'nav.howItWorks' },
    footer: { group: 'product', order: 1 },
    related: ['feature/split-expenses', 'feature/settle-up', 'feature/multiple-currencies', 'use-cases', 'pricing'],
    features: [
      'groups',
      'invites',
      'expense-splitting',
      'balances',
      'settlements',
      'live-updates',
      'dashboard',
      'languages',
      'home-screen',
      'accounts',
      'accessibility',
    ],
    content: { collection: 'sitePages', slug: 'how-it-works' },
    indexing: 'per-locale-review',
  },
  {
    id: 'features',
    type: 'hub',
    path: '/features/',
    published: true,
    locales: 'all',
    nav: { order: 1, labelKey: 'nav.features' },
    footer: { group: 'product', order: 2 },
    related: ['feature/split-expenses', 'feature/settle-up', 'feature/multiple-currencies', 'how-it-works'],
    content: { collection: 'sitePages', slug: 'features' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/split-expenses',
    type: 'feature',
    path: '/features/split-expenses/',
    parent: 'features',
    published: true,
    locales: 'all',
    footer: { group: 'product', order: 3 },
    related: ['feature/settle-up', 'feature/multiple-currencies', 'use-case/housemates', 'use-case/events-and-celebrations'],
    features: [
      'expense-splitting',
      'expense-questions',
      'receipt-attachments',
      'comments',
      'reactions',
    ],
    content: { collection: 'featurePages', slug: 'split-expenses' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/settle-up',
    type: 'feature',
    path: '/features/settle-up/',
    parent: 'features',
    published: true,
    locales: 'all',
    footer: { group: 'product', order: 4 },
    related: ['feature/split-expenses', 'feature/multiple-currencies', 'use-case/housemates', 'use-case/group-trips'],
    features: [
      'balances',
      'settlements',
      'currency-conversion',
      'reactions',
      'live-updates',
    ],
    content: { collection: 'featurePages', slug: 'settle-up' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/multiple-currencies',
    type: 'feature',
    path: '/features/multiple-currencies/',
    parent: 'features',
    published: true,
    locales: 'all',
    footer: { group: 'product', order: 5 },
    related: ['use-case/group-trips', 'feature/settle-up', 'feature/split-expenses'],
    features: [
      'multi-currency',
      'currency-conversion',
      'settlements',
    ],
    content: { collection: 'featurePages', slug: 'multiple-currencies' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-cases',
    type: 'hub',
    path: '/use-cases/',
    published: true,
    locales: 'all',
    nav: { order: 2, labelKey: 'nav.useCases' },
    footer: { group: 'useCases', order: 1 },
    related: ['use-case/group-trips', 'use-case/housemates', 'use-case/events-and-celebrations', 'how-it-works', 'pricing'],
    content: { collection: 'sitePages', slug: 'use-cases' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-case/group-trips',
    type: 'use-case',
    path: '/use-cases/group-trips/',
    parent: 'use-cases',
    published: true,
    locales: 'all',
    footer: { group: 'useCases', order: 2 },
    related: ['feature/multiple-currencies', 'feature/settle-up', 'feature/split-expenses'],
    features: [
      'expense-splitting',
      'balances',
      'settlements',
      'multi-currency',
      'currency-conversion',
      'receipt-scanning',
      'lists',
      'polls',
      'permissions',
    ],
    content: { collection: 'useCasePages', slug: 'group-trips' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-case/housemates',
    type: 'use-case',
    path: '/use-cases/housemates/',
    parent: 'use-cases',
    published: true,
    locales: 'all',
    footer: { group: 'useCases', order: 3 },
    related: ['feature/split-expenses', 'feature/settle-up'],
    features: [
      'groups',
      'invites',
      'permissions',
      'expense-splitting',
      'expense-questions',
      'balances',
      'settlements',
      'lists',
      'live-updates',
    ],
    content: { collection: 'useCasePages', slug: 'housemates' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-case/events-and-celebrations',
    type: 'use-case',
    path: '/use-cases/events-and-celebrations/',
    parent: 'use-cases',
    published: true,
    locales: 'all',
    footer: { group: 'useCases', order: 4 },
    related: ['feature/split-expenses', 'feature/settle-up'],
    features: [
      'invites',
      'permissions',
      'expense-splitting',
      'balances',
      'settlements',
      'comments',
      'polls',
    ],
    content: { collection: 'useCasePages', slug: 'events-and-celebrations' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guides',
    type: 'hub',
    path: '/guides/',
    parent: 'home',
    published: false,
    locales: 'all',
    footer: { group: 'useCases', order: 10 },
    related: ['use-cases', 'how-it-works', 'pricing'],
    content: { collection: 'sitePages', slug: 'guides' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-split-rent-by-room-size',
    type: 'article',
    path: '/guides/how-to-split-rent-by-room-size/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['use-case/housemates', 'feature/split-expenses', 'rent-split-calculator'],
    content: { collection: 'guides', slug: 'how-to-split-rent-by-room-size' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-split-a-holiday-villa-when-people-stay-different-nights',
    type: 'article',
    path: '/guides/how-to-split-a-holiday-villa-when-people-stay-different-nights/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['use-case/group-trips', 'feature/split-expenses', 'feature/settle-up'],
    content: { collection: 'guides', slug: 'how-to-split-a-holiday-villa-when-people-stay-different-nights' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-split-a-stag-or-hen-weekend',
    type: 'article',
    path: '/guides/how-to-split-a-stag-or-hen-weekend/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['use-case/group-trips', 'feature/split-expenses', 'feature/settle-up'],
    content: { collection: 'guides', slug: 'how-to-split-a-stag-or-hen-weekend' },
    indexing: 'per-locale-review',
  },
  {
    id: 'split-bill-calculator',
    type: 'tool',
    path: '/split-bill-calculator/',
    parent: 'home',
    published: false,
    locales: 'all',
    footer: { group: 'product', order: 8 },
    related: ['feature/split-expenses', 'feature/settle-up'],
    features: ['expense-splitting', 'balances'],
    content: { collection: 'sitePages', slug: 'split-bill-calculator' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/groups-and-permissions',
    type: 'feature',
    path: '/features/groups-and-permissions/',
    parent: 'features',
    published: false,
    locales: 'all',
    related: ['use-case/events-and-celebrations', 'use-case/housemates', 'how-it-works'],
    features: ['groups', 'invites', 'permissions', 'dashboard'],
    content: { collection: 'featurePages', slug: 'groups-and-permissions' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/plan-together',
    type: 'feature',
    path: '/features/plan-together/',
    parent: 'features',
    published: false,
    locales: 'all',
    related: ['use-case/group-trips', 'use-case/events-and-celebrations', 'use-case/housemates'],
    features: ['comments', 'reactions', 'expense-questions', 'lists', 'polls', 'live-updates'],
    content: { collection: 'featurePages', slug: 'plan-together' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/receipt-scanning',
    type: 'feature',
    path: '/features/receipt-scanning/',
    parent: 'features',
    published: false,
    locales: 'all',
    related: ['feature/split-expenses', 'use-case/group-trips'],
    features: ['receipt-scanning', 'receipt-attachments'],
    content: { collection: 'featurePages', slug: 'receipt-scanning' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/web-app',
    type: 'feature',
    path: '/features/web-app/',
    parent: 'features',
    published: false,
    locales: 'all',
    related: ['how-it-works', 'pricing'],
    features: ['home-screen', 'live-updates', 'languages', 'accessibility', 'accounts', 'feedback'],
    content: { collection: 'featurePages', slug: 'web-app' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-case/couples',
    type: 'use-case',
    path: '/use-cases/couples/',
    parent: 'use-cases',
    published: false,
    locales: 'all',
    footer: { group: 'useCases', order: 5 },
    related: ['feature/split-expenses', 'feature/settle-up', 'guide/how-to-split-bills-with-a-partner-who-earns-more'],
    features: ['groups', 'invites', 'expense-splitting', 'balances', 'settlements', 'privacy-posture'],
    content: { collection: 'useCasePages', slug: 'couples' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-split-bills-with-a-partner-who-earns-more',
    type: 'article',
    path: '/guides/how-to-split-bills-with-a-partner-who-earns-more/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['use-case/couples', 'feature/split-expenses', 'rent-split-calculator'],
    content: { collection: 'guides', slug: 'how-to-split-bills-with-a-partner-who-earns-more' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-split-a-trip-paid-in-several-currencies',
    type: 'article',
    path: '/guides/how-to-split-a-trip-paid-in-several-currencies/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['feature/multiple-currencies', 'use-case/group-trips', 'feature/settle-up'],
    content: { collection: 'guides', slug: 'how-to-split-a-trip-paid-in-several-currencies' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-collect-for-a-group-gift',
    type: 'article',
    path: '/guides/how-to-collect-for-a-group-gift/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['use-case/events-and-celebrations', 'feature/split-expenses', 'feature/settle-up'],
    content: { collection: 'guides', slug: 'how-to-collect-for-a-group-gift' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/what-to-do-when-someone-disputes-a-shared-expense',
    type: 'article',
    path: '/guides/what-to-do-when-someone-disputes-a-shared-expense/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['feature/plan-together', 'use-case/housemates', 'feature/settle-up'],
    content: { collection: 'guides', slug: 'what-to-do-when-someone-disputes-a-shared-expense' },
    indexing: 'per-locale-review',
  },
  {
    id: 'guide/how-to-settle-up-after-a-group-trip',
    type: 'article',
    path: '/guides/how-to-settle-up-after-a-group-trip/',
    parent: 'guides',
    published: false,
    locales: 'all',
    related: ['feature/settle-up', 'use-case/group-trips'],
    content: { collection: 'guides', slug: 'how-to-settle-up-after-a-group-trip' },
    indexing: 'per-locale-review',
  },
  {
    id: 'rent-split-calculator',
    type: 'tool',
    path: '/rent-split-calculator/',
    parent: 'home',
    published: false,
    locales: 'all',
    footer: { group: 'product', order: 9 },
    related: ['use-case/housemates', 'use-case/couples', 'guide/how-to-split-rent-by-room-size'],
    features: ['expense-splitting'],
    content: { collection: 'sitePages', slug: 'rent-split-calculator' },
    indexing: 'per-locale-review',
  },
  {
    id: 'compare/splitwise',
    type: 'comparison',
    path: '/compare/splitwise/',
    parent: 'home',
    published: false,
    locales: 'all',
    related: ['pricing', 'features'],
    content: { collection: 'comparePages', slug: 'splitwise' },
    indexing: 'per-locale-review',
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
