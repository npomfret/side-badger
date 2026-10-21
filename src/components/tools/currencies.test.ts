import { describe, expect, it } from 'vitest';
import { localeConfig, locales } from '@/i18n';
import { minorExponent } from '@/lib/settle';
import { CURRENCIES, currencyChoices, defaultCurrency, likelyCurrency } from './currencies';

describe('the calculator\'s currencies', () => {
  it('lists GBP, EUR and USD first, once each, all real currencies', () => {
    expect(CURRENCIES.slice(0, 3)).toEqual(['GBP', 'EUR', 'USD']);
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length);
    for (const code of CURRENCIES) expect(() => minorExponent(code), code).not.toThrow();
  });

  it('knows a likely currency for every locale, and offers it', () => {
    for (const locale of locales) {
      const likely = likelyCurrency(locale, localeConfig[locale].intlCode);
      expect(likely, locale).toBeDefined();
      expect(() => minorExponent(likely!), `${locale} ${likely}`).not.toThrow();
      const choices = currencyChoices(likely);
      expect(choices, locale).toContain(likely);
      expect(choices.slice(0, 3), locale).toEqual(['GBP', 'EUR', 'USD']);
      expect(new Set(choices).size, locale).toBe(choices.length);
    }
  });

  it('defaults the English page to pounds and the others to their region\'s money', () => {
    expect(likelyCurrency('en', 'en-US')).toBe('GBP');
    expect(likelyCurrency('fr', 'fr-FR')).toBe('EUR');
    expect(likelyCurrency('ja', 'ja-JP')).toBe('JPY');
    expect(likelyCurrency('cs', 'cs-CZ')).toBe('CZK');
    expect(likelyCurrency('ar', 'ar-EG')).toBe('EGP');
    expect(likelyCurrency('xx', 'xx-ZZ')).toBeUndefined();
  });

  it('opens in the locale\'s money, or pounds when the region is not listed', () => {
    expect(defaultCurrency('en', 'en-US')).toBe('GBP');
    expect(defaultCurrency('de', 'de-DE')).toBe('EUR');
    expect(defaultCurrency('ja', 'ja-JP')).toBe('JPY');
    expect(defaultCurrency('xx', 'xx-ZZ')).toBe('GBP');
  });

  it('adds a missing currency after the first three and leaves the list alone otherwise', () => {
    expect(currencyChoices('EGP').slice(0, 4)).toEqual(['GBP', 'EUR', 'USD', 'EGP']);
    expect(currencyChoices('JPY')).toEqual([...CURRENCIES]);
    expect(currencyChoices(undefined)).toEqual([...CURRENCIES]);
  });
});
