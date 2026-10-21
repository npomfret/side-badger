/**
 * Money in integer minor units (cents, yen, fils, …): a currency's decimal places, conversion
 * between major and minor units, and `apportion`, which splits a total so the parts always add up.
 * Pure functions, no I/O.
 *
 * Split out of `settle.ts`, which re-exports all of it, so a script that needs only these (the rent
 * calculator, the money formatter) does not ship the worked-example code with them. Keep this
 * module free of top-level side effects other than the currency list it reads once.
 */

/** The app's cap on one expense, in its own currency (site plan D19). */
export const MAX_EXPENSE_AMOUNT = 999_999.99;

const FLOAT_TOLERANCE = 1e-6;

function supportedCurrencies(): ReadonlySet<string> | undefined {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };
  return intl.supportedValuesOf ? new Set(intl.supportedValuesOf('currency')) : undefined;
}
const SUPPORTED = supportedCurrencies();

/**
 * Decimal places of a currency. Throws RangeError for a malformed code or one `Intl` does not
 * list (Intl itself formats any well-formed code, such as `XYZ`, with two decimals).
 */
export function minorExponent(currency: string): number {
  if (SUPPORTED && !SUPPORTED.has(currency)) throw new RangeError(`Unknown currency "${currency}"`);
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

function scaled(amount: number, exponent: number): number {
  return Number((amount * 10 ** exponent).toPrecision(12));
}

/** Major units to integer minor units, rounding half away from zero after removing float noise. */
export function toMinor(amount: number, currency: string): number {
  return Math.round(scaled(amount, minorExponent(currency)));
}

/** Whether `amount` is a whole number of minor units (no 1.005 EUR, no 12.5 JPY). */
export function isWholeMinor(amount: number, currency: string): boolean {
  const value = scaled(amount, minorExponent(currency));
  return Math.abs(value - Math.round(value)) < FLOAT_TOLERANCE;
}

/** Integer minor units to major units, for display with `Intl.NumberFormat`. */
export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** minorExponent(currency);
}

/**
 * Split `total` minor units across `weights` (largest remainder method). The parts always sum to
 * `total`; leftover units go to the largest fractional remainders, and ties go to the earlier
 * participant. Equal weights therefore give the extra unit to the first participants.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error('apportion needs a whole, non-negative total');
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || !(sum > 0) || weights.some(w => !(w >= 0))) {
    throw new Error('apportion needs non-negative weights with a positive sum');
  }
  const raw = weights.map(w => (total * w) / sum);
  const parts = raw.map(r => Math.floor(r + 1e-9));
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, index) => ({ index, fraction: r - Math.floor(r + 1e-9) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) parts[order[i].index]++;
  return parts;
}
