import { describe, expect, it } from 'vitest';
import { checkCanonical } from './rules/r02-canonical';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 2: indexable pages have one absolute, slash-form canonical equal to og:url', () => {
  it('dist: every indexable page', () => {
    expect(checkCanonical(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a correct page', () => {
      expect(checkCanonical(one('good/home.html'))).toEqual([]);
    });

    it('ignores non-indexable pages', () => {
      expect(checkCanonical(one('good/noindex.html', 'fr/privacy/index.html'))).toEqual([]);
    });

    it.each([
      ['r02/no-canonical.html', 'expected exactly one canonical, found 0'],
      ['r02/two-canonicals.html', 'expected exactly one canonical, found 2'],
      ['r02/relative-canonical.html', 'not an absolute'],
      ['r02/wrong-page-canonical.html', "not the page's own URL"],
      ['r02/og-url-differs.html', 'differs from canonical'],
      ['r02/no-og-url.html', 'exactly one og:url'],
    ])('fails %s', (name, message) => {
      expect(mentions(checkCanonical(one(name)), message)).toBe(true);
    });

    it('fails a canonical without the trailing slash', () => {
      const problems = checkCanonical(one('r02/no-slash-canonical.html', 'pricing/index.html'));
      expect(mentions(problems, 'not in slash form')).toBe(true);
    });
  });
});
