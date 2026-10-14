import { describe, expect, it } from 'vitest';
import {
  apportion,
  computeExample,
  exampleProblems,
  expenseShares,
  fromMinor,
  minorExponent,
  pairwiseDebts,
  simplifyBalances,
  toMinor,
  type ExampleData,
} from '@/lib/settle';
import { deriveBalances, deriveGreedyPayments, deriveIous, derivePairwiseDebts } from '@/components/home/data/example-group';

const people = (...ids: string[]) => ids.map(id => ({ id, name: id.toUpperCase() }));

const sum = (values: Record<string, number> | number[]) => Object.values(values).reduce((a, b) => a + b, 0);

describe('currency units', () => {
  it('knows the decimal places', () => {
    expect(minorExponent('EUR')).toBe(2);
    expect(minorExponent('JPY')).toBe(0);
    expect(minorExponent('KWD')).toBe(3);
    expect(() => minorExponent('XX')).toThrow();
  });

  it('converts without float noise', () => {
    expect(toMinor(19.99, 'EUR')).toBe(1999);
    expect(toMinor(0.1 + 0.2, 'EUR')).toBe(30);
    expect(toMinor(1.005, 'EUR')).toBe(101);
    expect(toMinor(4800, 'JPY')).toBe(4800);
    expect(toMinor(1.234, 'KWD')).toBe(1234);
    expect(fromMinor(1999, 'EUR')).toBe(19.99);
  });
});

describe('apportion (largest remainder)', () => {
  it('splits three ways with the extra cent going to the earliest', () => {
    expect(apportion(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
    expect(apportion(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(apportion(2, [1, 1, 1])).toEqual([1, 1, 0]);
    expect(apportion(0, [1, 1, 1])).toEqual([0, 0, 0]);
  });

  it('always sums to the total', () => {
    for (let total = 0; total < 200; total++) {
      for (const weights of [[1, 1, 1], [1, 1, 1, 1, 1, 1, 1], [50, 25, 25], [33.33, 33.33, 33.34], [1, 2, 3]]) {
        expect(sum(apportion(total, weights)), `${total} / ${weights}`).toBe(total);
      }
    }
  });

  it('gives the leftover to the biggest fraction, ties to the earlier person', () => {
    // raw 2.5, 1.25, 1.25: floors 2,1,1, one unit left, biggest fraction is the first
    expect(apportion(5, [50, 25, 25])).toEqual([3, 1, 1]);
    // raw 1.5, 1.5: floors 1,1, one left, tie goes to the first
    expect(apportion(3, [1, 1])).toEqual([2, 1]);
    // raw 0.6, 1.4: floors 0,1, the fraction .6 beats .4
    expect(apportion(2, [3, 7])).toEqual([1, 1]);
  });

  it('rejects empty or zero weights', () => {
    expect(() => apportion(10, [])).toThrow();
    expect(() => apportion(10, [0, 0])).toThrow();
  });
});

describe('expense shares', () => {
  const data = (split: ExampleData['expenses'][number]['split'], amount = 100, currency = 'EUR'): ExampleData => ({
    currency,
    people: people('a', 'b', 'c'),
    expenses: [{ label: 'x', payer: 'a', amount, split }],
  });

  it('splits a three-way equal expense and rounds the odd cent to the first person', () => {
    const d = data({ method: 'equal' });
    expect(expenseShares(d, d.expenses[0])).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it('rounds in yen, which has no minor unit', () => {
    const d = data({ method: 'equal' }, 100, 'JPY');
    expect(expenseShares(d, d.expenses[0])).toEqual({ a: 34, b: 33, c: 33 });
  });

  it('splits equally among a subset', () => {
    const d = data({ method: 'equal', shares: { b: 1, c: 1 } }, 10);
    expect(expenseShares(d, d.expenses[0])).toEqual({ b: 500, c: 500 });
  });

  it('splits by percent with rounding', () => {
    const d = data({ method: 'percent', shares: { a: 33.33, b: 33.33, c: 33.34 } }, 10);
    const shares = expenseShares(d, d.expenses[0]);
    expect(shares).toEqual({ a: 333, b: 333, c: 334 });
    expect(sum(shares)).toBe(1000);
  });

  it('keeps exact amounts as written', () => {
    const d = data({ method: 'exact', shares: { a: 20.1, b: 30.45, c: 49.45 } });
    expect(expenseShares(d, d.expenses[0])).toEqual({ a: 2010, b: 3045, c: 4945 });
  });
});

describe('validation', () => {
  const base: ExampleData = {
    currency: 'EUR',
    people: people('a', 'b'),
    expenses: [{ label: 'x', payer: 'a', amount: 10, split: { method: 'equal' } }],
  };
  const withExpense = (patch: Partial<ExampleData['expenses'][number]>): ExampleData => ({
    ...base,
    expenses: [{ ...base.expenses[0], ...patch }],
  });

  it('accepts a good example', () => {
    expect(exampleProblems(base)).toEqual([]);
  });

  it.each([
    ['unknown currency', { ...base, currency: 'ZZZ9' }, /currency/],
    ['duplicate person ids', { ...base, people: people('a', 'a') }, /unique/],
    ['payer not a person', withExpense({ payer: 'z' }), /payer/],
    ['zero amount', withExpense({ amount: 0 }), /positive/],
    ['share for a stranger', withExpense({ split: { method: 'equal', shares: { z: 1 } } }), /not a person/],
    ['percent not 100', withExpense({ split: { method: 'percent', shares: { a: 50, b: 40 } } }), /not 100/],
    ['exact not summing', withExpense({ split: { method: 'exact', shares: { a: 5, b: 4.99 } } }), /sum/],
    ['exact without shares', withExpense({ split: { method: 'exact' } }), /needs shares/],
    ['a well-formed code Intl does not list', { ...base, currency: 'XYZ' }, /unknown currency "XYZ"/],
    ['an amount finer than the currency', withExpense({ amount: 1.005 }), /more decimals than EUR/],
    ['fractional yen', { ...withExpense({ amount: 12.5 }), currency: 'JPY' }, /more decimals than JPY/],
    ['an amount over the cap', withExpense({ amount: 1_000_000 }), /cap/],
    ['an exact share finer than the currency', withExpense({ split: { method: 'exact', shares: { a: 5.005, b: 4.995 } } }), /exact share has more decimals/],
    ['equal shares other than 1', withExpense({ split: { method: 'equal', shares: { a: 2, b: 1 } } }), /value 1/],
    ['empty shares', withExpense({ split: { method: 'equal', shares: {} } }), /empty/],
    ['another currency without rates', withExpense({ currency: 'USD' }), /need conversion.rates/],
    ['a missing rate', { ...withExpense({ currency: 'USD' }), conversion: { rates: { JPY: 0.006 } } }, /no rate for USD/],
    ['an unused rate', { ...base, conversion: { rates: { USD: 0.9 } } }, /no expense uses/],
    ['an unknown expense currency', withExpense({ currency: 'QQQ' }), /unknown currency "QQQ"/],
  ])('rejects %s', (_name, data, message) => {
    expect(exampleProblems(data as ExampleData).join('\n')).toMatch(message);
    expect(() => computeExample(data as ExampleData)).toThrow(/Invalid worked example/);
  });
});

describe('simplifyBalances', () => {
  it('collapses a chain into one payment', () => {
    // a owes b 10, b owes c 10: b is square, a pays c
    expect(simplifyBalances({ a: -1000, b: 0, c: 1000 })).toEqual([{ from: 'a', to: 'c', minor: 1000 }]);
  });

  it('pays the largest creditor from the largest debtor first, ties in people order', () => {
    expect(simplifyBalances({ a: -500, b: -500, c: 600, d: 400 })).toEqual([
      { from: 'a', to: 'c', minor: 500 },
      { from: 'b', to: 'c', minor: 100 },
      { from: 'b', to: 'd', minor: 400 },
    ]);
  });

  it('returns nothing when everyone is square', () => {
    expect(simplifyBalances({ a: 0, b: 0 })).toEqual([]);
  });

  it('matches the homepage example simplifier', () => {
    const balances = deriveBalances();
    const home = deriveGreedyPayments(balances).map(t => ({ from: t.from, to: t.to, minor: t.cents }));
    expect(simplifyBalances(balances, Object.keys(balances))).toEqual(home);
  });

  it('settles every balance to zero and never makes more payments than people minus one', () => {
    const balances = { a: -1234, b: 2000, c: -766, d: 5, e: -5, f: 0 };
    const transfers = simplifyBalances(balances);
    const after = { ...balances } as Record<string, number>;
    for (const t of transfers) {
      expect(t.minor).toBeGreaterThan(0);
      after[t.from] += t.minor;
      after[t.to] -= t.minor;
    }
    expect(Object.values(after).every(v => v === 0)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
  });
});

describe('computeExample', () => {
  it('three-way split of 100.00: payer is owed 66.66, the others owe 33.33', () => {
    const result = computeExample({
      currency: 'EUR',
      people: people('a', 'b', 'c'),
      expenses: [{ label: 'dinner', payer: 'a', amount: 100, split: { method: 'equal' } }],
    });
    expect(result.exponent).toBe(2);
    expect(result.totalMinor).toBe(10000);
    expect(result.balances).toEqual({ a: 6666, b: -3333, c: -3333 });
    expect(result.transfers).toEqual([
      { from: 'b', to: 'a', minor: 3333 },
      { from: 'c', to: 'a', minor: 3333 },
    ]);
  });

  it('three people who each pay one equal bill need only two payments', () => {
    const result = computeExample({
      currency: 'EUR',
      people: people('a', 'b', 'c'),
      expenses: [
        { label: 'rent', payer: 'a', amount: 90, split: { method: 'equal' } },
        { label: 'food', payer: 'b', amount: 45, split: { method: 'equal' } },
        { label: 'taxi', payer: 'c', amount: 15, split: { method: 'equal' } },
      ],
    });
    expect(result.balances).toEqual({ a: 4000, b: -500, c: -3500 });
    expect(result.transfers).toEqual([
      { from: 'c', to: 'a', minor: 3500 },
      { from: 'b', to: 'a', minor: 500 },
    ]);
  });

  it('balances always sum to zero when rounding is involved', () => {
    const result = computeExample({
      currency: 'JPY',
      people: people('a', 'b', 'c', 'd'),
      expenses: [
        { label: 'one', payer: 'a', amount: 1000, split: { method: 'equal' } },
        { label: 'two', payer: 'b', amount: 1001, split: { method: 'equal', shares: { a: 1, c: 1, d: 1 } } },
        { label: 'three', payer: 'c', amount: 777, split: { method: 'percent', shares: { a: 10, b: 20, c: 30, d: 40 } } },
        { label: 'four', payer: 'd', amount: 500, split: { method: 'exact', shares: { a: 100, b: 400 } } },
      ],
    });
    expect(sum(result.balances)).toBe(0);
    expect(result.totalMinor).toBe(3278);
    expect(result.shares.map(sum)).toEqual([1000, 1001, 777, 500]);
    expect(sum(result.transfers.map(t => t.minor))).toBe(
      Object.values(result.balances).filter(v => v > 0).reduce((a, b) => a + b, 0)
    );
  });

  it('is deterministic and independent of expense order for the final balances', () => {
    const expenses: ExampleData['expenses'] = [
      { label: 'one', payer: 'a', amount: 10.01, split: { method: 'equal' } },
      { label: 'two', payer: 'b', amount: 7.5, split: { method: 'equal', shares: { a: 1, b: 1 } } },
    ];
    const a = computeExample({ currency: 'EUR', people: people('a', 'b', 'c'), expenses });
    const b = computeExample({ currency: 'EUR', people: people('a', 'b', 'c'), expenses: [...expenses].reverse() });
    expect(a.balances).toEqual(b.balances);
    expect(a.totalMinor).toBe(1751);
  });
});

// ---------------------------------------------------------------------------
// The site plan's worked examples (tasks/seo-site-expansion-plan.md, page briefs)
// ---------------------------------------------------------------------------

const named = (...names: string[]) => names.map(name => ({ id: name.toLowerCase(), name }));
const equal = { method: 'equal' as const };
const transfersOf = (result: { transfers: { from: string; to: string; minor: number }[] }) =>
  result.transfers.map(t => `${t.from}>${t.to} ${t.minor}`);

describe('site plan worked examples', () => {
  it('how it works: three friends, two payments', () => {
    const result = computeExample({
      currency: 'GBP',
      people: named('Ana', 'Ben', 'Cara'),
      expenses: [
        { label: 'Dinner', payer: 'ana', amount: 90, split: equal },
        { label: 'Taxi', payer: 'ben', amount: 30, split: equal },
      ],
    });
    expect(result.balances).toEqual({ ana: 5000, ben: -1000, cara: -4000 });
    expect(transfersOf(result)).toEqual(['cara>ana 4000', 'ben>ana 1000']);
  });

  it('settle up: six pairwise payments become two', () => {
    const result = computeExample({
      currency: 'GBP',
      people: named('Amira', 'Ben', 'Carlos', 'Dana'),
      expenses: [
        { label: 'Electricity', payer: 'amira', amount: 120, split: equal },
        { label: 'Internet', payer: 'ben', amount: 40, split: equal },
        { label: 'Groceries', payer: 'carlos', amount: 80, split: equal },
      ],
    });
    expect(result.balances).toEqual({ amira: 6000, ben: -2000, carlos: 2000, dana: -6000 });
    expect(result.pairwise.map(t => `${t.from}>${t.to} ${t.minor}`).sort()).toEqual(
      ['ben>amira 2000', 'carlos>amira 1000', 'dana>amira 3000', 'ben>carlos 1000', 'dana>ben 1000', 'dana>carlos 2000'].sort()
    );
    expect(transfersOf(result)).toEqual(['dana>amira 6000', 'ben>carlos 2000']);
  });

  it('pairwise debts match the homepage tangle', () => {
    const ious = deriveIous();
    const home = derivePairwiseDebts(ious).map(t => ({ from: t.from, to: t.to, minor: t.cents }));
    const byExpense = new Map<number, { payer: string; shares: Record<string, number> }>();
    for (const iou of ious) {
      const item = byExpense.get(iou.expenseId) ?? { payer: iou.to, shares: {} };
      item.shares[iou.from] = (item.shares[iou.from] ?? 0) + iou.cents;
      byExpense.set(iou.expenseId, item);
    }
    expect(pairwiseDebts([...byExpense.values()], Object.keys(deriveBalances()))).toEqual(home);
  });

  it('split expenses: room sizes, exact amounts and the odd penny', () => {
    const d: ExampleData = {
      currency: 'GBP',
      people: named('A', 'B', 'C'),
      expenses: [
        { label: 'Cottage', payer: 'a', amount: 600, split: { method: 'percent', shares: { a: 50, b: 30, c: 20 } } },
        { label: 'Dinner', payer: 'a', amount: 84, split: equal },
        { label: 'Groceries', payer: 'a', amount: 64.5, split: { method: 'exact', shares: { a: 25, b: 21.5, c: 18 } } },
        { label: 'Odd penny', payer: 'a', amount: 100, split: equal },
      ],
    };
    expect(computeExample(d).shares).toEqual([
      { a: 30000, b: 18000, c: 12000 },
      { a: 2800, b: 2800, c: 2800 },
      { a: 2500, b: 2150, c: 1800 },
      { a: 3334, b: 3333, c: 3333 },
    ]);
  });

  it('housemates: three payments, all to Jo', () => {
    const result = computeExample({
      currency: 'GBP',
      people: named('Jo', 'Kwame', 'Lena', 'Matt'),
      expenses: [
        { label: 'Rent', payer: 'jo', amount: 2000, split: { method: 'percent', shares: { jo: 30, kwame: 25, lena: 25, matt: 20 } } },
        { label: 'Energy', payer: 'kwame', amount: 120, split: equal },
        { label: 'Internet', payer: 'lena', amount: 40, split: equal },
        { label: 'Groceries', payer: 'matt', amount: 80, split: equal },
      ],
    });
    expect(result.balances).toEqual({ jo: 134000, kwame: -44000, lena: -52000, matt: -38000 });
    expect(transfersOf(result)).toEqual(['lena>jo 52000', 'kwame>jo 44000', 'matt>jo 38000']);
  });

  it('events: a group gift by exact amounts, five payments to Priya', () => {
    const result = computeExample({
      currency: 'GBP',
      people: named('Priya', 'Tom', 'Jess', 'Mo', 'Lee', 'Kat'),
      expenses: [
        {
          label: 'Gift',
          payer: 'priya',
          amount: 150,
          split: { method: 'exact', shares: { priya: 30, tom: 30, jess: 30, mo: 20, lee: 20, kat: 20 } },
        },
      ],
    });
    expect(result.transfers).toHaveLength(5);
    expect(sum(result.transfers.map(t => t.minor))).toBe(12000);
    expect(result.transfers.every(t => t.to === 'priya')).toBe(true);
  });

  it('group trips: six payments kept separate, three when converted to pounds', () => {
    const result = computeExample({
      currency: 'GBP',
      people: [
        { id: 'ana', name: 'Ana' },
        { id: 'ben', name: 'Ben' },
        { id: 'chloe', name: 'Chloé' },
        { id: 'dev', name: 'Dev' },
      ],
      conversion: { rates: { EUR: 0.85 } },
      expenses: [
        { label: 'Flights', payer: 'ana', amount: 480, split: equal },
        { label: 'Villa', payer: 'ben', amount: 900, currency: 'EUR', split: equal },
        { label: 'Dinner', payer: 'chloe', amount: 120, currency: 'EUR', split: { method: 'equal', shares: { ana: 1, ben: 1, chloe: 1 } } },
        { label: 'Boat trip', payer: 'dev', amount: 160, currency: 'EUR', split: equal },
      ],
    });
    expect(result.separate.map(l => l.currency)).toEqual(['GBP', 'EUR']);
    expect(transfersOf(result.separate[0])).toEqual(['ben>ana 12000', 'chloe>ana 12000', 'dev>ana 12000']);
    expect(transfersOf(result.separate[1])).toEqual(['ana>ben 30500', 'chloe>ben 18500', 'dev>ben 10500']);
    expect(result.amounts).toEqual([48000, 76500, 10200, 13600]);
    expect(transfersOf(result)).toEqual(['chloe>ben 27725', 'dev>ben 10850', 'dev>ana 10075']);
  });

  it('multiple currencies: Japan at 200 yen to the pound', () => {
    const result = computeExample({
      currency: 'GBP',
      people: named('Ana', 'Ben', 'Chloe', 'Dev'),
      conversion: { rates: { JPY: 0.005 } },
      expenses: [
        { label: 'Hotel', payer: 'ana', amount: 1200, split: equal },
        { label: 'Dinner', payer: 'ben', amount: 40000, currency: 'JPY', split: equal },
        { label: 'Trains', payer: 'chloe', amount: 24000, currency: 'JPY', split: equal },
        { label: 'Temple', payer: 'dev', amount: 4000, currency: 'JPY', split: equal },
      ],
    });
    expect(transfersOf(result.separate[1])).toEqual(['ana>ben 17000', 'dev>ben 6000', 'dev>chloe 7000']);
    expect(result.separate[1].exponent).toBe(0);
    expect(transfersOf(result)).toEqual(['dev>ana 36500', 'chloe>ana 26500', 'ben>ana 18500']);
  });

  it('a single-currency example has one separate ledger equal to the main one', () => {
    const result = computeExample({
      currency: 'KWD',
      people: named('A', 'B', 'C'),
      expenses: [{ label: 'x', payer: 'a', amount: 10, split: equal }],
    });
    expect(result.separate).toHaveLength(1);
    expect(result.separate[0].balances).toEqual(result.balances);
    expect(result.balances).toEqual({ a: 6666, b: -3333, c: -3333 });
  });
});

// ---------------------------------------------------------------------------
// Properties over random examples (seeded, so a failure reproduces)
// ---------------------------------------------------------------------------

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Split = ExampleData['expenses'][number]['split'];

/** A valid random example: 2–7 people, 1–8 expenses under the cap, every split method. */
function randomExample(random: () => number, currency: string, foreign?: string): ExampleData {
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const ids = Array.from({ length: int(2, 7) }, (_, i) => `p${i}`);
  const expenses: ExampleData['expenses'] = Array.from({ length: int(1, 8) }, (_, i) => {
    const cur = foreign && random() < 0.5 ? foreign : currency;
    const exp = minorExponent(cur);
    // Up to 999,999 major units, so every currency stays under the 999,999.99 cap
    const minor = int(1, 999_999 * 10 ** exp);
    let participants = ids.filter(() => random() < 0.6);
    if (participants.length === 0) participants = [ids[int(0, ids.length - 1)]];
    let split: Split;
    const kind = int(0, 2);
    if (kind === 0) {
      split = random() < 0.5 ? { method: 'equal' } : { method: 'equal', shares: Object.fromEntries(participants.map(id => [id, 1])) };
    } else if (kind === 1) {
      // Percentages with two decimals that sum to exactly 100
      const parts = apportion(10000, participants.map(() => int(1, 9)));
      const entries = participants.map((id, j) => [id, parts[j] / 100] as const).filter(([, v]) => v > 0);
      split = { method: 'percent', shares: Object.fromEntries(entries) };
    } else {
      const parts = apportion(minor, participants.map(() => int(1, 9)));
      const entries = participants.map((id, j) => [id, parts[j] / 10 ** exp] as const).filter(([, v]) => v > 0);
      split = { method: 'exact', shares: Object.fromEntries(entries) };
    }
    return {
      label: `e${i}`,
      payer: ids[int(0, ids.length - 1)],
      amount: minor / 10 ** exp,
      ...(cur !== currency ? { currency: cur } : {}),
      split,
    };
  });
  const usesForeign = foreign !== undefined && expenses.some(e => e.currency === foreign);
  return {
    currency,
    people: ids.map(id => ({ id, name: id })),
    expenses,
    // Rates small enough that a converted expense stays a safe integer of minor units
    ...(usesForeign ? { conversion: { rates: { [foreign]: Number((0.001 + random() * 5).toFixed(4)) } } } : {}),
  };
}

interface LedgerLike {
  balances: Record<string, number>;
  transfers: { from: string; to: string; minor: number }[];
  pairwise: { from: string; to: string; minor: number }[];
}

/** Balances sum to zero; both the greedy and the pairwise payments settle every balance. */
function checkLedger(ledger: LedgerLike, where: string) {
  const values = Object.values(ledger.balances);
  expect(values.every(Number.isInteger), where).toBe(true);
  expect(sum(values), where).toBe(0);
  for (const payments of [ledger.transfers, ledger.pairwise]) {
    const after = { ...ledger.balances };
    for (const t of payments) {
      expect(Number.isInteger(t.minor) && t.minor > 0, where).toBe(true);
      expect(t.from, where).not.toBe(t.to);
      after[t.from] += t.minor;
      after[t.to] -= t.minor;
    }
    expect(Object.values(after).every(v => v === 0), where).toBe(true);
  }
  const owing = values.filter(v => v !== 0).length;
  expect(ledger.transfers.length, where).toBeLessThanOrEqual(Math.max(0, owing - 1));
}

describe('properties', () => {
  it.each(['JPY', 'USD', 'EUR', 'KWD'])('hold for 300 random %s examples', currency => {
    const random = rng(currency.charCodeAt(0) * 7919 + currency.charCodeAt(2));
    for (let n = 0; n < 300; n++) {
      const data = randomExample(random, currency);
      const where = JSON.stringify(data);
      expect(exampleProblems(data), where).toEqual([]);
      const result = computeExample(data);
      // Every expense's shares sum exactly to its amount in minor units
      result.shares.forEach((shares, i) => expect(sum(shares), where).toBe(toMinor(data.expenses[i].amount, currency)));
      expect(result.totalMinor, where).toBe(sum(data.expenses.map(e => toMinor(e.amount, currency))));
      checkLedger(result, where);
      expect(result.separate, where).toHaveLength(1);
    }
  });

  it.each([
    ['GBP', 'JPY'],
    ['JPY', 'KWD'],
    ['KWD', 'EUR'],
    ['USD', 'EUR'],
  ])('hold for 200 random %s examples with %s expenses', (currency, foreign) => {
    const random = rng(currency.charCodeAt(1) * 104729 + foreign.charCodeAt(0));
    for (let n = 0; n < 200; n++) {
      const data = randomExample(random, currency, foreign);
      const where = JSON.stringify(data);
      expect(exampleProblems(data), where).toEqual([]);
      const result = computeExample(data);
      result.shares.forEach((shares, i) => expect(sum(shares), where).toBe(result.amounts[i]));
      expect(result.totalMinor, where).toBe(sum(result.amounts));
      checkLedger(result, where);
      for (const ledger of result.separate) {
        checkLedger(ledger, where);
        const own = data.expenses.filter(e => (e.currency ?? currency) === ledger.currency);
        expect(ledger.totalMinor, where).toBe(sum(own.map(e => toMinor(e.amount, ledger.currency))));
      }
    }
  });
});
