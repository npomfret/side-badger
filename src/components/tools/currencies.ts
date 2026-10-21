/**
 * The currencies the split-bill calculator offers (release 2, R3): a short list, with the three
 * the site's visitors use most first, then the likely currency of the page's locale. One currency
 * applies to a whole calculation. Server-side only: the page renders the list as `<select>`
 * options and the client reads the allowed codes from them.
 */

/** GBP, EUR and USD first, then the other common currencies in alphabetical order of their code. */
export const CURRENCIES = [
  'GBP',
  'EUR',
  'USD',
  'AED',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'HKD',
  'HUF',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'PLN',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'ZAR',
] as const;

/**
 * The currency of the region in each locale's `intlCode` (`fr-FR` is FR). Only the regions the
 * site's locales use are listed; a region with no entry adds nothing to the list.
 */
const REGION_CURRENCY: Readonly<Record<string, string>> = {
  BD: 'BDT',
  BE: 'EUR',
  CN: 'CNY',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  EG: 'EGP',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GR: 'EUR',
  HR: 'EUR',
  HU: 'HUF',
  ID: 'IDR',
  IE: 'EUR',
  IN: 'INR',
  IR: 'IRR',
  IS: 'ISK',
  IT: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  LV: 'EUR',
  NG: 'NGN',
  NO: 'NOK',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PT: 'EUR',
  RO: 'RON',
  RS: 'RSD',
  SE: 'SEK',
  SI: 'EUR',
  TR: 'TRY',
  TZ: 'TZS',
  UA: 'UAH',
  US: 'USD',
};

/**
 * The locale's likely currency: its region's, except on the English page, whose prices and
 * examples are in pounds. `undefined` when the region is not listed.
 */
export function likelyCurrency(locale: string, intlCode: string): string | undefined {
  if (locale === 'en') return 'GBP';
  const region = intlCode.split('-').pop()?.toUpperCase() ?? '';
  return REGION_CURRENCY[region];
}

/** The select's currencies: the short list, with the locale's likely currency added if it is not in it. */
export function currencyChoices(likely: string | undefined): string[] {
  const list: string[] = [...CURRENCIES];
  return likely && !list.includes(likely) ? [...list.slice(0, 3), likely, ...list.slice(3)] : list;
}
