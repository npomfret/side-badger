import { describe, expect, it } from 'vitest';
import { checkSitemap } from './rules/r08-sitemap';
import { dist } from './lib/site';
import { fx, mentions, sites } from './lib/fixtures';

const S = 'https://sidebadger.me';
const index = (...files: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files
    .map(file => `<sitemap><loc>${S}/${file}</loc></sitemap>`)
    .join('')}</sitemapindex>`;
const urlset = (...urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map(url => `<url><loc>${url}</loc></url>`)
    .join('')}</urlset>`;
const ROBOTS = `User-agent: *\nDisallow: /go/\n\nSitemap: ${S}/sitemap-index.xml\n`;

const pages = {
  'index.html': fx('good/home.html'),
  'fr/index.html': fx('good/fr-home.html'),
  'privacy/index.html': fx('good/home.html'),
  'fr/privacy/index.html': fx('good/noindex.html'),
  'xx-long/index.html': fx('good/noindex.html'),
};
const goodUrls = [`${S}/`, `${S}/fr/`, `${S}/privacy/`];
const build = (urls: string[], robots = ROBOTS, extra: Record<string, string> = {}) =>
  sites({
    ...pages,
    'sitemap-index.xml': index('sitemap-0.xml'),
    'sitemap-0.xml': urlset(...urls),
    'robots.txt': robots,
    ...extra,
  });

describe('rule 8: the sitemap equals the indexable canonical URLs', () => {
  it('dist: sitemap and robots.txt', () => {
    expect(checkSitemap(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes when the sitemap lists exactly the indexable pages', () => {
      expect(checkSitemap(build(goodUrls))).toEqual([]);
    });

    it('fails a missing indexable URL', () => {
      expect(mentions(checkSitemap(build(goodUrls.slice(0, 2))), 'missing indexable URL', '/privacy/')).toBe(true);
    });

    it('takes indexability from D8, not from the page: a wrongly noindexed page is still required', () => {
      const site = build(goodUrls.slice(0, 1).concat(goodUrls.slice(2)), ROBOTS, { 'fr/index.html': fx('good/noindex.html') });
      expect(mentions(checkSitemap(site), 'missing indexable URL', '/fr/')).toBe(true);
    });

    it('fails a noindex URL in the sitemap', () => {
      const problems = checkSitemap(build([...goodUrls, `${S}/fr/privacy/`]));
      expect(mentions(problems, '/fr/privacy/', 'not an indexable canonical URL')).toBe(true);
    });

    it('fails a pseudo-locale URL in the sitemap', () => {
      expect(mentions(checkSitemap(build([...goodUrls, `${S}/xx-long/`])), 'pseudo-locale page', '/xx-long/')).toBe(true);
    });

    it('fails a URL with no page behind it', () => {
      expect(mentions(checkSitemap(build([...goodUrls, `${S}/en-gb/`])), '/en-gb/')).toBe(true);
    });

    it('fails a duplicated URL', () => {
      expect(mentions(checkSitemap(build([...goodUrls, `${S}/`])), 'more than once')).toBe(true);
    });

    it('fails a missing sitemap-index.xml', () => {
      const site = sites({ ...pages, 'robots.txt': ROBOTS });
      expect(mentions(checkSitemap(site), 'sitemap-index.xml is missing')).toBe(true);
    });

    it('fails an index that lists a sitemap file the build lacks', () => {
      const site = sites({ ...pages, 'sitemap-index.xml': index('sitemap-9.xml'), 'robots.txt': ROBOTS });
      expect(mentions(checkSitemap(site), 'sitemap-9.xml', 'not in the build')).toBe(true);
    });

    it('fails robots.txt without the absolute sitemap line', () => {
      const problems = checkSitemap(build(goodUrls, 'User-agent: *\nDisallow: /go/\nSitemap: /sitemap-index.xml\n'));
      expect(mentions(problems, 'robots.txt', 'Sitemap:')).toBe(true);
    });

    it('fails robots.txt without Disallow: /go/', () => {
      const problems = checkSitemap(build(goodUrls, `User-agent: *\n\nSitemap: ${S}/sitemap-index.xml\n`));
      expect(mentions(problems, 'does not disallow /go/')).toBe(true);
    });
  });
});
