import { describe, expect, it } from 'vitest';
import { checkTitleDescription } from './rules/r05-title-description';
import { dist } from './lib/site';
import { fx, mentions, one, sites } from './lib/fixtures';

describe('rule 5: title and description present, and unique among indexable pages per locale', () => {
  it('dist: every page', () => {
    expect(checkTitleDescription(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a correct page', () => {
      expect(checkTitleDescription(one('good/home.html'))).toEqual([]);
    });

    it.each([
      ['r05/no-title.html', '<title>'],
      ['r05/empty-title.html', '<title>'],
      ['r05/no-description.html', 'meta description'],
      ['r05/empty-description.html', 'meta description'],
    ])('fails %s', (name, message) => {
      expect(mentions(checkTitleDescription(one(name)), message)).toBe(true);
    });

    it('fails a duplicate title in the same locale', () => {
      const site = sites({ 'index.html': fx('good/home.html'), 'pricing/index.html': fx('r05/same-title-as-home.html') });
      expect(mentions(checkTitleDescription(site), 'duplicate title')).toBe(true);
    });

    it('fails a duplicate description in the same locale', () => {
      const site = sites({ 'index.html': fx('good/home.html'), 'pricing/index.html': fx('r05/same-description-as-home.html') });
      expect(mentions(checkTitleDescription(site), 'duplicate description')).toBe(true);
    });

    it('allows the same title in different locales', () => {
      const site = sites({ 'index.html': fx('good/home.html'), 'fr/index.html': fx('good/home.html') });
      expect(checkTitleDescription(site)).toEqual([]);
    });

    it('ignores non-indexable duplicates', () => {
      const site = sites({ 'index.html': fx('good/home.html'), 'terms/index.html': fx('good/noindex.html'), 'privacy/index.html': fx('good/noindex.html') });
      // identical title and description on two noindex pages is allowed
      expect(checkTitleDescription(site).filter(problem => problem.startsWith('duplicate'))).toEqual([]);
    });
  });
});
