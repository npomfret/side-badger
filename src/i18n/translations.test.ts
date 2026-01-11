import { describe, it, expect } from 'vitest';
import en from './en';
import { translations, locales } from './index';

const masterKeys = Object.keys(en).sort();

describe('translations', () => {
  describe('all locales have all keys from English master', () => {
    locales.forEach((locale) => {
      it(`${locale} has all ${masterKeys.length} translation keys`, () => {
        const localeKeys = Object.keys(translations[locale]).sort();
        const missingKeys = masterKeys.filter((key) => !localeKeys.includes(key));

        expect(missingKeys, `Missing keys in ${locale}: ${missingKeys.join(', ')}`).toEqual([]);
      });
    });
  });

  describe('no locales have extra keys not in English master', () => {
    locales.forEach((locale) => {
      it(`${locale} has no extra keys`, () => {
        const localeKeys = Object.keys(translations[locale]);
        const extraKeys = localeKeys.filter((key) => !masterKeys.includes(key));

        expect(extraKeys, `Extra keys in ${locale}: ${extraKeys.join(', ')}`).toEqual([]);
      });
    });
  });

  it('English is the master with all keys defined', () => {
    expect(masterKeys.length).toBeGreaterThan(0);
  });
});
