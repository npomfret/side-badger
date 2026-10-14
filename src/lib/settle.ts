/**
 * Worked-example arithmetic (restructure 3.4, D23): balances and the short list of payments that
 * settles them. Pure functions, no I/O, shared by the content schemas, the tests and
 * `WorkedExample.astro`.
 *
 * All money is computed in integer minor units (cents, yen, …) of the example's currency, so the
 * numbers on the page always add up. The simplifier is the same greedy method as the homepage
 * example (`components/home/data/example-group.ts`) and the app's `simplifyDebts`: the largest
 * debtor pays the largest creditor the smaller of the two amounts, ties keep people order. It
 * gives a short list of payments, not a proven minimum.
 */

export type SplitMethod = 'equal' | 'exact' | 'percent';

export interface ExamplePerson {
  id: string;
  name: string;
}

export interface ExampleExpense {
  label: string;
  /** Person id of who paid */
  payer: string;
  /** Major units of the example currency, e.g. 84.5 */
  amount: number;
  split: {
    method: SplitMethod;
    /**
     * equal: optional participants (any positive value, conventionally 1); omitted means everyone.
     * exact: each participant's amount in major units, summing to `amount`.
     * percent: each participant's percentage, summing to 100.
     */
    shares?: Record<string, number>;
  };
}

export interface ExampleData {
  /** ISO 4217 code */
  currency: string;
  people: ExamplePerson[];
  expenses: ExampleExpense[];
}

export interface Transfer {
  from: string;
  to: string;
  /** Minor units, always positive */
  minor: number;
}

export interface ExampleResult {
  currency: string;
  /** Decimal places of the currency (2 for EUR, 0 for JPY) */
  exponent: number;
  /** Per expense, in input order: each participant's share in minor units */
  shares: Record<string, number>[];
  /** Per person: paid minus owed, minor units. Positive means owed money. Sums to zero. */
  balances: Record<string, number>;
  /** The short list of payments that settles everyone */
  transfers: Transfer[];
  /** Sum of all expenses, minor units */
  totalMinor: number;
}

/** Decimal places of a currency. Throws RangeError for a code `Intl` does not know. */
export function minorExponent(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

/** Major units to integer minor units, rounding half away from zero after removing float noise. */
export function toMinor(amount: number, currency: string): number {
  const factor = 10 ** minorExponent(currency);
  return Math.round(Number((amount * factor).toPrecision(12)));
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
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || sum <= 0) throw new Error('apportion needs at least one positive weight');
  const raw = weights.map(w => (total * w) / sum);
  const parts = raw.map(r => Math.floor(r + 1e-9));
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, index) => ({ index, fraction: r - Math.floor(r + 1e-9) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) parts[order[i].index]++;
  return parts;
}

/** Everything wrong with an example, or an empty list. Never throws. */
export function exampleProblems(data: ExampleData): string[] {
  const problems: string[] = [];
  let exponent = 2;
  try {
    exponent = minorExponent(data.currency);
  } catch {
    problems.push(`unknown currency "${data.currency}"`);
    return problems;
  }
  const ids = data.people.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('person ids are not unique');
  const known = new Set(ids);
  data.expenses.forEach((expense, i) => {
    const where = `expense ${i} ("${expense.label}")`;
    if (!known.has(expense.payer)) problems.push(`${where}: payer "${expense.payer}" is not a person`);
    if (!(expense.amount > 0)) problems.push(`${where}: amount must be positive`);
    const { method, shares } = expense.split;
    for (const id of Object.keys(shares ?? {})) {
      if (!known.has(id)) problems.push(`${where}: share for "${id}" who is not a person`);
    }
    for (const [id, value] of Object.entries(shares ?? {})) {
      if (!(value > 0)) problems.push(`${where}: share for "${id}" must be positive`);
    }
    if (method !== 'equal' && (!shares || Object.keys(shares).length === 0)) {
      problems.push(`${where}: ${method} split needs shares`);
    } else if (method === 'percent') {
      const total = Object.values(shares ?? {}).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) > 1e-9) problems.push(`${where}: percentages sum to ${total}, not 100`);
    } else if (method === 'exact') {
      const total = Object.values(shares ?? {}).reduce((a, v) => a + toMinorWith(v, exponent), 0);
      if (total !== toMinorWith(expense.amount, exponent)) {
        problems.push(`${where}: exact shares do not sum to the amount`);
      }
    }
  });
  return problems;
}

function toMinorWith(amount: number, exponent: number): number {
  return Math.round(Number((amount * 10 ** exponent).toPrecision(12)));
}

/** Each participant's share of one expense in minor units, in people order. */
export function expenseShares(data: ExampleData, expense: ExampleExpense): Record<string, number> {
  const total = toMinor(expense.amount, data.currency);
  const { method, shares } = expense.split;
  const order = data.people.map(p => p.id);
  const participants = shares ? order.filter(id => id in shares) : order;
  const result: Record<string, number> = {};
  if (method === 'exact') {
    for (const id of participants) result[id] = toMinor(shares![id], data.currency);
  } else {
    const weights = method === 'percent' ? participants.map(id => shares![id]) : participants.map(() => 1);
    apportion(total, weights).forEach((part, i) => {
      result[participants[i]] = part;
    });
  }
  return result;
}

/**
 * Greedy simplification of net balances (positive = owed money) into a short list of payments.
 * `order` fixes tie-breaking; it defaults to the keys of `balances`.
 */
export function simplifyBalances(
  balances: Record<string, number>,
  order: readonly string[] = Object.keys(balances)
): Transfer[] {
  const creditors: { id: string; minor: number }[] = [];
  const debtors: { id: string; minor: number }[] = [];
  for (const id of order) {
    const minor = balances[id] ?? 0;
    if (minor > 0) creditors.push({ id, minor });
    else if (minor < 0) debtors.push({ id, minor: -minor });
  }
  // Array.prototype.sort is stable, so equal amounts keep people order
  creditors.sort((a, b) => b.minor - a.minor);
  debtors.sort((a, b) => b.minor - a.minor);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const minor = Math.min(creditor.minor, debtor.minor);
    transfers.push({ from: debtor.id, to: creditor.id, minor });
    creditor.minor -= minor;
    debtor.minor -= minor;
    if (creditor.minor === 0) ci++;
    if (debtor.minor === 0) di++;
  }
  return transfers;
}

/** Balances and transfers for a worked example. Throws when `exampleProblems` is not empty. */
export function computeExample(data: ExampleData): ExampleResult {
  const problems = exampleProblems(data);
  if (problems.length > 0) throw new Error(`Invalid worked example: ${problems.join('; ')}`);

  const balances: Record<string, number> = Object.fromEntries(data.people.map(p => [p.id, 0]));
  const shares = data.expenses.map(expense => expenseShares(data, expense));
  let totalMinor = 0;
  data.expenses.forEach((expense, i) => {
    const total = toMinor(expense.amount, data.currency);
    totalMinor += total;
    balances[expense.payer] += total;
    for (const [id, share] of Object.entries(shares[i])) balances[id] -= share;
  });
  return {
    currency: data.currency,
    exponent: minorExponent(data.currency),
    shares,
    balances,
    transfers: simplifyBalances(balances, data.people.map(p => p.id)),
    totalMinor,
  };
}
