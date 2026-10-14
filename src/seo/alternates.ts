/**
 * `hreflang` clusters (restructure 2.6, D8).
 *
 * The cluster of a page is every locale where the page is both built and indexable, each
 * pointing at its canonical URL, plus `x-default` for English. Built means the route exists
 * (`pathsFor`), so an English-first build never lists a locale it did not generate. Only an
 * indexable page emits a cluster; every other page emits none.
 */
import { localeConfig, type Locale } from '../i18n';
import { pathsFor } from '../site/routes';
import { canonicalFor } from './urls';
import { isIndexable } from './indexability';

export interface Alternate {
  /** The `hreflang` attribute: a locale's configured tag, or `x-default` */
  hreflang: string;
  /** Absolute, slash-form URL */
  href: string;
}

/** The locales where a page is built and indexable, in build order (English first). */
export function indexableLocalesFor(pageId: string): Locale[] {
  if (pageId === 'not-found') return [];
  return pathsFor(pageId)
    .map(path => path.props.locale)
    .filter(locale => isIndexable(pageId, locale));
}

/** The alternates a page emits. Empty unless the page itself is indexable in `locale`. */
export function alternatesFor(pageId: string, locale: Locale): Alternate[] {
  if (!isIndexable(pageId, locale)) return [];
  const cluster = indexableLocalesFor(pageId);
  if (!cluster.includes(locale)) return [];
  const alternates: Alternate[] = cluster.map(loc => ({
    hreflang: localeConfig[loc].hreflang,
    href: canonicalFor(pageId, loc),
  }));
  if (cluster.includes('en')) {
    alternates.push({ hreflang: 'x-default', href: canonicalFor(pageId, 'en') });
  }
  return alternates;
}
