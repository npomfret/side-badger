/**
 * Navigation data from the page registry (restructure D21, D22). The header, the mobile menu, the
 * footer, the breadcrumbs and their BreadcrumbList JSON-LD all read the functions here, so the
 * visible links and the structured data cannot drift apart.
 */
import { load } from 'js-yaml';
import { isPseudoLocale, t, type Locale, type TranslationKey } from '../../i18n';
import { pseudoize } from '../../i18n/pseudo';
import { crossLinkedIds } from '../../site/cross-links';
import { allPages, getPage, type PageDef } from '../../site/pages';
import { pathsFor } from '../../site/routes';
import { canonicalFor, localizedPath } from '../../seo/urls';
import { breadcrumbListNode, type JsonLdNode } from '../../seo/jsonld';

export type PageLabels = Readonly<Record<string, string>>;

/** Link text for registry pages that have no `nav` entry. Literal keys, so the unused-key test sees them. */
const FOOTER_LABEL_KEYS: Readonly<Record<string, TranslationKey>> = {
  pricing: 'footer.pricing',
  privacy: 'footer.privacy',
  terms: 'footer.terms',
  cookies: 'footer.cookies',
};

/**
 * The link text of a page: a label supplied by the caller (a content page's title), else the
 * registry's `nav.labelKey`, else a `footer.<id>` string. A page with none is a build error, so a
 * newly published page cannot reach the navigation without a name.
 */
export function pageLabel(page: PageDef, locale: Locale, labels: PageLabels = {}): string {
  if (labels[page.id]) return labels[page.id];
  if (page.nav) return t(page.nav.labelKey, locale);
  const key = FOOTER_LABEL_KEYS[page.id];
  if (key) return t(key, locale);
  throw new Error(
    `Page "${page.id}" has no link label: give it nav.labelKey, add it to FOOTER_LABEL_KEYS, or pass labels.`
  );
}

/** The content files by path. Lazy, so only the files a label needs are read, once per build. */
const contentFiles = import.meta.glob('/src/content/{features,use-cases,pages}/*/*.yaml', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const CONTENT_DIRS = { featurePages: 'features', useCasePages: 'use-cases', sitePages: 'pages' } as const;

/** The link text in a content entry: its short `navLabel` if it has one, else its `h1`. */
export function linkTextOf(data: { navLabel?: unknown; h1?: unknown } | null | undefined): string | undefined {
  for (const value of [data?.navLabel, data?.h1]) if (typeof value === 'string' && value) return value;
  return undefined;
}

/** The link text (`navLabel`, else `h1`) of a page's content entry in a locale (a pseudo-locale derives it from English), if the entry exists. */
export async function contentTitle(page: PageDef, locale: Locale): Promise<string | undefined> {
  if (!page.content) return undefined;
  const { collection, slug } = page.content;
  const file = `/src/content/${CONTENT_DIRS[collection]}/${slug}/${isPseudoLocale(locale) ? 'en' : locale}.yaml`;
  const read = contentFiles[file];
  if (!read) return undefined;
  const text = linkTextOf(load(await read()) as { navLabel?: unknown; h1?: unknown } | null);
  if (!text) return undefined;
  return isPseudoLocale(locale) ? pseudoize(text, locale) : text;
}

const labelCache = new Map<string, Promise<PageLabels>>();

/**
 * Link text for the pages whose name is their content title (feature and use-case pages, which
 * have no `nav`): the entry's `navLabel`, else its `h1`. Only pages that are published and built in `locale` get a
 * label. Cached per locale, so the footer on every page costs one lookup. `readTitle` is a seam
 * for tests.
 */
export function pageLabels(locale: Locale, readTitle = contentTitle): Promise<PageLabels> {
  const cached = readTitle === contentTitle ? labelCache.get(locale) : undefined;
  if (cached) return cached;
  const result = (async () => {
    const labels: Record<string, string> = {};
    for (const page of allPages()) {
      if (!page.content || page.nav || !isLinkable(page, locale)) continue;
      const title = await readTitle(page, locale);
      if (title) labels[page.id] = title;
    }
    return labels;
  })();
  if (readTitle === contentTitle) labelCache.set(locale, result);
  return result;
}

const builtLocales = new Map<string, ReadonlySet<Locale>>();

/** Forget what was looked up about routes and labels (tests that change what is built). */
export function clearNavigationCache(): void {
  builtLocales.clear();
  labelCache.clear();
}

/** Whether the page is published and has a route in this locale (English-first builds skip some). */
export function isLinkable(page: PageDef, locale: Locale): boolean {
  if (!page.published) return false;
  let set = builtLocales.get(page.id);
  if (!set) {
    set = new Set(pathsFor(page.id).map(path => path.props.locale));
    builtLocales.set(page.id, set);
  }
  return set.has(locale);
}

export interface NavLink {
  id: string;
  href: string;
  label: string;
  /** `page` on the current page, `true` on its section ancestor */
  current?: 'page' | 'true';
}

/** The page's `parent` chain, nearest first. */
function ancestorsOf(page: PageDef): PageDef[] {
  const chain: PageDef[] = [];
  const seen = new Set<string>([page.id]);
  let parent = page.parent ? getPage(page.parent) : undefined;
  while (parent && !seen.has(parent.id)) {
    chain.push(parent);
    seen.add(parent.id);
    parent = parent.parent ? getPage(parent.parent) : undefined;
  }
  return chain;
}

/** The header and mobile menu links: registry pages with `nav` that are published, in order. */
export function navLinks(currentPageId: string, locale: Locale, labels: PageLabels = {}): NavLink[] {
  const current = getPage(currentPageId);
  const ancestorIds = new Set(current ? ancestorsOf(current).map(page => page.id) : []);
  return allPages()
    .filter(page => page.nav && isLinkable(page, locale))
    .sort((a, b) => a.nav!.order - b.nav!.order)
    .map(page => ({
      id: page.id,
      href: localizedPath(page.id, locale),
      label: pageLabel(page, locale, labels),
      current: page.id === currentPageId ? 'page' : ancestorIds.has(page.id) ? 'true' : undefined,
    }));
}

export type FooterGroupId = NonNullable<PageDef['footer']>['group'];

export interface FooterGroup {
  id: FooterGroupId;
  heading: string;
  links: NavLink[];
}

const GROUPS: { id: FooterGroupId; headingKey: TranslationKey }[] = [
  { id: 'product', headingKey: 'footer.product' },
  { id: 'useCases', headingKey: 'footer.useCases' },
  { id: 'legal', headingKey: 'footer.legal' },
];

/** The footer's link groups from the registry. A group with no published page is left out. */
export function footerGroups(locale: Locale, labels: PageLabels = {}): FooterGroup[] {
  return GROUPS.map(({ id, headingKey }) => ({
    id,
    heading: t(headingKey, locale),
    links: allPages()
      .filter(page => page.footer?.group === id && isLinkable(page, locale))
      .sort((a, b) => a.footer!.order - b.footer!.order)
      .map(page => ({
        id: page.id,
        href: localizedPath(page.id, locale),
        label: pageLabel(page, locale, labels),
      })),
  })).filter(group => group.links.length > 0);
}

export interface Crumb {
  name: string;
  /** Localized path */
  href: string;
  /** Absolute URL, for the JSON-LD */
  url: string;
}

/**
 * The breadcrumb trail (Home, the `parent` chain, the page) for a page two or more levels below
 * Home, else an empty list. `currentName` is the page's own name; ancestors use their labels.
 */
export function breadcrumbsFor(
  pageId: string,
  locale: Locale,
  currentName: string,
  labels: PageLabels = {}
): Crumb[] {
  const page = getPage(pageId);
  if (!page || page.id === 'home') return [];
  const chain = ancestorsOf(page).reverse().filter(p => p.id !== 'home');
  // Depth is the number of levels below Home: /pricing/ is 1, /features/split-expenses/ is 2
  if (chain.length + 1 < 2) return [];
  const home = getPage('home')!;
  const crumb = (p: PageDef, name: string): Crumb => ({
    name,
    href: localizedPath(p.id, locale),
    url: canonicalFor(p.id, locale),
  });
  return [
    crumb(home, t('nav.home', locale)),
    ...chain.map(p => crumb(p, pageLabel(p, locale, labels))),
    crumb(page, currentName),
  ];
}

/** The BreadcrumbList node for the same trail the page shows. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]): JsonLdNode[] {
  return crumbs.length ? [breadcrumbListNode(crumbs)] : [];
}

/**
 * Pages related to this one, published only (see `crossLinkedIds`).
 */
export function relatedPages(pageId: string, locale: Locale): PageDef[] {
  const page = getPage(pageId);
  if (!page) return [];
  return crossLinkedIds(page)
    .map(id => getPage(id))
    .filter((other): other is PageDef => !!other && isLinkable(other, locale));
}
