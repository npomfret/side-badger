import { PSEUDO_LOCALES } from '../i18n/pseudo';
import type { PageDef } from './pages';

/**
 * English and the pseudo-locales only: the fixtures have no real translations, and a page listing
 * every locale would need a content file for each one in strict mode (D38).
 */
const PREVIEW_LOCALES = ['en', ...PSEUDO_LOCALES] as const;

/**
 * Pages that exist only for layout review under PREVIEW_UNPUBLISHED=1 (restructure 3.2 and 6.1).
 * They are never built otherwise, are `noindex` and carry `data-unpublished`, so output check 12
 * fails any build that contains them. Their English text is the `__preview__` fixtures under
 * `src/content/**`; the pseudo-locales (PREVIEW_PSEUDO=1) derive theirs from it.
 *
 * Between them they exercise the four layouts:
 * - `preview/hub`: HubLayout, with the two preview pages below as its cards
 * - `preview/how-it-works`: HowItWorksLayout
 * - `feature/preview`: FeaturePageLayout (worked example with a currency conversion)
 * - `use-case/preview`: UseCasePageLayout (worked example that settles six payments into two)
 *
 * The hub and how-it-works previews have their own route (`preview/[slug].astro`) because the
 * real hubs and how it works are routes of their own; the other two use the real feature and
 * use-case routes. `nav` on the hub only gives the breadcrumbs a label, because the page is not
 * published and so never reaches the header.
 */
export const previewPages: readonly PageDef[] = [
  {
    id: 'preview/hub',
    type: 'hub',
    path: '/preview/hub/',
    published: false,
    locales: PREVIEW_LOCALES,
    nav: { order: 90, labelKey: 'nav.features' },
    related: ['preview/how-it-works', 'pricing'],
    content: { collection: 'sitePages', slug: '__preview__' },
    indexing: 'per-locale-review',
  },
  {
    id: 'preview/how-it-works',
    type: 'how-it-works',
    path: '/preview/how-it-works/',
    published: false,
    locales: PREVIEW_LOCALES,
    related: ['feature/preview', 'use-case/preview', 'pricing'],
    content: { collection: 'sitePages', slug: '__preview__' },
    indexing: 'per-locale-review',
  },
  {
    id: 'feature/preview',
    type: 'feature',
    path: '/features/preview/',
    parent: 'preview/hub',
    published: false,
    locales: PREVIEW_LOCALES,
    related: ['use-case/preview', 'preview/how-it-works', 'pricing'],
    content: { collection: 'featurePages', slug: '__preview__' },
    indexing: 'per-locale-review',
  },
  {
    id: 'use-case/preview',
    type: 'use-case',
    path: '/use-cases/preview/',
    parent: 'preview/hub',
    published: false,
    locales: PREVIEW_LOCALES,
    related: ['feature/preview', 'preview/how-it-works', 'pricing'],
    content: { collection: 'useCasePages', slug: '__preview__' },
    indexing: 'per-locale-review',
  },
];
