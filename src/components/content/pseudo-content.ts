/**
 * Pseudo-locale content (restructure D38): under PREVIEW_PSEUDO=1 the four pseudo-locales have no
 * YAML of their own. Their entry is the English one run through `pseudoize`, except for the
 * fields that are structure rather than text: ids, shot ids, split methods, currency codes,
 * claim ids, a guide's owner and dates, the help page's support address, and the review block. Link targets inside rich text
 * (`](page:pricing)`) are kept too, so the links still resolve.
 */
import { pseudoize, type PseudoLocale } from '../../i18n/pseudo';

/** Keys whose values are never text. */
const STRUCTURAL_KEYS = new Set([
  'id',
  'shot',
  'payer',
  'method',
  'currency',
  'claims',
  'owner',
  'reviewBy',
  'datePublished',
  'dateModified',
  'asOf',
  'url',
  'source',
  'tableAfter',
  'email',
  'review',
  'translatedFrom',
  'identicalApproved',
]);

const PAGE_LINK_TARGET = /\]\(page:[^)]*\)/g;

/** One text value; page link targets ride through as `{L0}` placeholders, which `pseudoize` keeps. */
function pseudoizeText(text: string, locale: PseudoLocale): string {
  const targets: string[] = [];
  const guarded = text.replace(PAGE_LINK_TARGET, match => {
    targets.push(match);
    return `{L${targets.length - 1}}`;
  });
  return pseudoize(guarded, locale).replace(/\{L(\d+)\}/g, (_m, i: string) => targets[Number(i)]);
}

export function pseudoizeContent<V>(value: V, locale: PseudoLocale, key = ''): V {
  if (typeof value === 'string') return (STRUCTURAL_KEYS.has(key) ? value : pseudoizeText(value, locale)) as V;
  if (Array.isArray(value)) return value.map(item => pseudoizeContent(item, locale, key)) as V;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        STRUCTURAL_KEYS.has(k) ? v : pseudoizeContent(v, locale, k),
      ])
    ) as V;
  }
  return value;
}
