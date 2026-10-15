/**
 * Money formatting for the worked examples (restructure 3.4): minor units from `computeExample`
 * to a localized currency string with `Intl.NumberFormat`. Shared by `WorkedExample.astro` and
 * the layout tests (which cannot import the i18n index, so this module takes the Intl code), so the page and the expected text cannot disagree about formatting.
 */
import { fromMinor } from '../../lib/settle';

export interface Money {
  /** Integer minor units of `currency` */
  minor(minor: number, currency: string, options?: { signed?: boolean }): string;
  /** Major units, such as an expense amount or an illustrative rate */
  major(amount: number, currency: string): string;
}

export function moneyFormatter(intl: string): Money {
  const cache = new Map<string, Intl.NumberFormat>();
  const format = (currency: string, signed: boolean, fractionDigits?: number) => {
    const key = `${currency}/${signed}/${fractionDigits ?? ''}`;
    let formatter = cache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(intl, {
        style: 'currency',
        currency,
        // Western digits in every locale, matching the translated prose
        numberingSystem: 'latn',
        ...(signed ? { signDisplay: 'exceptZero' as const } : {}),
        ...(fractionDigits === undefined ? {} : { minimumFractionDigits: fractionDigits }),
      });
      cache.set(key, formatter);
    }
    return formatter;
  };
  return {
    minor: (minor, currency, { signed = false } = {}) =>
      format(currency, signed).format(fromMinor(minor, currency)),
    // Rates may need more places than the currency's usual ones (0.0067 for yen to pounds)
    major: (amount, currency) => {
      const usual = format(currency, false).resolvedOptions().maximumFractionDigits as number;
      const places = String(amount).split('.')[1]?.length ?? 0;
      return format(currency, false, Math.max(usual, places)).format(amount);
    },
  };
}
