/**
 * Loading the content behind a page, and the route helpers the layouts' route files share
 * (restructure 6.1). Everything that touches `astro:content` is here, so the layouts stay
 * presentational.
 *
 * - `loadPageContent(pageId, locale)` reads the YAML entry (`<slug>/<locale>`, the locale keeps
 *   its case) and never falls back to English. A pseudo-locale (PREVIEW_PSEUDO=1) has no YAML: it
 *   is the English entry run through `pseudoize` (D38).
 * - Preview fixtures (`__preview__` slug, PREVIEW_UNPUBLISHED=1) live in `__preview__/en.yaml`;
 *   the how-it-works fixture shares the directory as `__preview__/how-it-works.yaml`, because a
 *   directory holds one `en.yaml` and `sitePages` has two shapes.
 * - `layoutPaths` is `pathsForType` for a route file, minus the unpublished pages that do not
 *   have their English entry yet (their content package has not landed): a build of every
 *   unpublished page therefore works while the content is still being written. A published
 *   page without its entry is an error. Hub cards and related links leave out the same pages,
 *   so a page whose entry exists can be previewed before the pages it links to are written.
 */
import { getEntry } from 'astro:content';
import { isPseudoLocale, type Locale } from '../../i18n';
import { canonicalFor, localizedPath } from '../../seo/urls';
import { crossLinkedIds } from '../../site/cross-links';
import { allPages, builtPages, getPage, requirePage, type PageDef, type PageType } from '../../site/pages';
import { pathsFor, pathsForType, type StaticPath } from '../../site/routes';
import { pageLabel } from '../nav/navigation';
import { isBetaPage } from './beta';
import { pseudoizeContent } from './pseudo-content';

export const PREVIEW_SLUG = '__preview__';

type Collection = NonNullable<PageDef['content']>['collection'];

function entryId(page: PageDef, locale: Locale): string {
  const content = page.content!;
  if (content.slug === PREVIEW_SLUG) {
    return `${PREVIEW_SLUG}/${page.type === 'how-it-works' ? 'how-it-works' : 'en'}`;
  }
  return `${content.slug}/${isPseudoLocale(locale) ? 'en' : locale}`;
}

async function readEntry(page: PageDef, locale: Locale): Promise<{ data: unknown } | undefined> {
  const collection: Collection = page.content!.collection;
  return (await getEntry(collection, entryId(page, locale))) ?? undefined;
}

/** The validated content of a page in a locale. Throws when the entry is missing (no fallback). */
export async function loadPageContent<T>(pageId: string, locale: Locale): Promise<T> {
  const page = requirePage(pageId);
  if (!page.content) throw new Error(`Page "${pageId}" has no content entry`);
  const entry = await readEntry(page, locale);
  if (!entry) {
    throw new Error(`Missing content: ${pageId} in ${locale} (${page.content.collection} "${entryId(page, locale)}")`);
  }
  return (isPseudoLocale(locale) ? pseudoizeContent(entry.data, locale) : entry.data) as T;
}

/**
 * Whether a built page gets its routes: always when published (a missing entry then throws in
 * `loadPageContent`), and for an unpublished page only once its English entry exists.
 */
async function routed(page: PageDef): Promise<boolean> {
  return page.published || !page.content || !!(await readEntry(page, 'en'));
}

/** Route paths for a type, limited to the pages `keep` accepts. See the module comment. */
export async function layoutPaths(type: PageType, keep: (pageId: string) => boolean = () => true): Promise<StaticPath[]> {
  const paths = pathsForType(type).filter(path => keep(path.props.pageId));
  const result: StaticPath[] = [];
  for (const path of paths) {
    if (await routed(requirePage(path.props.pageId))) result.push(path);
  }
  return result;
}

/** A page's own link text: its registry label, else (a content page with no `nav`) its heading. */
export async function pageTitle(page: PageDef, locale: Locale): Promise<string> {
  if (page.content && !page.nav) {
    return (await loadPageContent<{ h1: string }>(page.id, locale)).h1;
  }
  return pageLabel(page, locale);
}

export interface PageCard {
  id: string;
  href: string;
  /** Absolute URL, for JSON-LD */
  url: string;
  title: string;
  description?: string;
  /** The page covers a beta feature: the link shows the beta label (see beta.ts) */
  beta: boolean;
}

async function cardFor(page: PageDef, locale: Locale): Promise<PageCard> {
  const base = {
    id: page.id,
    href: localizedPath(page.id, locale),
    url: canonicalFor(page.id, locale),
    beta: isBetaPage(page.id),
  };
  if (!page.content) return { ...base, title: await pageTitle(page, locale) };
  const data = await loadPageContent<{ h1: string; meta: { description: string } }>(page.id, locale);
  return { ...base, title: data.h1, description: data.meta.description };
}

/**
 * Whether `page` exists in `locale`, so it can be linked: published pages, or under
 * PREVIEW_UNPUBLISHED=1 every registered page that has its routes (see `routed`).
 */
async function builtIn(page: PageDef, locale: Locale): Promise<boolean> {
  return (
    builtPages().includes(page) &&
    pathsFor(page.id).some(path => path.props.locale === locale) &&
    (await routed(page))
  );
}

async function filterAsync<T>(items: readonly T[], keep: (item: T) => Promise<boolean>): Promise<T[]> {
  const kept = await Promise.all(items.map(keep));
  return items.filter((_item, index) => kept[index]);
}

/** The hub's cards: its child pages (`parent`), in registry order, with their descriptions. */
export async function childCards(hubId: string, locale: Locale): Promise<PageCard[]> {
  const children = await filterAsync(
    allPages().filter(page => page.parent === hubId),
    page => builtIn(page, locale)
  );
  return Promise.all(children.map(page => cardFor(page, locale)));
}

/**
 * The pages a page links to (its registry `related` list, the feature pages a use case depicts and
 * the use cases that depict a feature), as cards. Like `relatedPages` in the navigation module,
 * but it counts every page that is built, so a PREVIEW_UNPUBLISHED=1 build shows the links the
 * published site will have.
 */
export async function relatedCards(
  pageId: string,
  locale: Locale,
  filter: (page: PageDef) => boolean = () => true
): Promise<PageCard[]> {
  const page = requirePage(pageId);
  const candidates = crossLinkedIds(page)
    .map(id => getPage(id))
    .filter((other): other is PageDef => !!other && filter(other));
  const pages = await filterAsync(candidates, other => builtIn(other, locale));
  return Promise.all(pages.map(other => cardFor(other, locale)));
}
