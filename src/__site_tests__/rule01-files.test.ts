import { afterEach, describe, expect, it } from 'vitest';
import { builtPairs, checkFiles, expectedHtmlFiles, fileFor } from './rules/r01-files';
import { dist } from './lib/site';
import { mentions, sites } from './lib/fixtures';

const page = '<!doctype html><title>x</title>';
const pairs = [
  { pageId: 'home', locale: 'en' as const },
  { pageId: 'home', locale: 'fr' as const },
  { pageId: 'pricing', locale: 'en' as const },
];
const expected = expectedHtmlFiles(pairs);

describe('rule 1: every HTML file maps to a registry page and locale', () => {
  it('dist: files and registry agree', () => {
    expect(checkFiles(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    const good = { 'index.html': page, 'fr/index.html': page, 'pricing/index.html': page, '404.html': page };

    it('derives file names from the registry', () => {
      expect(fileFor('home', 'en')).toBe('index.html');
      expect(fileFor('pricing', 'fr')).toBe('fr/pricing/index.html');
      expect([...expected].sort()).toEqual(['fr/index.html', 'index.html', 'pricing/index.html']);
    });

    it('passes when files match the registry and 404.html is present', () => {
      expect(checkFiles(sites(good), expected)).toEqual([]);
    });

    it('fails on an HTML file that maps to no page', () => {
      const problems = checkFiles(sites({ ...good, 'secret/index.html': page }), expected);
      expect(mentions(problems, 'secret/index.html', 'maps to no built registry page')).toBe(true);
    });

    it('fails on a page and locale that is not built', () => {
      const problems = checkFiles(sites({ ...good, 'fr/pricing/index.html': page }), expected);
      expect(mentions(problems, 'fr/pricing/index.html')).toBe(true);
    });

    it('fails on a missing file', () => {
      const { 'fr/index.html': _omit, ...rest } = good;
      const problems = checkFiles(sites(rest), expected);
      expect(mentions(problems, 'fr/index.html', 'not built')).toBe(true);
    });

    it('fails on an alias directory', () => {
      const problems = checkFiles(sites({ ...good, 'en-gb/index.html': page, 'en-gb/pricing/index.html': page }), expected);
      expect(mentions(problems, 'en-gb/', 'alias directory')).toBe(true);
    });

    it('fails on a flat .html file for a page', () => {
      const problems = checkFiles(sites({ ...good, 'pricing.html': page }), expected);
      expect(mentions(problems, 'pricing.html')).toBe(true);
    });

    it('skips the pairs English-first mode excludes (not required, and not allowed)', () => {
      const englishFirst = expectedHtmlFiles([pairs[0], pairs[2]]);
      const withoutFrench = { 'index.html': page, 'pricing/index.html': page };
      expect(checkFiles(sites(withoutFrench), englishFirst)).toEqual([]);
      // a French file the mode excluded would be an English fallback at a localized URL
      const problems = checkFiles(sites({ ...withoutFrench, 'fr/index.html': page }), englishFirst);
      expect(mentions(problems, 'fr/index.html')).toBe(true);
    });

    it('does not expect pseudo-locale pages unless the registry builds them', () => {
      expect(builtPairs().some(pair => pair.locale.startsWith('xx-'))).toBe(process.env.PREVIEW_PSEUDO === '1');
      const problems = checkFiles(sites({ ...good, 'xx-long/index.html': page }), expected);
      expect(mentions(problems, 'xx-long/index.html')).toBe(true);
    });
  });

  describe('English-first mode', () => {
    const saved = process.env.I18N_MODE;
    afterEach(() => {
      if (saved === undefined) delete process.env.I18N_MODE;
      else process.env.I18N_MODE = saved;
    });

    it('expects a subset of what strict mode expects', () => {
      process.env.I18N_MODE = 'strict';
      const strict = expectedHtmlFiles();
      process.env.I18N_MODE = 'english-first';
      const englishFirst = expectedHtmlFiles();
      expect(englishFirst.has('index.html')).toBe(true);
      for (const file of englishFirst) expect(strict.has(file)).toBe(true);
    });
  });
});
