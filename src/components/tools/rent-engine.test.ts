import { describe, expect, it } from 'vitest';
import { MAX_EXPENSE_AMOUNT, apportion, computeExample, type ExampleData } from '@/lib/settle';
import {
  DEFAULT_SHARED,
  MAX_AREA,
  MAX_INCOME,
  MAX_RENT_PEOPLE,
  calculate,
  checkState,
  exactShares,
  freshState,
  largestRemainder,
  newPerson,
  type PersonState,
  type RentState,
} from './rent-engine';

const sum = (list: readonly number[]) => list.reduce((a, b) => a + b, 0);

/** Guide 1's flat: £1,950 rent, bedrooms of 16, 12 and 10 m², 40% for the shared rooms */
const flat = (over: Partial<RentState> = {}): RentState => ({
  mode: 'room',
  currency: 'GBP',
  rent: '1950',
  bills: '',
  shared: '40',
  unit: 'm2',
  people: [
    { ...newPerson('Priya'), area: '16' },
    { ...newPerson('Tom'), area: '12' },
    { ...newPerson('Aisha'), area: '10' },
  ],
  ...over,
});

/** Guide 4's couple: £1,400 rent and £180 bills, take-home pay of £2,800 and £1,700 */
const couple = (over: Partial<RentState> = {}): RentState => ({
  mode: 'income',
  currency: 'GBP',
  rent: '1400',
  bills: '180',
  shared: '40',
  unit: 'm2',
  people: [
    { ...newPerson('Maya'), income: '2800' },
    { ...newPerson('Jon'), income: '1700' },
  ],
  ...over,
});

const codes = (state: RentState) => checkState(state).map(problem => `${problem.code}:${JSON.stringify(problem.target)}`);

/** A small deterministic generator, so a failing case can be rerun */
function random(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

describe('largestRemainder', () => {
  it('gives the whole shares the exact ones round to, when they add up', () => {
    expect(largestRemainder([1, 3])).toEqual([25, 75]);
    expect(largestRemainder([0.5, 0.25, 0.25])).toEqual([50, 25, 25]);
    expect(largestRemainder([50, 30, 20])).toEqual([50, 30, 20]);
  });

  it('gives the leftover points to the largest remainders: the flat is 39, 32 and 29', () => {
    // 38.596, 32.28 and 29.12: the floors are 38, 32 and 29, and the missing point goes to .596
    expect(largestRemainder([38.5964912, 32.2807018, 29.1228070])).toEqual([39, 32, 29]);
  });

  it('rounds the couple to 62 and 38', () => {
    expect(largestRemainder([2800, 1700])).toEqual([62, 38]);
  });

  it('takes a single person to the whole 100', () => {
    expect(largestRemainder([7])).toEqual([100]);
  });

  describe('ties', () => {
    it('go to the earlier person when the remainders are the same', () => {
      expect(largestRemainder([1, 1, 1])).toEqual([34, 33, 33]);
      expect(largestRemainder([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14]);
      expect(largestRemainder([1, 1, 1, 1, 1, 1])).toEqual([17, 17, 17, 17, 16, 16]);
    });

    it('are still ties when float noise says otherwise: 8.33, 58.33 and 33.33 all end in a third', () => {
      expect(largestRemainder([1, 7, 4])).toEqual([9, 58, 33]);
      expect(largestRemainder([7, 1, 4])).toEqual([59, 8, 33]);
      expect(largestRemainder([4, 7, 1])).toEqual([34, 58, 8]);
    });

    it('go to the earlier person among only the tied ones', () => {
      // 28.57, 28.57, 42.86: two points to give. The .86 takes one, then the first of the two .57s
      expect(largestRemainder([2, 2, 3])).toEqual([29, 28, 43]);
      // 16.67, 33.33, 50: one point to give, and the .67 is the largest remainder, not the first by being first
      expect(largestRemainder([1, 2, 3])).toEqual([17, 33, 50]);
      expect(largestRemainder([3, 2, 1])).toEqual([50, 33, 17]);
    });

    it('go to the earlier person whichever way the weights are ordered', () => {
      // Three equal weights and a smaller one: 28.57 three times and 14.29, with two points to give
      for (const weights of [[2, 2, 2, 1], [1, 2, 2, 2], [2, 1, 2, 2]]) {
        const parts = largestRemainder(weights);
        expect(sum(parts)).toBe(100);
        // The equal weights get 29, 29 and 28 in the order they come, never a later one first
        expect(weights.flatMap((w, i) => (w === 2 ? [parts[i]] : []))).toEqual([29, 29, 28]);
      }
    });
  });

  it('always totals exactly the total, for any 2 to 10 weights', () => {
    const next = random(20261021);
    for (let run = 0; run < 2000; run++) {
      const people = 2 + Math.floor(next() * 9);
      const weights = Array.from({ length: people }, () => Math.round((0.01 + next() * 5000) * 100) / 100);
      const parts = largestRemainder(weights);
      expect(sum(parts), `weights ${weights}`).toBe(100);
      expect(parts.every(part => Number.isInteger(part) && part >= 0)).toBe(true);
      // Each is within a point of its exact share
      const exact = weights.map(w => (100 * w) / sum(weights));
      parts.forEach((part, i) => expect(Math.abs(part - exact[i]), `weights ${weights}`).toBeLessThan(1 + 1e-9));
    }
  });

  it('totals 100 when the weights are all equal, for 2 to 10 people', () => {
    for (let people = 2; people <= 10; people++) {
      const parts = largestRemainder(Array.from({ length: people }, () => 1));
      expect(sum(parts)).toBe(100);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });

  it('can give someone a whole share of 0, which the total allows', () => {
    expect(largestRemainder([1, 1_000_000])).toEqual([0, 100]);
  });

  it('refuses weights it cannot share', () => {
    expect(() => largestRemainder([])).toThrow();
    expect(() => largestRemainder([0, 0])).toThrow();
    expect(() => largestRemainder([1, -1])).toThrow();
    expect(() => largestRemainder([1, Number.NaN])).toThrow();
    expect(() => largestRemainder([1, 1], 100.5)).toThrow();
  });
});

describe('the exact shares', () => {
  it('by room size are an equal part for the shared rooms and the rest by bedroom area', () => {
    const shares = exactShares(flat());
    // 60% × 16/38 + 40%/3, and so on
    expect(shares[0]).toBeCloseTo(38.5965, 3);
    expect(shares[1]).toBeCloseTo(32.2807, 3);
    expect(shares[2]).toBeCloseTo(29.1228, 3);
    expect(sum(shares)).toBeCloseTo(100, 9);
  });

  it('give everything to bedroom area at 0% shared, and an equal split at 100%', () => {
    expect(exactShares(flat({ shared: '0' })).map(share => Number(share.toFixed(4)))).toEqual([42.1053, 31.5789, 26.3158]);
    expect(exactShares(flat({ shared: '100' })).map(share => Number(share.toFixed(4)))).toEqual([33.3333, 33.3333, 33.3333]);
  });

  it('by income are each income over the total', () => {
    const shares = exactShares(couple());
    expect(shares[0]).toBeCloseTo(62.2222, 3);
    expect(shares[1]).toBeCloseTo(37.7778, 3);
  });

  it('do not depend on the unit, or on the other mode\'s figures', () => {
    const metres = exactShares(flat());
    expect(exactShares(flat({ unit: 'ft2' }))).toEqual(metres);
    const stray: PersonState[] = flat().people.map(person => ({ ...person, income: '999' }));
    expect(exactShares(flat({ people: stray }))).toEqual(metres);
  });

  it('are the same whatever the scale of the areas', () => {
    const feet = flat({ unit: 'ft2', people: flat().people.map(p => ({ ...p, area: String(Number(p.area) * 10.7639) })) });
    exactShares(feet).forEach((share, i) => expect(share).toBeCloseTo(exactShares(flat())[i], 9));
  });
});

describe('calculate, by room size', () => {
  it('gives guide 1\'s flat 39, 32 and 29, and £760.50, £624.00 and £565.50', () => {
    const { problems, result } = calculate(flat());
    expect(problems).toEqual([]);
    expect(result?.people.map(p => p.whole)).toEqual([39, 32, 29]);
    expect(result?.people.map(p => p.rentMinor)).toEqual([76050, 62400, 56550]);
    expect(result?.rentMinor).toBe(195000);
    expect(result?.billsMinor).toBe(0);
    expect(result?.people.map(p => p.billsMinor)).toEqual([0, 0, 0]);
  });

  it('gives the amounts the worked example computes from the same percentages', () => {
    const { result } = calculate(flat());
    const example: ExampleData = {
      currency: 'GBP',
      people: [
        { id: 'priya', name: 'Priya' },
        { id: 'tom', name: 'Tom' },
        { id: 'aisha', name: 'Aisha' },
      ],
      expenses: [
        { label: 'the rent', payer: 'priya', amount: 1950, split: { method: 'percent', shares: { priya: 39, tom: 32, aisha: 29 } } },
        { label: 'the energy bill', payer: 'tom', amount: 105, split: { method: 'equal' } },
        { label: 'the broadband', payer: 'aisha', amount: 36, split: { method: 'equal' } },
      ],
    };
    const computed = computeExample(example);
    expect(Object.values(computed.shares[0])).toEqual(result?.people.map(p => p.rentMinor));
    // Priya paid the landlord and is owed £1,142.50: the calculator's rent plus the equal bills
    expect(computed.balances.priya).toBe(114250);
  });

  it('ignores the unit and the other mode\'s fields', () => {
    const base = calculate(flat()).result;
    expect(calculate(flat({ unit: 'ft2', bills: 'not a number' })).result).toEqual(base);
  });

  it('shares an odd penny, and the amounts always add up to the rent', () => {
    const { result } = calculate(flat({ rent: '1000.01' }));
    expect(sum(result!.people.map(p => p.rentMinor))).toBe(100001);
  });

  it('adds up to the rent for any rent, shared share and bedrooms', () => {
    const next = random(7);
    for (let run = 0; run < 500; run++) {
      const people = 2 + Math.floor(next() * 9);
      const state = flat({
        rent: (Math.round(next() * 500000) / 100 + 0.01).toFixed(2),
        shared: String(Math.floor(next() * 101)),
        people: Array.from({ length: people }, (_x, i) => ({ ...newPerson(`P${i}`), area: String(Math.round((1 + next() * 40) * 10) / 10) })),
      });
      const { problems, result } = calculate(state);
      expect(problems).toEqual([]);
      expect(sum(result!.people.map(p => p.whole)), JSON.stringify(state)).toBe(100);
      expect(sum(result!.people.map(p => p.rentMinor)), JSON.stringify(state)).toBe(result!.rentMinor);
    }
  });

  it('works in a currency with no minor unit', () => {
    const { result } = calculate(flat({ currency: 'JPY', rent: '195000' }));
    expect(result?.people.map(p => p.rentMinor)).toEqual([76050, 62400, 56550]);
    expect(checkState(flat({ currency: 'JPY', rent: '195000.5' })).map(p => p.code)).toEqual(['amountDecimals']);
  });

  it('applies a person\'s whole share of 0%', () => {
    // At 0% for the shared rooms, a 0.001 m² room rounds down to nothing
    const state = flat({ shared: '0', people: [{ ...newPerson('A'), area: '0.001' }, { ...newPerson('B'), area: '100' }] });
    const { result } = calculate(state);
    expect(result?.people.map(p => p.whole)).toEqual([0, 100]);
    expect(result?.people.map(p => p.rentMinor)).toEqual([0, 195000]);
  });
});

describe('calculate, by income', () => {
  it('gives guide 4\'s couple 62 and 38, on the rent and on the bills', () => {
    const { problems, result } = calculate(couple());
    expect(problems).toEqual([]);
    expect(result?.people.map(p => p.whole)).toEqual([62, 38]);
    expect(result?.people.map(p => p.rentMinor)).toEqual([86800, 53200]);
    expect(result?.people.map(p => p.billsMinor)).toEqual([11160, 6840]);
    expect(result?.billsMinor).toBe(18000);
  });

  it('gives the amounts the worked example computes from the same percentages', () => {
    const { result } = calculate(couple());
    const split = { method: 'percent' as const, shares: { maya: 62, jon: 38 } };
    const computed = computeExample({
      currency: 'GBP',
      people: [
        { id: 'maya', name: 'Maya' },
        { id: 'jon', name: 'Jon' },
      ],
      expenses: [
        { label: 'rent', payer: 'maya', amount: 1400, split },
        { label: 'bills', payer: 'jon', amount: 180, split },
      ],
    });
    expect(Object.values(computed.shares[0])).toEqual(result?.people.map(p => p.rentMinor));
    expect(Object.values(computed.shares[1])).toEqual(result?.people.map(p => p.billsMinor));
  });

  it('has no bills when the field is blank or zero', () => {
    for (const bills of ['', '  ', '0', '0.00']) {
      const { problems, result } = calculate(couple({ bills }));
      expect(problems).toEqual([]);
      expect(result?.billsMinor).toBe(0);
      expect(result?.people.map(p => p.billsMinor)).toEqual([0, 0]);
    }
  });

  it('does not read the shared rooms\' share, which only room size uses', () => {
    expect(checkState(couple({ shared: 'rubbish' }))).toEqual([]);
  });

  it('shares a bill like the rent: the pennies add up', () => {
    const { result } = calculate(couple({ rent: '1400.01', bills: '180.01' }));
    expect(sum(result!.people.map(p => p.rentMinor))).toBe(140001);
    expect(sum(result!.people.map(p => p.billsMinor))).toBe(18001);
  });

  it('takes ten people and totals 100', () => {
    const people = Array.from({ length: MAX_RENT_PEOPLE }, (_x, i) => ({ ...newPerson(`P${i + 1}`), income: String(1500 + i * 137) }));
    const { result } = calculate(couple({ people }));
    expect(result?.people).toHaveLength(10);
    expect(sum(result!.people.map(p => p.whole))).toBe(100);
    expect(sum(result!.people.map(p => p.rentMinor))).toBe(140000);
  });
});

describe('the limits', () => {
  it('takes the rent up to the cap, and no more', () => {
    expect(codes(flat({ rent: String(MAX_EXPENSE_AMOUNT) }))).toEqual([]);
    expect(codes(flat({ rent: '1000000' }))).toEqual(['amountMax:{"kind":"rent"}']);
  });

  it('says what is wrong with the rent: none, not a number, zero, too many decimals', () => {
    expect(codes(flat({ rent: '' }))).toEqual(['amountMissing:{"kind":"rent"}']);
    expect(codes(flat({ rent: 'lots' }))).toEqual(['amountInvalid:{"kind":"rent"}']);
    expect(codes(flat({ rent: '-5' }))).toEqual(['amountInvalid:{"kind":"rent"}']);
    expect(codes(flat({ rent: '0' }))).toEqual(['amountPositive:{"kind":"rent"}']);
    expect(checkState(flat({ rent: '10.005' }))[0]).toMatchObject({ code: 'amountDecimals', places: 2 });
    // A comma is a decimal mark, as in the split-bill calculator
    expect(codes(flat({ rent: '1950,50' }))).toEqual([]);
    expect(codes(flat({ rent: '1,950.00' }))).toEqual(['amountInvalid:{"kind":"rent"}']);
  });

  it('checks the bills only by income, and lets them be blank', () => {
    expect(codes(couple({ bills: 'lots' }))).toEqual(['amountInvalid:{"kind":"bills"}']);
    expect(codes(couple({ bills: '1000000' }))).toEqual(['amountMax:{"kind":"bills"}']);
    expect(codes(couple({ bills: '10.005' }))).toEqual(['amountDecimals:{"kind":"bills"}']);
    expect(codes(flat({ bills: 'lots' }))).toEqual([]);
  });

  it('takes a share for the shared rooms from 0 to 100', () => {
    for (const shared of ['0', '40', '12.5', '100']) expect(codes(flat({ shared }))).toEqual([]);
    for (const shared of ['101', '', 'lots', '-1', '100.01']) {
      expect(codes(flat({ shared })), shared).toEqual(['sharedRange:{"kind":"shared"}']);
    }
  });

  it('takes areas and incomes above zero and up to a ceiling', () => {
    expect(codes(flat({ people: [{ ...newPerson('A'), area: String(MAX_AREA) }, { ...newPerson('B'), area: '1' }] }))).toEqual([]);
    expect(codes(flat({ people: [{ ...newPerson('A'), area: String(MAX_AREA + 1) }, { ...newPerson('B'), area: '1' }] }))).toEqual([
      'valueMax:{"kind":"value","person":0}',
    ]);
    expect(codes(couple({ people: [{ ...newPerson('A'), income: String(MAX_INCOME) }, { ...newPerson('B'), income: '1' }] }))).toEqual([]);
    expect(codes(couple({ people: [{ ...newPerson('A'), income: String(MAX_INCOME + 1) }, { ...newPerson('B'), income: '1' }] }))).toEqual([
      'valueMax:{"kind":"value","person":0}',
    ]);
    for (const figure of ['', '0', 'big', '-3']) {
      const people = [{ ...newPerson('A'), area: figure }, { ...newPerson('B'), area: '12' }];
      expect(codes(flat({ people })), figure).toEqual(['valueInvalid:{"kind":"value","person":0}']);
    }
  });

  it('reads the figure of the mode it is in', () => {
    // By income, a bedroom area is not asked for; by room size, an income is not
    const people = flat().people.map(person => ({ ...person, income: '' }));
    expect(codes(flat({ people }))).toEqual([]);
    expect(codes(couple({ people: couple().people.map(person => ({ ...person, area: '' })) }))).toEqual([]);
    expect(codes(flat({ mode: 'income' }))).toEqual([
      'valueInvalid:{"kind":"value","person":0}',
      'valueInvalid:{"kind":"value","person":1}',
      'valueInvalid:{"kind":"value","person":2}',
    ]);
  });

  it('wants every person named, and named differently', () => {
    expect(codes(flat({ people: [newPerson(' '), { ...newPerson('B'), area: '1' }] })).sort()).toEqual([
      'nameMissing:{"kind":"name","person":0}',
      'valueInvalid:{"kind":"value","person":0}',
    ]);
    const twins = [{ ...newPerson('Ana'), area: '10' }, { ...newPerson(' ana '), area: '12' }];
    expect(checkState(flat({ people: twins }))).toEqual([
      { code: 'nameDuplicate', target: { kind: 'name', person: 1 }, name: 'ana' },
    ]);
  });

  it('gives no result while anything is wrong', () => {
    expect(calculate(flat({ rent: '' })).result).toBeUndefined();
    expect(calculate(flat({ rent: '' })).problems).not.toEqual([]);
  });

  it('throws for a currency Intl does not know, which the page never offers', () => {
    expect(() => checkState(flat({ currency: 'XXX1' }))).toThrow();
  });
});

describe('the fresh form', () => {
  it('opens by room size, with 40% for the shared rooms, two people and nothing typed', () => {
    const state = freshState('GBP', ['Ana', 'Ben']);
    expect(state).toMatchObject({ mode: 'room', currency: 'GBP', rent: '', bills: '', shared: DEFAULT_SHARED, unit: 'm2' });
    expect(state.people).toEqual([newPerson('Ana'), newPerson('Ben')]);
    expect(calculate(state).result).toBeUndefined();
  });
});

// The amounts are `apportion` over the whole percentages: the same call, so they cannot drift
describe('the amounts', () => {
  it('are apportion of the rent over the whole percentages', () => {
    const { result } = calculate(flat({ rent: '1234.57' }));
    expect(result?.people.map(p => p.rentMinor)).toEqual(apportion(123457, result!.people.map(p => p.whole)));
  });
});

describe('amounts too small for the currency', () => {
  it('refuses a rent with digits past the currency', () => {
    expect(codes(flat({ rent: '0.000000001' }))).toEqual(['amountDecimals:{"kind":"rent"}']);
    expect(codes(flat({ rent: '1950.001' }))).toEqual(['amountDecimals:{"kind":"rent"}']);
    expect(codes(flat({ rent: '1950.50' }))).toEqual([]);
  });

  it('refuses tiny bills too', () => {
    expect(codes(couple({ bills: '0.000000001' }))).toEqual(['amountDecimals:{"kind":"bills"}']);
  });
});
