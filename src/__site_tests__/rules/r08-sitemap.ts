/** Rule 8: the sitemap URL set equals the set of indexable canonical URLs (no pseudo-locales). robots.txt names the absolute sitemap and disallows /go/. */
import * as cheerio from 'cheerio';
import { SITE_ORIGIN, isIndexable, isPseudoPage, type Site } from '../lib/site';

function locs(xml: string): string[] {
  const $ = cheerio.load(xml, { xml: true });
  return $('loc').toArray().map(el => $(el).text().trim());
}

export function sitemapUrls(site: Site): { urls: string[]; problems: string[] } {
  const problems: string[] = [];
  const indexBody = site.read('sitemap-index.xml');
  if (!indexBody) return { urls: [], problems: ['sitemap-index.xml is missing'] };
  const urls: string[] = [];
  for (const loc of locs(indexBody.toString('utf8'))) {
    if (!loc.startsWith(`${SITE_ORIGIN}/`)) {
      problems.push(`sitemap-index.xml lists "${loc}", which is not an absolute ${SITE_ORIGIN} URL`);
      continue;
    }
    const file = loc.slice(SITE_ORIGIN.length + 1);
    const body = site.read(file);
    if (!body) problems.push(`sitemap-index.xml lists ${loc}, which is not in the build`);
    else urls.push(...locs(body.toString('utf8')));
  }
  return { urls, problems };
}

export function checkSitemap(site: Site): string[] {
  const { urls, problems } = sitemapUrls(site);
  const expected = new Set(
    site.pages.filter(page => !page.is404 && isIndexable(page)).map(page => `${SITE_ORIGIN}${page.urlPath}`)
  );
  const pseudo = new Set(site.pages.filter(isPseudoPage).map(page => `${SITE_ORIGIN}${page.urlPath}`));
  const actual = new Set(urls);
  if (actual.size !== urls.length) problems.push('sitemap lists a URL more than once');
  for (const url of actual) {
    if (pseudo.has(url)) problems.push(`sitemap lists pseudo-locale page ${url}`);
    else if (!expected.has(url)) problems.push(`sitemap lists ${url}, which is not an indexable canonical URL`);
  }
  for (const url of expected) {
    if (!actual.has(url)) problems.push(`sitemap is missing indexable URL ${url}`);
  }

  const robots = site.read('robots.txt')?.toString('utf8');
  if (robots === undefined) {
    problems.push('robots.txt is missing');
  } else {
    const lines = robots.split(/\r?\n/).map(line => line.trim());
    if (!lines.includes(`Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`)) {
      problems.push(`robots.txt does not name "Sitemap: ${SITE_ORIGIN}/sitemap-index.xml"`);
    }
    if (!lines.includes('Disallow: /go/')) problems.push('robots.txt does not disallow /go/');
  }
  return problems;
}
