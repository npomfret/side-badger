/** Rule 3: non-indexable pages carry noindex, no canonical and no alternates. Pseudo-locale, 404, unpublished and localized legal pages must be non-indexable. */
import {
  alternateLinks,
  canonicalLinks,
  isIndexable,
  metaContent,
  mustBeNoindex,
  type Site,
} from '../lib/site';

export function checkNoindex(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const at = page.urlPath;
    const reason = mustBeNoindex(page);
    if (reason && isIndexable(page)) {
      problems.push(`${at}: ${reason} must be noindex but is indexable`);
    }
    if (isIndexable(page)) continue;
    const robots = metaContent(page.$, 'name', 'robots');
    if (robots.length !== 1 || !/(^|,)\s*noindex\s*(,|$)/i.test(robots[0])) {
      problems.push(`${at}: non-indexable page needs one <meta name="robots" content="noindex">`);
    }
    if (canonicalLinks(page).length > 0) problems.push(`${at}: non-indexable page has a canonical`);
    if (alternateLinks(page).length > 0) problems.push(`${at}: non-indexable page has hreflang alternates`);
  }
  return problems;
}
