import { describe, expect, it } from 'vitest';
import {
  apportion,
  computeExample,
  exampleProblems,
  expenseShares,
  fromMinor,
  minorExponent,
  simplifyBalances,
  toMinor,
  type ExampleData,
} from '@/lib/settle';
import { deriveBalances, deriveGreedyPayments } from '@/components/home/data/example-group';

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
