import { describe, it, expect } from 'vitest';
import en from '../i18n/en';
import uk from '../i18n/uk';
import es from '../i18n/es';
import ja from '../i18n/ja';
import ar from '../i18n/ar';
import de from '../i18n/de';
import ko from '../i18n/ko';
import sv from '../i18n/sv';
import itIT from '../i18n/it';
import lv from '../i18n/lv';
import no from '../i18n/no';
import ph from '../i18n/ph';
import nlBE from '../i18n/nl-BE';
import ga from '../i18n/ga';
import cy from '../i18n/cy';

const translations: Record<string, Record<string, string>> = {
  uk,
  es,
  ja,
  ar,
  de,
  ko,
  sv,
  it: itIT,
  lv,
  no,
  ph,
  'nl-BE': nlBE,
  ga,
  cy,
};

const englishKeys = Object.keys(en);

describe('translations', () => {
  describe('completeness', () => {
    for (const [locale, translation] of Object.entries(translations)) {
      it(`${locale} has all English keys`, () => {
        const translationKeys = Object.keys(translation);
        const missingKeys = englishKeys.filter(key => !translationKeys.includes(key));

        expect(missingKeys, `${locale} is missing keys: ${missingKeys.join(', ')}`).toEqual([]);
      });
    }
  });

  describe('no extraneous keys', () => {
    for (const [locale, translation] of Object.entries(translations)) {
      it(`${locale} has no extraneous keys`, () => {
        const translationKeys = Object.keys(translation);
        const extraneousKeys = translationKeys.filter(key => !englishKeys.includes(key));

        expect(extraneousKeys, `${locale} has extraneous keys: ${extraneousKeys.join(', ')}`).toEqual([]);
      });
    }
  });
});
