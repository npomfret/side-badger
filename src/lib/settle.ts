/**
 * Worked-example arithmetic (restructure 3.4, D23): balances and the short list of payments that
 * settles them. Pure functions, no I/O, shared by the content schemas, the tests and
 * `WorkedExample.astro`.
 *
 * All money is computed in integer minor units (cents, yen, fils, …) of the currency, so the
 * numbers on the page always add up. The simplifier is the same greedy method as the homepage
 * example (`components/home/data/example-group.ts`) and the app's `simplifyDebts`: the largest
 * debtor pays the largest creditor the smaller of the two amounts, ties keep people order. It
 * gives a short list of payments, not a proven minimum.
 *
 * Currencies (site plan briefs for multiple currencies and group trips): an expense may be in a
 * currency other than the example's. Such an example must give `conversion.rates`, and the result
 * then has both views the briefs show: `separate` (one ledger per currency, never netted against
 * each other, as the app does by default) and the main ledger, where each expense is converted
 * into the example's currency when entered (as the app's auto-convert does) and then split.
 *
 * Minor units and `apportion` live in `minor-units.ts` and are re-exported here, so every import
 * from this module keeps working while a script that needs only those does not ship the rest.
 */
import { MAX_EXPENSE_AMOUNT, apportion, isWholeMinor, minorExponent, toMinor } from './minor-units';

export { MAX_EXPENSE_AMOUNT, apportion, fromMinor, isWholeMinor, minorExponent, toMinor } from './minor-units';

export type SplitMethod = 'equal' | 'exact' | 'percent';

export interface ExamplePerson {
  id: string;
  name: string;
}

export interface ExampleExpense {
  label: string;
  /** Person id of who paid */
  payer: string;
  /** Major units of the expense's currency, e.g. 84.5 */
  amount: number;
  /** ISO 4217 code; defaults to the example's `currency` */
  currency?: string;
  split: {
    method: SplitMethod;
    /**
     * equal: optional participants, each with the value 1; omitted means everyone.
     * exact: each participant's amount in major units, summing to `amount`.
     * percent: each participant's percentage, summing to 100.
     */
    shares?: Record<string, number>;
  };
}

export interface ExampleData {
  /** ISO 4217 code of the example (the group's currency) */
  currency: string;
  people: ExamplePerson[];
  expenses: ExampleExpense[];
  /**
   * Illustrative rates for expenses in other currencies: units of `currency` per one unit of the
   * keyed currency (`{ EUR: 0.85 }` with `currency: GBP` means €1 = £0.85).
   */
  conversion?: { rates: Record<string, number> };
}

export interface Transfer {
  from: string;
  to: string;
  /** Minor units, always positive */
  minor: number;
}

export interface Ledger {
  currency: string;
  /** Decimal places of the currency (2 for EUR, 0 for JPY, 3 for KWD) */
  exponent: number;
  /** Per person: paid minus owed, minor units. Positive means owed money. Sums to zero. */
  balances: Record<string, number>;
  /** The short list of payments that settles everyone (greedy) */
  transfers: Transfer[];
  /** Paying each person back directly, after netting each pair (the "before" of settle up) */
  pairwise: Transfer[];
  /** Sum of the expenses in this ledger, minor units */
  totalMinor: number;
}

export interface ExampleResult extends Ledger {
  /**
   * Per expense, in input order: each participant's share in minor units of the main ledger
   * (after conversion, for an expense in another currency).
   */
  shares: Record<string, number>[];
  /** Per expense, in input order: its amount in minor units of the main ledger */
  amounts: number[];
  /**
   * One ledger per currency used, unconverted: the example's currency first, then in order of
   * first use. A single-currency example has one, equal to the main ledger.
   */
  separate: Ledger[];
}

const expenseCurrency = (data: ExampleData, expense: ExampleExpense) => expense.currency ?? data.currency;

/** Currencies the example uses: its own first, then in order of first use. */
export function exampleCurrencies(data: ExampleData): string[] {
  return [...new Set([data.currency, ...data.expenses.map(e => expenseCurrency(data, e))])].filter(
    (code, i) => i > 0 || data.expenses.some(e => expenseCurrency(data, e) === code)
  );
}

/** Everything wrong with an example, or an empty list. Never throws. */
export function exampleProblems(data: ExampleData): string[] {
  const problems: string[] = [];
  const known = (code: string) => {
    try {
      minorExponent(code);
      return true;
    } catch {
      return false;
    }
  };
  if (!known(data.currency)) return [`unknown currency "${data.currency}"`];

  const ids = data.people.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('person ids are not unique');
  const people = new Set(ids);

  data.expenses.forEach((expense, i) => {
    const where = `expense ${i} ("${expense.label}")`;
    const currency = expenseCurrency(data, expense);
    if (!known(currency)) {
      problems.push(`${where}: unknown currency "${currency}"`);
      return;
    }
    if (!people.has(expense.payer)) problems.push(`${where}: payer "${expense.payer}" is not a person`);
    if (!(expense.amount > 0)) problems.push(`${where}: amount must be positive`);
    else if (expense.amount > MAX_EXPENSE_AMOUNT) problems.push(`${where}: amount is over the ${MAX_EXPENSE_AMOUNT} cap`);
    else if (!isWholeMinor(expense.amount, currency)) problems.push(`${where}: amount has more decimals than ${currency} allows`);

    const { method, shares } = expense.split;
    if (shares && Object.keys(shares).length === 0) problems.push(`${where}: shares is empty`);
    for (const [id, value] of Object.entries(shares ?? {})) {
      if (!people.has(id)) problems.push(`${where}: share for "${id}" who is not a person`);
      if (!(value > 0)) problems.push(`${where}: share for "${id}" must be positive`);
    }
    if (method === 'equal') {
      if (Object.values(shares ?? {}).some(v => v !== 1)) problems.push(`${where}: equal shares list participants with the value 1`);
    } else if (!shares || Object.keys(shares).length === 0) {
      problems.push(`${where}: ${method} split needs shares`);
    } else if (method === 'percent') {
      const total = Object.values(shares).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) > 1e-9) problems.push(`${where}: percentages sum to ${total}, not 100`);
    } else if (method === 'exact') {
      const values = Object.values(shares);
      if (values.some(v => !isWholeMinor(v, currency))) problems.push(`${where}: an exact share has more decimals than ${currency} allows`);
      else if (values.reduce((a, v) => a + toMinor(v, currency), 0) !== toMinor(expense.amount, currency)) {
        problems.push(`${where}: exact shares do not sum to the amount`);
      }
    }
  });

  // Currencies: one ledger, or illustrative rates for every other currency used
  const foreign = [...new Set(data.expenses.map(e => expenseCurrency(data, e)))].filter(c => c !== data.currency);
  const rates = data.conversion?.rates;
  if (foreign.length > 0 && !rates) {
    problems.push(`expenses in ${foreign.join(', ')} need conversion.rates into ${data.currency}`);
  }
  if (rates) {
    if (foreign.length === 0) problems.push('conversion is given but every expense is already in the example currency');
    for (const code of foreign) if (!(code in rates)) problems.push(`conversion.rates has no rate for ${code}`);
    for (const [code, rate] of Object.entries(rates)) {
      if (!foreign.includes(code)) problems.push(`conversion.rates has ${code}, which no expense uses`);
      if (!(rate > 0) || !Number.isFinite(rate)) problems.push(`conversion.rates.${code} must be positive`);
    }
  }
  return problems;
}

/** Each participant's share of `totalMinor`, in people order. */
function sharesOf(data: ExampleData, expense: ExampleExpense, totalMinor: number): Record<string, number> {
  const currency = expenseCurrency(data, expense);
  const { method, shares } = expense.split;
  const order = data.people.map(p => p.id);
  const participants = shares ? order.filter(id => id in shares) : order;
  const result: Record<string, number> = {};
  if (method === 'exact') {
    // Exact amounts weight a converted total pro rata; unconverted, apportion returns them as is
    const exact = participants.map(id => toMinor(shares![id], currency));
    apportion(totalMinor, exact).forEach((part, i) => (result[participants[i]] = part));
  } else {
    const weights = method === 'percent' ? participants.map(id => shares![id]) : participants.map(() => 1);
    apportion(totalMinor, weights).forEach((part, i) => (result[participants[i]] = part));
  }
  return result;
}

/** Each participant's share of one expense in minor units of its own currency, in people order. */
export function expenseShares(data: ExampleData, expense: ExampleExpense): Record<string, number> {
  return sharesOf(data, expense, toMinor(expense.amount, expenseCurrency(data, expense)));
}

/** An expense's amount converted into the example currency, minor units (rate fixed at entry). */
export function convertedMinor(data: ExampleData, expense: ExampleExpense): number {
  const currency = expenseCurrency(data, expense);
  if (currency === data.currency) return toMinor(expense.amount, currency);
  const rate = data.conversion?.rates[currency];
  if (!(rate !== undefined && rate > 0)) throw new Error(`No conversion rate for ${currency}`);
  return toMinor(expense.amount * rate, data.currency);
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

/**
 * Every participant paying each payer back directly, with opposite debts between the same pair
 * cancelled: one debt per pair, ordered by creditor, then debtor, in `order` (as the homepage's
 * `derivePairwiseDebts`).
 */
export function pairwiseDebts(
  items: readonly { payer: string; shares: Record<string, number> }[],
  order: readonly string[]
): Transfer[] {
  const owed = new Map<string, number>();
  const key = (from: string, to: string) => `${from}\u0000${to}`;
  for (const { payer, shares } of items) {
    for (const [id, minor] of Object.entries(shares)) {
      if (id !== payer && minor > 0) owed.set(key(id, payer), (owed.get(key(id, payer)) ?? 0) + minor);
    }
  }
  const debts: Transfer[] = [];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const [a, b] = [order[i], order[j]];
      const net = (owed.get(key(a, b)) ?? 0) - (owed.get(key(b, a)) ?? 0);
      if (net > 0) debts.push({ from: a, to: b, minor: net });
      else if (net < 0) debts.push({ from: b, to: a, minor: -net });
    }
  }
  return debts.sort((x, y) => order.indexOf(x.to) - order.indexOf(y.to) || order.indexOf(x.from) - order.indexOf(y.from));
}

function ledger(
  currency: string,
  order: readonly string[],
  items: readonly { payer: string; total: number; shares: Record<string, number> }[]
): Ledger {
  const balances: Record<string, number> = Object.fromEntries(order.map(id => [id, 0]));
  let totalMinor = 0;
  for (const item of items) {
    totalMinor += item.total;
    balances[item.payer] += item.total;
    for (const [id, share] of Object.entries(item.shares)) balances[id] -= share;
  }
  return {
    currency,
    exponent: minorExponent(currency),
    balances,
    transfers: simplifyBalances(balances, order),
    pairwise: pairwiseDebts(items, order),
    totalMinor,
  };
}

/** Balances and transfers for a worked example. Throws when `exampleProblems` is not empty. */
export function computeExample(data: ExampleData): ExampleResult {
  const problems = exampleProblems(data);
  if (problems.length > 0) throw new Error(`Invalid worked example: ${problems.join('; ')}`);
  const order = data.people.map(p => p.id);

  const main = data.expenses.map(expense => {
    const total = convertedMinor(data, expense);
    return { payer: expense.payer, total, shares: sharesOf(data, expense, total) };
  });
  const separate = exampleCurrencies(data).map(currency =>
    ledger(
      currency,
      order,
      data.expenses
        .filter(expense => expenseCurrency(data, expense) === currency)
        .map(expense => ({
          payer: expense.payer,
          total: toMinor(expense.amount, currency),
          shares: expenseShares(data, expense),
        }))
    )
  );
  return {
    ...ledger(data.currency, order, main),
    shares: main.map(item => item.shares),
    amounts: main.map(item => item.total),
    separate,
  };
}
