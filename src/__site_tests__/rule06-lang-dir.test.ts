import { describe, expect, it } from 'vitest';
import { checkLangDir } from './rules/r06-lang-dir';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 6: html lang and dir come from the locale metadata', () => {
  it('dist: every page', () => {
    expect(checkLangDir(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes English', () => {
      expect(checkLangDir(one('good/home.html'))).toEqual([]);
    });

    it('fails a wrong lang', () => {
      expect(mentions(checkLangDir(one('r06/wrong-lang.html')), 'html lang is "fr"', 'expected "en"')).toBe(true);
    });

    it('fails a missing lang', () => {
      expect(mentions(checkLangDir(one('r06/no-lang.html')), 'html lang')).toBe(true);
    });

    it('fails a missing dir', () => {
      expect(mentions(checkLangDir(one('r06/no-dir.html')), 'html dir')).toBe(true);
    });

    it('fails Arabic with dir ltr and passes it with rtl', () => {
      expect(mentions(checkLangDir(one('r06/ar-ltr.html', 'ar/index.html')), 'dir is "ltr"', 'expected "rtl"')).toBe(true);
      expect(checkLangDir(one('r06/ar-rtl.html', 'ar/index.html'))).toEqual([]);
    });

    it('requires htmlLang fil for the ph prefix (D35)', () => {
      expect(checkLangDir(one('r06/ph-fil.html', 'ph/index.html'))).toEqual([]);
      expect(mentions(checkLangDir(one('r06/ph-code.html', 'ph/index.html')), 'expected "fil"')).toBe(true);
    });
  });
});
