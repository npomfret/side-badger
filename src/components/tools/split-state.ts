/**
 * The split-bill calculator's form state (release 2, R3): its shape, its limits and a new expense.
 * The page script builds the form from these at load; the checks and the sums are in
 * `split-engine.ts`, which re-exports all of this and is fetched only when the figures are needed
 * (`split-deferred.ts`, restructure D36).
 */
import { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE } from './form-input';

export { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE };

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
