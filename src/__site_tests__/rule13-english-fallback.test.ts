import { describe, expect, it } from 'vitest';
import { approvedFromLocks, checkEnglishFallback } from './rules/r13-english-fallback';
import { dist } from './lib/site';
import { fx, mentions, sites } from './lib/fixtures';

const english = fx('r13/en-home.html');
const withFrench = (name: string) => sites({ 'index.html': english, 'fr/index.html': fx(name) });
const SENTENCE = 'Split every bill fairly with your friends.';

describe('rule 13: no English text left on translated pages', () => {
  it('dist: every non-English page, with the locale lock files as the approved list', () => {
    expect(checkEnglishFallback(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a translated page, short identical text and [lang="en"] content', () => {
      expect(checkEnglishFallback(withFrench('r13/fr-home-translated.html'), () => new Set())).toEqual([]);
    });

    it('fails an English paragraph of 25 characters or more', () => {
      const problems = checkEnglishFallback(withFrench('r13/fr-home-english-paragraph.html'), () => new Set());
      expect(mentions(problems, '/fr/', 'untranslated', SENTENCE)).toBe(true);
    });

    it('passes the same paragraph when the locale approves it', () => {
      const approved = (locale: string) => new Set(locale === 'fr' ? [SENTENCE] : []);
      expect(checkEnglishFallback(withFrench('r13/fr-home-english-paragraph.html'), approved)).toEqual([]);
    });

    it('does not take the approval from another locale', () => {
      const approved = (locale: string) => new Set(locale === 'de' ? [SENTENCE] : []);
      expect(checkEnglishFallback(withFrench('r13/fr-home-english-paragraph.html'), approved)).not.toEqual([]);
    });

    it('exempts content inside [lang="en"]', () => {
      expect(checkEnglishFallback(withFrench('r13/fr-home-english-legal.html'), () => new Set())).toEqual([]);
    });

    it('allows identical text shorter than 25 characters', () => {
      expect(checkEnglishFallback(withFrench('r13/fr-home-short-identical.html'), () => new Set())).toEqual([]);
    });

    it('fails when the English page to compare with is missing', () => {
      const site = sites({ 'fr/index.html': fx('r13/fr-home-translated.html') });
      expect(mentions(checkEnglishFallback(site, () => new Set()), 'English page', 'not in the build')).toBe(true);
    });

    it('never approves anything for a locale without a lock file', () => {
      expect(approvedFromLocks('zz-none').size).toBe(0);
    });
  });
});
