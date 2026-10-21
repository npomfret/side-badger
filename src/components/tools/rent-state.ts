/**
 * The rent calculator's form state (release 2, P9): its shape, its limits and the form as it opens.
 * The page script builds the form from these at load; the checks and the shares are in
 * `rent-engine.ts`, which re-exports all of this and is fetched only when the figures are needed
 * (`rent-deferred.ts`, restructure D36).
 */
import { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE } from './form-input';

export { MAX_NAME_LENGTH, MAX_NUMBER_LENGTH, MIN_PEOPLE };

export const MAX_RENT_PEOPLE = 10;
/** The share of the rent that pays for the shared rooms, until the group says otherwise */
export const DEFAULT_SHARED = '40';

export type Mode = 'room' | 'income';
/** A label only: it does not change a share */
export type Unit = 'm2' | 'ft2';

export const MODES: readonly Mode[] = ['room', 'income'];
export const UNITS: readonly Unit[] = ['m2', 'ft2'];

/** One person as the form holds them: numbers stay as typed until they are checked. */
export interface PersonState {
  name: string;
  /** Bedroom area (by room size) */
  area: string;
  /** Income (by income) */
  income: string;
}

export interface RentState {
  mode: Mode;
  /** ISO 4217 code */
  currency: string;
  rent: string;
  /** By income only: shared bills, split like the rent. Blank means none. */
  bills: string;
  /** By room size only: the percentage of the rent that pays for the shared rooms */
  shared: string;
  unit: Unit;
  people: PersonState[];
}

/** The field that says how big this person's share is, in the current mode */
export const valueOf = (state: Pick<RentState, 'mode'>, person: PersonState): string =>
  state.mode === 'room' ? person.area : person.income;

/** A person for the form: blank figures */
export const newPerson = (name: string): PersonState => ({ name, area: '', income: '' });

/** The form as it opens: two people, nothing typed, 40% for the shared rooms */
export function freshState(currency: string, names: readonly [string, string]): RentState {
  return {
    mode: 'room',
    currency,
    rent: '',
    bills: '',
    shared: DEFAULT_SHARED,
    unit: 'm2',
    people: names.map(newPerson),
  };
}
