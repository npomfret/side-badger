/**
 * Which page/locale pairs search engines may index (restructure D8, 2.6).
 *
 * One function decides canonical, `robots`, the sitemap and the `hreflang` clusters, so they
 * cannot disagree. A pair is indexable only when the page is published, the locale's review
 * status is `reviewed` or `legacy` (English is always `reviewed`), legal pages are English, the
 * page is not the not-found page, and the locale is not a preview pseudo-locale.
 */
import { isPseudoLocale, type Locale } from '../i18n';
import { getPage } from '../site/pages';

export type ReviewStatus = 'legacy' | 'machine' | 'checked' | 'reviewed';

/** Statuses D8 allows into search. `checked` ships for visitors but stays out until reviewed. */
const INDEXABLE_STATUSES: readonly ReviewStatus[] = ['legacy', 'reviewed'];

interface LockFile {
  pages?: Record<string, ReviewStatus>;
}

const lockFiles = import.meta.glob<LockFile>('../i18n/locks/*.json', {
  eager: true,
  import: 'default',
});

/** `locale` → page id → status, read from `src/i18n/locks/<locale>.json` (P04). */
const locksByLocale: Record<string, Record<string, ReviewStatus>> = Object.fromEntries(
  Object.entries(lockFiles).map(([path, lock]) => [
    path.replace(/^.*\/(.+)\.json$/, '$1'),
    lock.pages ?? {},
  ])
);

/**
 * The review status of a page in a locale, or undefined when no lock records one (which D8
 * treats as not indexable). Pages built from i18n keys (home, pricing) are recorded in the
 * locale's lock file. Content-collection pages record theirs in the entry's `review.status`;
 * until those pages exist, a lock entry (if any) is the only source.
 */
export function reviewStatus(pageId: string, locale: Locale): ReviewStatus | undefined {
  if (locale === 'en') return 'reviewed';
  return (overrides.get(locale) ?? locksByLocale[locale])?.[pageId];
}

const overrides = new Map<string, Record<string, ReviewStatus>>();

/** Fixture tests only: replace a locale's lock `pages` (pass undefined to restore the real ones). */
export function overrideLockPages(
  locale: string,
  pages: Record<string, ReviewStatus> | undefined
): void {
  if (pages) overrides.set(locale, pages);
  else overrides.delete(locale);
}

export function isIndexable(pageId: string, locale: Locale): boolean {
  if (pageId === 'not-found') return false;
  if (isPseudoLocale(locale)) return false;
  const page = getPage(pageId);
  if (!page || !page.published) return false;
  if (page.type === 'legal' || page.indexing === 'english-only') return locale === 'en';
  const status = reviewStatus(pageId, locale);
  return status !== undefined && INDEXABLE_STATUSES.includes(status);
}
