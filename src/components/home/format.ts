/**
 * Money and geometry helpers for the homepage scenes.
 *
 * Amounts are never typed into strings: they come from `example-group.ts` in minor units and are
 * formatted here for the visitor's locale when the site is built (`tf()` fills the sentences, from
 * `@/i18n`). Wrap the result in `<bdi>` (or use `props/Money.astro`) so a right-to-left sentence
 * keeps the sign and the digits together.
 */
import { localeConfig, type Locale } from '@/i18n';

export interface MoneyOptions {
  /** Show a sign for non-zero amounts: +€300, −€140. Uses Intl's `signDisplay: 'exceptZero'`. */
  signed?: boolean;
  /** No decimals, for the tangle (every figure there is a whole euro). Default false. */
  whole?: boolean;
}

/** The BCP 47 code to hand to `Intl` for a locale (`ar-EG` gets Arabic-Indic digits). */
export function intlCodeFor(locale: Locale): string {
  return localeConfig[locale].intlCode;
}

/**
 * Format an amount held in minor units (cents; yen for JPY, which has none).
 *
 *   formatMoney(30000, 'EUR', 'en')                       "€300.00"
 *   formatMoney(30000, 'EUR', 'en', { whole: true })      "€300"
 *   formatMoney(-14000, 'EUR', 'en', { signed: true, whole: true })  "-€140"
 *   formatMoney(96000, 'JPY', 'en')                       "¥96,000"
 */
export function formatMoney(
  minor: number,
  currency: string,
  locale: Locale,
  { signed = false, whole = false }: MoneyOptions = {}
): string {
  const code = intlCodeFor(locale);
  const digits = new Intl.NumberFormat(code, { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits;
  const fractionDigits = whole ? 0 : digits;
  const value = minor / 10 ** digits;
  return new Intl.NumberFormat(code, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value);
}

/** A plain number in the locale's digits (step numbers, counts). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlCodeFor(locale)).format(value);
}

/**
 * The exchange-rate figure, e.g. `160` or `1.10`, in the locale's digits. The sentence around it
 * is a translated string; this is only the number.
 */
export function formatRate(rate: number, locale: Locale): string {
  const fractionDigits = Number.isInteger(rate) ? 0 : 2;
  return new Intl.NumberFormat(intlCodeFor(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rate);
}

/** Mirror an x coordinate across a viewBox of the given width. */
export function mirrorX(x: number, width: number): number {
  return width - x;
}

/** Mirror an angle in degrees across the vertical axis (an arrowhead's rotation). */
export function mirrorAngle(degrees: number): number {
  return 180 - degrees;
}

const COMMAND = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Mirror SVG path data across a viewBox of the given width: absolute x values become
 * `width - x`, relative x values change sign, horizontal-only commands follow, and arc sweep
 * flags flip. Used when each locale is built, so text and markers are never flipped by CSS.
 */
export function mirrorPathD(d: string, width: number): string {
  let out = '';
  for (const [, cmd, args] of d.matchAll(COMMAND)) {
    const nums = (args.match(NUMBER) ?? []).map(Number);
    const lower = cmd.toLowerCase();
    const relative = cmd === lower;
    const flipX = (x: number) => round(relative ? -x : width - x);

    let mapped: number[];
    switch (lower) {
      case 'h':
        mapped = nums.map(flipX);
        break;
      case 'v':
      case 'z':
        mapped = nums;
        break;
      case 'a':
        mapped = [];
        for (let i = 0; i + 7 <= nums.length; i += 7) {
          const [rx, ry, rot, large, sweep, x, y] = nums.slice(i, i + 7);
          mapped.push(rx, ry, round(-rot), large, sweep ? 0 : 1, flipX(x), y);
        }
        break;
      default:
        // m l c s q t: coordinate pairs
        mapped = nums.map((n, i) => (i % 2 === 0 ? flipX(n) : n));
    }
    out += cmd + mapped.join(' ');
  }
  return out;
}
