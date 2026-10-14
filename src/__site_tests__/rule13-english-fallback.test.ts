import { describe, expect, it } from 'vitest';
import { approvedFromLock, approvedFromLocks, checkEnglishFallback, renderedTexts } from './rules/r13-english-fallback';
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

  describe('approved list from the lock files (identicalApproved, 3.6)', () => {
    it('splits an English value with inline HTML into the text nodes it renders as', () => {
      expect(renderedTexts('Totally free. No tracking. No ads.<br />Just badgers splitting bills.')).toEqual([
        'Totally free. No tracking. No ads.',
        'Just badgers splitting bills.',
      ]);
      expect(renderedTexts('Fish &amp; chips')).toEqual(['Fish & chips']);
    });

    it('resolves each approved key to its English text', () => {
      const lock = { keys: {}, identicalApproved: ['footer.tagline', 'a11y.breadcrumb'], pages: {} };
      expect([...approvedFromLock(lock, 'xx.json')].sort()).toEqual([
        'Breadcrumb',
        'Free. No ads. No daily limits.',
      ]);
    });

    it('approves nothing that is not listed, and ignores the hashes in keys', () => {
      const lock = { keys: { 'a11y.breadcrumb': '00000000' }, identicalApproved: [], pages: {} };
      expect(approvedFromLock(lock, 'xx.json').size).toBe(0);
    });

    it('rejects a key that en.ts does not have, and a malformed list', () => {
      const stale = { keys: {}, identicalApproved: ['no.such.key'], pages: {} };
      expect(() => approvedFromLock(stale, 'xx.json')).toThrow(/no\.such\.key/);
      const malformed = { keys: {}, identicalApproved: { 'a11y.breadcrumb': true }, pages: {} } as never;
      expect(() => approvedFromLock(malformed, 'xx.json')).toThrow(/must be an array/);
    });

    describe('keys removed from en.ts (D38)', () => {
      const lock = { keys: {}, identicalApproved: ['a11y.breadcrumb', 'policy.gone'], pages: {} };
      const run = (mode: 'strict' | 'english-first', removed: string[]) =>
        approvedFromLock(lock, 'xx.json', { mode, removed });

      it('skips an approved key that is listed under removed in english-first mode', () => {
        expect([...run('english-first', ['policy.gone'])]).toEqual(['Breadcrumb']);
      });

      it('throws in strict mode even when the key is listed under removed', () => {
        expect(() => run('strict', ['policy.gone'])).toThrow(/policy\.gone/);
      });

      it('throws in english-first mode when the key is not listed under removed', () => {
        expect(() => run('english-first', [])).toThrow(/policy\.gone/);
      });
    });

    it('reads the real pcm lock, which approves the brand name', () => {
      const approved = approvedFromLocks('pcm');
      expect(approved.has('Side Badger')).toBe(true);
    });
  });
});
