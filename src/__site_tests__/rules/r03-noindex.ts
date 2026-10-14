/**
 * Rule 3: non-indexable pages carry noindex, no canonical and no alternates. Which pages are
 * non-indexable comes from D8 (registry, review status, legal, 404, pseudo-locales), not from the
 * page, so an indexable page wrongly marked noindex fails too.
 */
import {
  alternateLinks,
  canonicalLinks,
  declaresNoindex,
  indexability,
  metaContent,
  type Site,
} from '../lib/site';

export function checkNoindex(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const at = page.urlPath;
    const expected = indexability(page);
    const noindex = declaresNoindex(page);
    if (expected?.indexable && noindex) {
      problems.push(`${at}: indexable under D8 (${expected.reason}) but carries noindex`);
      continue;
    }
    if (expected ? expected.indexable : !noindex) continue;
    if (expected && !noindex) problems.push(`${at}: ${expected.reason} must be noindex but is indexable`);
    const robots = metaContent(page.$, 'name', 'robots');
    if (robots.length !== 1 || !/(^|,)\s*noindex\s*(,|$)/i.test(robots[0])) {
      problems.push(`${at}: non-indexable page needs one <meta name="robots" content="noindex">`);
    }
    if (canonicalLinks(page).length > 0) problems.push(`${at}: non-indexable page has a canonical`);
    if (alternateLinks(page).length > 0) problems.push(`${at}: non-indexable page has hreflang alternates`);
  }
  return problems;
}
