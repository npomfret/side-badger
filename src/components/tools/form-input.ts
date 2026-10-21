/**
 * What both calculators' forms need to read a field and name a person (release 2, R3): the limits
 * on a person's name and on a typed number, reading a number as typed, telling names apart and
 * picking the next default name. Kept apart from the engines so a page that needs only these does
 * not ship the other calculator's logic.
 */

export const MIN_PEOPLE = 2;
export const MAX_NAME_LENGTH = 40;
/** Longest amount, percentage or share a field takes, in characters */
export const MAX_NUMBER_LENGTH = 14;

// A plain number: digits with one optional "." or "," as the decimal mark
const NUMBER = /^(\d+([.,]\d*)?|[.,]\d+)$/;

/** The number in a field, or undefined if it is not one. No signs, exponents or grouping. */
export function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!NUMBER.test(trimmed)) return undefined;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

/** Names are the same person when they differ only by case or by spaces round them */
export const nameKey = (name: string) => name.trim().toLocaleLowerCase();

/** The first name in `pool` that no one has, else `fallback(n)` for the first free number */
export function pickName(pool: readonly string[], taken: readonly string[], fallback: (number: number) => string): string {
  const used = new Set(taken.map(nameKey));
  const free = pool.find(name => !used.has(nameKey(name)));
  if (free) return free;
  let number = taken.length + 1;
  while (used.has(nameKey(fallback(number)))) number++;
  return fallback(number);
}

/** A comma-separated list from a translation: trimmed, empty and repeated entries dropped */
export function splitList(list: string): string[] {
  return [...new Set(list.split(/[,،、]/).map(item => item.trim()).filter(Boolean))];
}
