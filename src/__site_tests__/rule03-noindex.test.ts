import { describe, expect, it } from 'vitest';
import { checkNoindex } from './rules/r03-noindex';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 3: non-indexable pages carry noindex and nothing that promotes them', () => {
  it('dist: every non-indexable page, and pages that must be non-indexable', () => {
    expect(checkNoindex(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a clean noindex page', () => {
      expect(checkNoindex(one('good/noindex.html'))).toEqual([]);
    });

    it('passes a correct indexable page', () => {
      expect(checkNoindex(one('good/home.html'))).toEqual([]);
    });

    it('fails noindex with a canonical', () => {
      expect(mentions(checkNoindex(one('r03/noindex-with-canonical.html')), 'has a canonical')).toBe(true);
    });

    it('fails noindex with hreflang alternates', () => {
      expect(mentions(checkNoindex(one('r03/noindex-with-alternates.html')), 'hreflang alternates')).toBe(true);
    });

    it('treats a robots meta without noindex as indexable (no false pass)', () => {
      expect(checkNoindex(one('r03/robots-follow-only.html'))).toEqual([]);
    });

    it('fails an indexable localized legal page', () => {
      const problems = checkNoindex(one('r03/indexable-localized-legal.html', 'fr/privacy/index.html'));
      expect(mentions(problems, 'localized legal page', 'must be noindex')).toBe(true);
    });

    it('allows the English legal page to be indexable', () => {
      expect(checkNoindex(one('good/home.html', 'privacy/index.html'))).toEqual([]);
    });

    it('fails an indexable pseudo-locale page (pseudo-locales are never indexable)', () => {
      const problems = checkNoindex(one('r03/indexable-pseudo.html', 'xx-long/index.html'));
      expect(mentions(problems, 'pseudo-locale', 'must be noindex')).toBe(true);
    });

    it('fails an indexable 404 page', () => {
      expect(mentions(checkNoindex(one('r03/indexable-404.html', '404.html')), '404', 'must be noindex')).toBe(true);
    });

    it('passes a noindex 404 page', () => {
      expect(checkNoindex(one('r03/noindex-404.html', '404.html'))).toEqual([]);
    });

    it('fails an indexable page marked data-unpublished', () => {
      const site = one('good/home.html', 'index.html');
      site.pages[0].$('body').append('<main data-unpublished></main>');
      expect(mentions(checkNoindex(site), 'data-unpublished')).toBe(true);
    });
  });
});
