/**
 * The rent calculator's logic (release 2, P9): the form's validation and each person's share of
 * the rent. Pure functions with no DOM, so Vitest covers them and the page's script can load them
 * on their own, after the page (`rent-deferred.ts`). The form's state is in `rent-state.ts`, and
 * re-exported here.
 *
 * Two ways to share the rent between 2 and 10 people:
 * - By room size. A share of the rent (40% unless the group says otherwise) pays for the shared
 *   rooms and is split equally. The rest goes by the size of each bedroom.
 * - By income. Each person's share is their income over everyone's. Shared bills, if any, follow the
 *   same shares.
 *
 * Each person gets the exact share (a percentage), a whole-percentage share from the largest
 * remainder method (so the whole shares total exactly 100, which is what Side Badger's Percentage
 * split needs) and the amount, which is the whole percentage applied to the rent in minor units
 * with `apportion` (`lib/minor-units.ts`): what the app will charge once those percentages are
 * typed in. The area's unit is a label only: the shares do not depend on it.
 */
import { MAX_EXPENSE_AMOUNT, apportion, isWholeMinor, minorExponent, toMinor } from '../../lib/minor-units';
import { decimalPlaces, nameKey, parseNumber } from './form-input';
import { valueOf, type Mode, type RentState } from './rent-state';

// The form's state and limits, which the page script needs at load (`rent-state.ts`)
export {
  DEFAULT_SHARED,
  MAX_NAME_LENGTH,
  MAX_NUMBER_LENGTH,
  MAX_RENT_PEOPLE,
  MIN_PEOPLE,
  MODES,
  UNITS,
  freshState,
  newPerson,
  valueOf,
  type Mode,
  type PersonState,
  type RentState,
  type Unit,
} from './rent-state';

/** The largest bedroom area and income a field takes: far past anything real, but finite */
export const MAX_AREA = 100_000;
export const MAX_INCOME = 99_999_999;

export type RentProblemCode =
  | 'nameMissing'
  | 'nameDuplicate'
  | 'amountMissing'
  | 'amountInvalid'
  | 'amountPositive'
  | 'amountMax'
  | 'amountDecimals'
  | 'sharedRange'
  | 'valueInvalid'
  | 'valueMax'
  | 'unexpected';

/** The field a problem belongs to, so the page can show it beside that field */
export type RentTarget =
  | { kind: 'rent' | 'bills' | 'shared' }
  | { kind: 'name'; person: number }
  | { kind: 'value'; person: number };

export interface RentProblem {
  code: RentProblemCode;
  target: RentTarget;
  /** The person's name (nameDuplicate) */
  name?: string;
  /** Decimal places the currency takes (amountDecimals) */
  places?: number;
  /** The most a figure can be (valueMax) */
  max?: number;
}

export interface PersonShare {
  person: number;
  /** The exact share, as a percentage (38.5964…) */
  exact: number;
  /** The whole-percentage share: the largest remainder method, totalling 100 across everyone */
  whole: number;
  /** The rent, in minor units: the whole percentage of it */
  rentMinor: number;
  /** The bills, in minor units (0 when there are none) */
  billsMinor: number;
}

export interface RentResult {
  mode: Mode;
  currency: string;
  rentMinor: number;
  billsMinor: number;
  /** In the order of `people` */
  people: PersonShare[];
}

export interface RentOutcome {
  problems: RentProblem[];
  /** Present only when there are no problems */
  result?: RentResult;
}

/** The biggest figure a person's field takes, in the current mode */
export const maxValue = (mode: Mode): number => (mode === 'room' ? MAX_AREA : MAX_INCOME);

// ---------------------------------------------------------------------------
// Whole percentages
// ---------------------------------------------------------------------------

/** Remainders closer than this are the same remainder (float noise, not a difference) */
const PRECISION = 1e9;

/**
 * Share `total` units (100 for whole percentages) in proportion to `weights`, by the largest
 * remainder method: everyone gets the whole part of their share, then the units left over go to
 * the largest remainders. The parts always add up to `total`. Remainders that are equal, to nine
 * decimal places, go to the earlier person, so `1, 7, 4` and `7, 1, 4` are settled by who is first.
 */
export function largestRemainder(weights: readonly number[], total = 100): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!Number.isInteger(total) || total < 0 || weights.length === 0 || !(sum > 0) || weights.some(w => !(w >= 0))) {
    throw new Error('largestRemainder needs a whole, non-negative total and non-negative weights with a positive sum');
  }
  const raw = weights.map(w => (total * w) / sum);
  const parts = raw.map(r => Math.floor(r + 1 / PRECISION));
  const left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, index) => ({ index, remainder: Math.round((r - parts[index]) * PRECISION) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < left; i++) parts[order[i].index]++;
  return parts;
}

/**
 * Each person's exact share of the rent, as percentages that add up to 100. Only meaningful when
 * `checkState` finds nothing.
 */
export function exactShares(state: RentState): number[] {
  const figures = state.people.map(person => parseNumber(valueOf(state, person)) as number);
  const total = figures.reduce((a, b) => a + b, 0);
  if (state.mode === 'income') return figures.map(figure => (100 * figure) / total);
  // The shared rooms' part is split equally; the rest goes by bedroom size
  const shared = parseNumber(state.shared) as number;
  return figures.map(figure => shared / figures.length + ((100 - shared) * figure) / total);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Everything wrong with the form, field by field. Empty means the figures can be computed. */
export function checkState(state: RentState): RentProblem[] {
  const problems: RentProblem[] = [];
  const { currency, people, mode } = state;
  const places = minorExponent(currency);

  /** An amount of money: `optional` lets a blank field through (the bills) */
  const checkAmount = (raw: string, target: RentTarget, optional: boolean): void => {
    if (raw.trim() === '') {
      if (!optional) problems.push({ code: 'amountMissing', target });
      return;
    }
    const amount = parseNumber(raw);
    if (amount === undefined) problems.push({ code: 'amountInvalid', target });
    else if (!optional && !(amount > 0)) problems.push({ code: 'amountPositive', target });
    else if (amount > MAX_EXPENSE_AMOUNT) problems.push({ code: 'amountMax', target });
    else if (decimalPlaces(raw) > places || !isWholeMinor(amount, currency)) {
      problems.push({ code: 'amountDecimals', target, places });
    } else if (!optional && toMinor(amount, currency) === 0) problems.push({ code: 'amountPositive', target });
  };

  checkAmount(state.rent, { kind: 'rent' }, false);
  if (mode === 'income') checkAmount(state.bills, { kind: 'bills' }, true);
  if (mode === 'room') {
    const shared = parseNumber(state.shared);
    if (shared === undefined || shared > 100) problems.push({ code: 'sharedRange', target: { kind: 'shared' } });
  }

  const seen = new Set<string>();
  people.forEach((person, index) => {
    const name: RentTarget = { kind: 'name', person: index };
    if (person.name.trim() === '') problems.push({ code: 'nameMissing', target: name });
    else if (seen.has(nameKey(person.name))) problems.push({ code: 'nameDuplicate', target: name, name: person.name.trim() });
    seen.add(nameKey(person.name));

    const target: RentTarget = { kind: 'value', person: index };
    const figure = parseNumber(valueOf(state, person));
    if (figure === undefined || !(figure > 0)) problems.push({ code: 'valueInvalid', target });
    else if (figure > maxValue(mode)) problems.push({ code: 'valueMax', target, max: maxValue(mode) });
  });
  return problems;
}

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------

/**
 * Validate the form and, if it is sound, work out everyone's shares. Never throws: a problem
 * `checkState` missed comes back as an `unexpected` problem rather than an exception.
 */
export function calculate(state: RentState): RentOutcome {
  const problems = checkState(state);
  if (problems.length > 0) return { problems };
  try {
    const rentMinor = toMinor(parseNumber(state.rent) as number, state.currency);
    const billsMinor =
      state.mode === 'income' && state.bills.trim() !== '' ? toMinor(parseNumber(state.bills) as number, state.currency) : 0;
    const exact = exactShares(state);
    const whole = largestRemainder(exact, 100);
    const rent = apportion(rentMinor, whole);
    const bills = apportion(billsMinor, whole);
    return {
      problems,
      result: {
        mode: state.mode,
        currency: state.currency,
        rentMinor,
        billsMinor,
        people: state.people.map((_person, person) => ({
          person,
          exact: exact[person],
          whole: whole[person],
          rentMinor: rent[person],
          billsMinor: bills[person],
        })),
      },
    };
  } catch {
    return { problems: [{ code: 'unexpected', target: { kind: 'rent' } }] };
  }
}
