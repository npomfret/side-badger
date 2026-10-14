/** Rule 7: hreflang clusters are complete, symmetric, self-including, with x-default, pointing at existing indexable pages with the configured tags. */
import { localeConfig } from '../../i18n';
import { SITE_ORIGIN, alternateLinks, isIndexable, type Site, type SitePage } from '../lib/site';

export function checkHreflang(site: Site): string[] {
  const problems: string[] = [];
  const byUrl = new Map(site.pages.map(page => [`${SITE_ORIGIN}${page.urlPath}`, page]));
  const clusters = new Map<string, SitePage[]>();
  for (const page of site.pages) {
    if (page.is404 || !page.page || !page.locale || !isIndexable(page)) continue;
    clusters.set(page.page.id, [...(clusters.get(page.page.id) ?? []), page]);
  }
  for (const members of clusters.values()) {
    const expected = new Set<string>();
    for (const member of members) {
      expected.add(`${localeConfig[member.locale!].hreflang} -> ${SITE_ORIGIN}${member.urlPath}`);
    }
    const english = members.find(member => member.locale === 'en');
    if (english) expected.add(`x-default -> ${SITE_ORIGIN}${english.urlPath}`);

    for (const member of members) {
      const at = member.urlPath;
      const alternates = alternateLinks(member);
      const seen = new Set<string>();
      for (const alt of alternates) {
        if (seen.has(alt.hreflang)) problems.push(`${at}: duplicate hreflang "${alt.hreflang}"`);
        seen.add(alt.hreflang);
        const target = byUrl.get(alt.href);
        if (!target) {
          problems.push(`${at}: hreflang target ${alt.href} does not exist in the build`);
        } else if (!isIndexable(target)) {
          problems.push(`${at}: hreflang target ${alt.href} is not indexable`);
        } else if (alt.hreflang !== 'x-default' && target.locale) {
          const tag = localeConfig[target.locale].hreflang;
          if (alt.hreflang !== tag) {
            problems.push(`${at}: hreflang "${alt.hreflang}" for ${alt.href}, configured tag is "${tag}"`);
          }
        }
      }
      if (!alternates.some(alt => alt.hreflang === 'x-default')) problems.push(`${at}: no x-default alternate`);
      const own = `${SITE_ORIGIN}${member.urlPath}`;
      if (!alternates.some(alt => alt.href === own)) problems.push(`${at}: cluster does not list the page itself`);
      const actual = new Set(alternates.map(alt => `${alt.hreflang} -> ${alt.href}`));
      const missing = [...expected].filter(entry => !actual.has(entry));
      const extra = [...actual].filter(entry => !expected.has(entry));
      if (missing.length > 0) problems.push(`${at}: cluster is missing ${missing.join('; ')}`);
      if (extra.length > 0) problems.push(`${at}: cluster has unexpected ${extra.join('; ')}`);
    }
  }
  return problems;
}
