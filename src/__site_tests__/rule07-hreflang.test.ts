import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkHreflang } from './rules/r07-hreflang';
import { dist, overrideLockPages } from './lib/site';
import { fx, mentions, sites } from './lib/fixtures';

const cluster = (frFixture = 'good/fr-home.html', homeFixture = 'good/home.html') =>
  sites({ 'index.html': fx(homeFixture), 'fr/index.html': fx(frFixture) });

describe('rule 7: hreflang clusters are symmetric, complete and valid', () => {
  it('dist: every cluster', () => {
    expect(checkHreflang(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    // The fixtures' fr and ph pages are indexable; don't depend on the repo's current review statuses
    beforeEach(() => {
      overrideLockPages('fr', { home: 'reviewed', pricing: 'reviewed' });
      overrideLockPages('ph', { home: 'reviewed', pricing: 'reviewed' });
    });
    afterEach(() => {
      overrideLockPages('fr', undefined);
      overrideLockPages('ph', undefined);
    });

    it('passes a symmetric en and fr cluster', () => {
      expect(checkHreflang(cluster())).toEqual([]);
    });

    it('fails a member without x-default', () => {
      expect(mentions(checkHreflang(cluster('r07/fr-no-x-default.html')), '/fr/', 'x-default')).toBe(true);
    });

    it('fails a member that does not list itself', () => {
      expect(mentions(checkHreflang(cluster('r07/fr-no-self.html')), '/fr/', 'does not list the page itself')).toBe(true);
    });

    it('fails an asymmetric cluster (a member missing another member)', () => {
      const problems = checkHreflang(cluster('r07/fr-no-en.html'));
      expect(mentions(problems, '/fr/', 'cluster is missing')).toBe(true);
    });

    it('fails an alternate pointing at a page that does not exist', () => {
      const problems = checkHreflang(cluster('good/fr-home.html', 'r07/home-links-missing-de.html'));
      expect(mentions(problems, 'https://sidebadger.me/de/', 'does not exist')).toBe(true);
    });

    it('fails an alternate pointing at a page D8 makes non-indexable', () => {
      overrideLockPages('fr', { home: 'machine', pricing: 'legacy' });
      try {
        const site = sites({ 'index.html': fx('good/home.html'), 'fr/index.html': fx('good/noindex.html') });
        expect(mentions(checkHreflang(site), 'https://sidebadger.me/fr/', 'not indexable')).toBe(true);
      } finally {
        overrideLockPages('fr', undefined);
      }
    });

    it('fails a tag that differs from the configured hreflang', () => {
      expect(mentions(checkHreflang(cluster('good/fr-home.html', 'r07/home-wrong-tag.html')), '"fr-FR"', 'configured tag is "fr"')).toBe(true);
    });

    it('fails a duplicated tag', () => {
      expect(mentions(checkHreflang(cluster('good/fr-home.html', 'r07/home-duplicate-tag.html')), 'duplicate hreflang "fr"')).toBe(true);
    });

    it('requires tl, not the ph prefix, for Tagalog (D35)', () => {
      const bad = sites({ 'index.html': fx('r07/home-with-tl.html'), 'ph/index.html': fx('r07/ph-uses-prefix.html') });
      expect(mentions(checkHreflang(bad), '"ph"', 'configured tag is "tl"')).toBe(true);
      const good = sites({ 'index.html': fx('r07/home-with-tl.html'), 'ph/index.html': fx('r07/ph-uses-tl.html') });
      expect(checkHreflang(good)).toEqual([]);
    });
  });
});
