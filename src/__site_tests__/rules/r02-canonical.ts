/** Rule 2: indexable pages have exactly one canonical, absolute, slash form, equal to their own URL and to og:url. */
import { SITE_ORIGIN, canonicalLinks, isIndexable, metaContent, type Site } from '../lib/site';

export function checkCanonical(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    if (page.is404 || !isIndexable(page)) continue;
    const at = page.urlPath;
    const canonicals = canonicalLinks(page);
    if (canonicals.length !== 1) {
      problems.push(`${at}: expected exactly one canonical, found ${canonicals.length}`);
    }
    const [canonical] = canonicals;
    const own = `${SITE_ORIGIN}${page.urlPath}`;
    if (canonical !== undefined) {
      if (!canonical.startsWith(`${SITE_ORIGIN}/`)) {
        problems.push(`${at}: canonical "${canonical}" is not an absolute ${SITE_ORIGIN} URL`);
      } else if (!canonical.endsWith('/')) {
        problems.push(`${at}: canonical "${canonical}" is not in slash form`);
      }
      if (canonical !== own) problems.push(`${at}: canonical "${canonical}" is not the page's own URL ${own}`);
    }
    const ogUrls = metaContent(page.$, 'property', 'og:url');
    if (ogUrls.length !== 1) problems.push(`${at}: expected exactly one og:url, found ${ogUrls.length}`);
    else if (canonical !== undefined && ogUrls[0] !== canonical) {
      problems.push(`${at}: og:url "${ogUrls[0]}" differs from canonical "${canonical}"`);
    }
  }
  return problems;
}
