/**
 * The split-bill calculator's logic (release 2, R3): the form's state, its validation and the
 * balances and payments. Pure functions with no DOM, so Vitest covers them and the page's script
 * can load them on their own.
 *
 * The sums are `settle.ts`, the same module that computes the worked examples: the form state is
 * mapped to an `ExampleData` and `computeExample` does the arithmetic. Validation applies the rules
 * of `exampleProblems` (an amount above zero and under the cap, whole minor units of the currency,
 * exact amounts that add up, percentages that make 100) but reports each one against the field it
 * belongs to, with the numbers a visitor needs, instead of as one English sentence.
 */
import {
  MAX_EXPENSE_AMOUNT,
  computeExample,
  exampleProblems,
  isWholeMinor,
  minorExponent,
  toMinor,
  type ExampleData,
  type ExampleExpense,
} from '../../lib/settle';
import { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE, nameKey, parseNumber, pickName, splitList } from './form-input';

// Reading a field and naming people are shared with the rent calculator (`form-input.ts`)
export { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE, parseNumber, pickName, splitList };

export const MAX_PEOPLE = 20;
export const MAX_EXPENSES = 100;
export const MAX_LABEL_LENGTH = 60;

export type Method = 'equal' | 'exact' | 'percent';

/** One expense as the form holds it: numbers stay as typed until they are checked. */
export interface ExpenseState {
  label: string;
  /** Index into `people`, or -1 when nobody is chosen (the person who paid was removed) */
  payer: number;
  amount: string;
  method: Method;
  /** Per person: shares in the expense */
  include: boolean[];
  /** Per person: the exact amount or percentage typed (used when `method` is not `equal`) */
  values: string[];
}

export interface CalcState {
  /** ISO 4217 code */
  currency: string;
  people: string[];
  expenses: ExpenseState[];
}

export type ProblemCode =
  | 'nameMissing'
  | 'nameDuplicate'
  | 'payerMissing'
  | 'amountMissing'
  | 'amountInvalid'
  | 'amountPositive'
  | 'amountMax'
  | 'amountDecimals'
  | 'nobody'
  | 'shareInvalid'
  | 'sharePositive'
  | 'shareDecimals'
  | 'exactTotal'
  | 'percentTotal'
  | 'unexpected';

/** The field a problem belongs to, so the page can show it beside that field */
export type Target =
  | { kind: 'person'; person: number }
  | { kind: 'expense'; expense: number; field: 'payer' | 'amount' | 'shares' }
  | { kind: 'share'; expense: number; person: number };

export interface Problem {
  code: ProblemCode;
  target: Target;
  /** The person's name (nameDuplicate, share problems) */
  name?: string;
  /** Decimal places the currency takes (amountDecimals, shareDecimals) */
  places?: number;
  /** exactTotal: what the amounts add up to, in minor units. percentTotal: the percentages' sum. */
  sum?: number;
  /** exactTotal: the expense, in minor units */
  total?: number;
}

export interface Result {
  currency: string;
  /** Per person, in the order of `people`: paid minus owed, in minor units (positive: owed money) */
  balances: { person: number; minor: number }[];
  /** The short list of payments, in minor units */
  payments: { from: number; to: number; minor: number }[];
  totalMinor: number;
}

export interface Outcome {
  problems: Problem[];
  /** Present only when there are no problems and at least one expense */
  result?: Result;
}

/** A stable id for each person. Ids are never shown. */
const personId = (index: number) => `p${index}`;

/** Everything wrong with the form, field by field. Empty means the figures can be computed. */
export function checkState(state: CalcState): Problem[] {
  const problems: Problem[] = [];
  const { currency, people, expenses } = state;
  const places = minorExponent(currency);

  const seen = new Set<string>();
  people.forEach((name, person) => {
    const target: Target = { kind: 'person', person };
    if (name.trim() === '') problems.push({ code: 'nameMissing', target });
    else if (seen.has(nameKey(name))) problems.push({ code: 'nameDuplicate', target, name: name.trim() });
    seen.add(nameKey(name));
  });

  expenses.forEach((expense, index) => {
    const at = (field: 'payer' | 'amount' | 'shares'): Target => ({ kind: 'expense', expense: index, field });

    if (expense.payer < 0 || expense.payer >= people.length) {
      problems.push({ code: 'payerMissing', target: at('payer') });
    }

    // The amount: one problem at most
    const amount = parseNumber(expense.amount);
    let amountOk = false;
    if (expense.amount.trim() === '') problems.push({ code: 'amountMissing', target: at('amount') });
    else if (amount === undefined) problems.push({ code: 'amountInvalid', target: at('amount') });
    else if (!(amount > 0)) problems.push({ code: 'amountPositive', target: at('amount') });
    else if (amount > MAX_EXPENSE_AMOUNT) problems.push({ code: 'amountMax', target: at('amount') });
    else if (!isWholeMinor(amount, currency)) problems.push({ code: 'amountDecimals', target: at('amount'), places });
    else amountOk = true;

    const chosen = people.map((_name, person) => person).filter(person => expense.include[person]);
    if (chosen.length === 0) {
      problems.push({ code: 'nobody', target: at('shares') });
      return;
    }
    if (expense.method === 'equal') return;

    // Exact amounts and percentages: each chosen person needs a valid figure first
    const shares: number[] = [];
    let sharesOk = true;
    for (const person of chosen) {
      const target: Target = { kind: 'share', expense: index, person };
      const name = people[person].trim() || '';
      const raw = expense.values[person] ?? '';
      const value = parseNumber(raw);
      if (value === undefined) {
        problems.push({ code: 'shareInvalid', target, name });
        sharesOk = false;
      } else if (!(value > 0)) {
        problems.push({ code: 'sharePositive', target, name });
        sharesOk = false;
      } else if (expense.method === 'exact' && !isWholeMinor(value, currency)) {
        problems.push({ code: 'shareDecimals', target, name, places });
        sharesOk = false;
      } else {
        shares.push(value);
      }
    }
    if (!sharesOk) return;

    if (expense.method === 'percent') {
      const sum = shares.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 1e-9) {
        problems.push({ code: 'percentTotal', target: at('shares'), sum: Number(sum.toFixed(6)) });
      }
    } else if (amountOk) {
      const sum = shares.reduce((a, value) => a + toMinor(value, currency), 0);
      const total = toMinor(amount as number, currency);
      if (sum !== total) problems.push({ code: 'exactTotal', target: at('shares'), sum, total });
    }
  });
  return problems;
}

/** The state as a worked example. Only meaningful when `checkState` finds nothing. */
export function toExample(state: CalcState): ExampleData {
  const { currency, people, expenses } = state;
  return {
    currency,
    people: people.map((name, index) => ({ id: personId(index), name: name.trim() })),
    expenses: expenses.map((expense, index): ExampleExpense => {
      const chosen = people.map((_name, person) => person).filter(person => expense.include[person]);
      const label = expense.label.trim() || String(index + 1);
      const amount = parseNumber(expense.amount) as number;
      const payer = personId(expense.payer);
      if (expense.method === 'equal') {
        // Everyone: leave `shares` out, as the examples do
        const everyone = chosen.length === people.length;
        return {
          label,
          payer,
          amount,
          split: {
            method: 'equal',
            ...(everyone ? {} : { shares: Object.fromEntries(chosen.map(person => [personId(person), 1])) }),
          },
        };
      }
      return {
        label,
        payer,
        amount,
        split: {
          method: expense.method,
          shares: Object.fromEntries(
            chosen.map(person => [personId(person), parseNumber(expense.values[person] ?? '') as number])
          ),
        },
      };
    }),
  };
}

/**
 * Validate the form and, if it is sound, compute the balances and the short list of payments.
 * Never throws: the rules of `settle.ts` are checked again on the mapped example, and a problem
 * `checkState` missed comes back as an `unexpected` problem rather than an exception.
 */
export function calculate(state: CalcState): Outcome {
  const problems = checkState(state);
  if (problems.length > 0 || state.expenses.length === 0) return { problems };

  const data = toExample(state);
  if (exampleProblems(data).length > 0) {
    return { problems: [{ code: 'unexpected', target: { kind: 'expense', expense: 0, field: 'amount' } }] };
  }
  const computed = computeExample(data);
  const index = (id: string) => Number(id.slice(1));
  return {
    problems,
    result: {
      currency: state.currency,
      balances: state.people.map((_name, person) => ({ person, minor: computed.balances[personId(person)] })),
      payments: computed.transfers.map(transfer => ({
        from: index(transfer.from),
        to: index(transfer.to),
        minor: transfer.minor,
      })),
      totalMinor: computed.totalMinor,
    },
  };
}

/** An expense for the people given, shared by everyone */
export function newExpense(label: string, people: number, payer = 0): ExpenseState {
  return {
    label,
    payer,
    amount: '',
    method: 'equal',
    include: Array.from({ length: people }, () => true),
    values: Array.from({ length: people }, () => ''),
  };
}
