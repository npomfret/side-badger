import { describe, expect, it } from 'vitest';
import { MAX_EXPENSE_AMOUNT, apportion, computeExample, simplifyBalances } from '@/lib/settle';
import {
  MAX_PEOPLE,
  calculate,
  checkState,
  newExpense,
  parseNumber,
  pickName,
  splitList,
  toExample,
  type CalcState,
  type ExpenseState,
  type Method,
} from './split-engine';

const expense = (over: Partial<ExpenseState> & { people?: number } = {}): ExpenseState => {
  const { people = 3, ...rest } = over;
  return { ...newExpense('Dinner', people), amount: '90', ...rest };
};
const state = (over: Partial<CalcState> = {}): CalcState => ({
  currency: 'GBP',
  people: ['Ana', 'Ben', 'Cara'],
  expenses: [expense()],
  ...over,
});
const codes = (s: CalcState) => checkState(s).map(problem => problem.code);

describe('parseNumber', () => {
  it.each([
    ['12', 12],
    ['12.50', 12.5],
    ['12,5', 12.5],
    ['.5', 0.5],
    ['12.', 12],
    [' 7 ', 7],
    ['0', 0],
  ])('reads %j as %d', (text, value) => {
    expect(parseNumber(text)).toBe(value);
  });

  it.each(['', ' ', 'abc', '1e3', '-5', '+5', '1 000', '1,000.00', '1.2.3', '1,2,3', '0x10', 'Infinity', '٣'])(
    'refuses %j',
    text => {
      expect(parseNumber(text)).toBeUndefined();
    }
  );
});

describe('mapping the form to the computation', () => {
  it('builds the example settle.ts computes: three people, two equal expenses', () => {
    const s = state({
      expenses: [expense({ label: 'Dinner', amount: '90', payer: 0 }), expense({ label: 'Taxi', amount: '30', payer: 1 })],
    });
    const outcome = calculate(s);
    expect(outcome.problems).toEqual([]);
    expect(outcome.result).toEqual({
      currency: 'GBP',
      // Ana paid 90 and owes 40; Ben paid 30 and owes 40; Cara owes 40
      balances: [
        { person: 0, minor: 5000 },
        { person: 1, minor: -1000 },
        { person: 2, minor: -4000 },
      ],
      payments: [
        { from: 2, to: 0, minor: 4000 },
        { from: 1, to: 0, minor: 1000 },
      ],
      totalMinor: 12000,
    });
  });

  it('leaves `shares` out of an equal split among everyone and lists the people otherwise', () => {
    const data = toExample(
      state({
        expenses: [expense(), expense({ include: [true, false, true] })],
      })
    );
    expect(data.expenses[0].split).toEqual({ method: 'equal' });
    expect(data.expenses[1].split).toEqual({ method: 'equal', shares: { p0: 1, p2: 1 } });
    expect(data.people).toEqual([
      { id: 'p0', name: 'Ana' },
      { id: 'p1', name: 'Ben' },
      { id: 'p2', name: 'Cara' },
    ]);
  });

  it.each([
    ['exact', ['40', '30', '20'], { p0: 40, p1: 30, p2: 20 }],
    ['percent', ['50', '30', '20'], { p0: 50, p1: 30, p2: 20 }],
  ] as [Method, string[], Record<string, number>][])('maps %s shares by person', (method, values, shares) => {
    const data = toExample(state({ expenses: [expense({ amount: '90', method, values })] }));
    expect(data.expenses[0].split).toEqual({ method, shares });
  });

  it('takes only the chosen people from an exact split, and ignores what was typed for the others', () => {
    const s = state({
      expenses: [expense({ amount: '60', method: 'exact', include: [true, false, true], values: ['25', '999', '35'] })],
    });
    expect(toExample(s).expenses[0].split).toEqual({ method: 'exact', shares: { p0: 25, p2: 35 } });
    // Ana paid 60 and owes 25, Ben is out of it, Cara owes 35
    expect(calculate(s).result?.balances.map(b => b.minor)).toEqual([3500, 0, -3500]);
  });

  it('gives the same balances as computing the example directly', () => {
    const s = state({
      expenses: [
        expense({ amount: '84.50', payer: 2 }),
        expense({ amount: '120', payer: 0, method: 'percent', values: ['50', '30', '20'] }),
        expense({ amount: '45', payer: 1, method: 'exact', values: ['10', '20', '15'] }),
      ],
    });
    const direct = computeExample(toExample(s));
    const { result } = calculate(s);
    expect(result?.balances.map(b => b.minor)).toEqual(Object.values(direct.balances));
    expect(result?.payments.length).toBe(direct.transfers.length);
    expect(result?.totalMinor).toBe(direct.totalMinor);
  });

  it('gives an equal split of an odd amount to the first people, so the shares still add up', () => {
    const { result } = calculate(state({ expenses: [expense({ amount: '10', payer: 0 })] }));
    // 10.00 / 3: Ana's share 3.34, then 3.33 and 3.33; Ana paid it all
    expect(result?.balances.map(b => b.minor)).toEqual([666, -333, -333]);
  });

  it('uses the currency\'s own minor unit', () => {
    const yen = calculate(state({ currency: 'JPY', expenses: [expense({ amount: '3000', payer: 0 })] }));
    expect(yen.result?.balances.map(b => b.minor)).toEqual([2000, -1000, -1000]);
    expect(yen.result?.currency).toBe('JPY');
  });

  it('shows everyone square when the payments are not needed', () => {
    const { result } = calculate(
      state({ expenses: [expense({ amount: '30', payer: 0 }), expense({ amount: '30', payer: 1 }), expense({ amount: '30', payer: 2 })] })
    );
    expect(result?.payments).toEqual([]);
    expect(result?.balances.every(b => b.minor === 0)).toBe(true);
  });

  it('computes nothing for no expenses, and says nothing is wrong', () => {
    expect(calculate(state({ expenses: [] }))).toEqual({ problems: [] });
  });
});

describe('twenty people', () => {
  const people = Array.from({ length: MAX_PEOPLE }, (_, n) => `Person ${n + 1}`);

  it('splits one expense among all twenty: everyone but the payer pays once', () => {
    const s: CalcState = { currency: 'EUR', people, expenses: [{ ...newExpense('Villa', 20), amount: '2000' }] };
    const { result, problems } = calculate(s);
    expect(problems).toEqual([]);
    expect(result?.balances).toHaveLength(20);
    expect(result?.balances[0].minor).toBe(190000);
    expect(result?.balances.slice(1).every(b => b.minor === -10000)).toBe(true);
    expect(result?.payments).toHaveLength(19);
    expect(result?.payments.every(p => p.to === 0 && p.minor === 10000)).toBe(true);
  });

  it('keeps the payments short when everyone paid something', () => {
    const s: CalcState = {
      currency: 'GBP',
      people,
      expenses: people.map((_, payer) => ({ ...newExpense(`Round ${payer + 1}`, 20, payer), amount: String(10 + payer) })),
    };
    const { result } = calculate(s);
    expect(result?.balances.reduce((sum, b) => sum + b.minor, 0)).toBe(0);
    const owing = result!.balances.filter(b => b.minor !== 0).length;
    expect(result!.payments.length).toBeLessThanOrEqual(owing - 1);
    // Settling the balances with the payments leaves everyone on zero
    const left = Object.fromEntries(result!.balances.map(b => [b.person, b.minor]));
    for (const p of result!.payments) {
      left[p.from] += p.minor;
      left[p.to] -= p.minor;
    }
    expect(Object.values(left).every(minor => minor === 0)).toBe(true);
  });
});

describe('the amount', () => {
  const amountCodes = (amount: string, currency = 'GBP') => codes(state({ currency, expenses: [expense({ amount })] }));

  it('accepts the cap and anything below it', () => {
    expect(amountCodes(String(MAX_EXPENSE_AMOUNT))).toEqual([]);
    expect(amountCodes('0.01')).toEqual([]);
  });

  it('refuses an amount over the cap', () => {
    expect(amountCodes('1000000')).toEqual(['amountMax']);
    expect(amountCodes('999999,99')).toEqual([]);
    expect(amountCodes('1000000000')).toEqual(['amountMax']);
  });

  it('refuses zero, nothing and not-a-number', () => {
    expect(amountCodes('0')).toEqual(['amountPositive']);
    expect(amountCodes('0.00')).toEqual(['amountPositive']);
    expect(amountCodes('')).toEqual(['amountMissing']);
    expect(amountCodes('  ')).toEqual(['amountMissing']);
    expect(amountCodes('twelve')).toEqual(['amountInvalid']);
    expect(amountCodes('-5')).toEqual(['amountInvalid']);
  });

  it('refuses more decimals than the currency has, and says how many it takes', () => {
    expect(amountCodes('10.005')).toEqual(['amountDecimals']);
    expect(amountCodes('100.5', 'JPY')).toEqual(['amountDecimals']);
    expect(amountCodes('100', 'JPY')).toEqual([]);
    expect(amountCodes('1.234', 'KWD')).toEqual([]);
    expect(checkState(state({ currency: 'JPY', expenses: [expense({ amount: '100.5' })] }))[0]).toMatchObject({
      code: 'amountDecimals',
      places: 0,
      target: { kind: 'expense', expense: 0, field: 'amount' },
    });
  });

  it('shows no result while the amount is wrong', () => {
    const outcome = calculate(state({ expenses: [expense({ amount: '1000000' })] }));
    expect(outcome.result).toBeUndefined();
    expect(outcome.problems).toHaveLength(1);
  });
});

describe('exact amounts', () => {
  const exact = (values: string[], amount = '90', include = [true, true, true]) =>
    state({ expenses: [expense({ amount, method: 'exact', values, include })] });

  it('accepts amounts that add up to the total', () => {
    expect(checkState(exact(['40', '30', '20']))).toEqual([]);
    // Ana paid 90 and owes 40.50
    expect(calculate(exact(['40.50', '30', '19.50'])).result?.balances.map(b => b.minor)).toEqual([4950, -3000, -1950]);
  });

  it('says so when the amounts do not add up, with both sums', () => {
    const [problem, ...rest] = checkState(exact(['40', '30', '10']));
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ code: 'exactTotal', sum: 8000, total: 9000, target: { kind: 'expense', expense: 0, field: 'shares' } });
    expect(calculate(exact(['40', '30', '10'])).result).toBeUndefined();
  });

  it('adds up in the currency\'s minor unit, not in floating point', () => {
    // 0.1 + 0.2 is not 0.3 in floating point
    expect(checkState(exact(['0.10', '0.20', ''], '0.30', [true, true, false]))).toEqual([]);
    expect(checkState(exact(['33.33', '33.33', '33.34'], '100'))).toEqual([]);
  });

  it('asks for a figure for each chosen person, more than zero and in whole minor units', () => {
    expect(codes(exact(['40', '', '50']))).toEqual(['shareInvalid']);
    expect(codes(exact(['40', '0', '50']))).toEqual(['sharePositive']);
    expect(codes(exact(['40', '40.005', '10']))).toEqual(['shareDecimals']);
    const [problem] = checkState(exact(['40', 'x', '50']));
    expect(problem).toMatchObject({ code: 'shareInvalid', name: 'Ben', target: { kind: 'share', expense: 0, person: 1 } });
  });

  it('does not ask about the total while a figure is wrong or the amount is', () => {
    expect(codes(exact(['40', '', '10']))).toEqual(['shareInvalid']);
    expect(codes(exact(['40', '30', '20'], 'lots'))).toEqual(['amountInvalid']);
  });
});

describe('percentages', () => {
  const percent = (values: string[], include = [true, true, true]) =>
    state({ expenses: [expense({ amount: '120', method: 'percent', values, include })] });

  it('accepts percentages that make 100', () => {
    expect(checkState(percent(['50', '30', '20']))).toEqual([]);
    expect(checkState(percent(['33.3', '33.3', '33.4']))).toEqual([]);
    expect(checkState(percent(['70', '30', ''], [true, true, false]))).toEqual([]);
  });

  it('says so when they do not, with the sum', () => {
    expect(checkState(percent(['50', '30', '10']))).toEqual([
      { code: 'percentTotal', target: { kind: 'expense', expense: 0, field: 'shares' }, sum: 90 },
    ]);
    expect(codes(percent(['50', '50', '50']))).toEqual(['percentTotal']);
    expect(calculate(percent(['50', '30', '10'])).result).toBeUndefined();
  });

  it('allows a percentage that is not a whole number and apportions the amount exactly', () => {
    const { result } = calculate(percent(['33.33', '33.33', '33.34']));
    expect(result?.balances.reduce((sum, b) => sum + b.minor, 0)).toBe(0);
    expect(result?.totalMinor).toBe(12000);
  });
});

describe('people, payer and participants', () => {
  it('asks for a name, and refuses two of the same (ignoring case and spaces)', () => {
    expect(checkState(state({ people: ['Ana', ' ', 'Cara'] }))).toEqual([{ code: 'nameMissing', target: { kind: 'person', person: 1 } }]);
    expect(checkState(state({ people: ['Ana', 'ana ', 'Cara'] }))).toEqual([
      { code: 'nameDuplicate', target: { kind: 'person', person: 1 }, name: 'ana' },
    ]);
  });

  it('asks who paid when nobody is chosen', () => {
    expect(checkState(state({ expenses: [expense({ payer: -1 })] }))).toEqual([
      { code: 'payerMissing', target: { kind: 'expense', expense: 0, field: 'payer' } },
    ]);
  });

  it('asks who shares an expense when nobody does', () => {
    expect(codes(state({ expenses: [expense({ include: [false, false, false] })] }))).toEqual(['nobody']);
    expect(codes(state({ expenses: [expense({ method: 'exact', include: [false, false, false] })] }))).toEqual(['nobody']);
  });

  it('reports every problem across several expenses, each against its own expense', () => {
    const found = checkState(state({ expenses: [expense({ amount: '' }), expense({ payer: -1 }), expense({ amount: '1e9' })] }));
    expect(found.map(p => [p.code, p.target])).toEqual([
      ['amountMissing', { kind: 'expense', expense: 0, field: 'amount' }],
      ['payerMissing', { kind: 'expense', expense: 1, field: 'payer' }],
      ['amountInvalid', { kind: 'expense', expense: 2, field: 'amount' }],
    ]);
  });
});

describe('calculate never throws', () => {
  // A small deterministic generator, so a failure can be replayed
  const random = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('returns a result or problems, and settles every balance, for 600 random forms', () => {
    const next = random(20261021);
    const pick = <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)];
    const goodAmounts = ['10', '12.5', '33,33', '84.50', '120', '250'];
    const anyAmounts = [...goodAmounts, '', '0', 'x', '1000000', '7.777'];
    const anyShares = ['', '0', '10', '25', '33.33', '50', 'x', '12.345'];
    let solved = 0;

    // Exact amounts or percentages that add up, when the amount is a number
    const consistent = (method: Method, amount: string, include: boolean[]): string[] => {
      const chosen = include.map((on, person) => (on ? person : -1)).filter(person => person >= 0);
      const total = method === 'percent' ? 100 : Math.round((parseNumber(amount) ?? 0) * 100);
      const parts = chosen.length ? apportion(total, chosen.map(() => 1)) : [];
      const values = include.map(() => '');
      chosen.forEach((person, n) => (values[person] = method === 'percent' ? String(parts[n]) : (parts[n] / 100).toFixed(2)));
      return values;
    };

    for (let run = 0; run < 600; run++) {
      const count = 2 + Math.floor(next() * 5);
      const s: CalcState = {
        currency: pick(['GBP', 'EUR', 'GBP', 'JPY', 'KWD']),
        people: Array.from({ length: count }, (_, n) => (next() < 0.03 ? '' : `P${n}`)),
        expenses: Array.from({ length: Math.floor(next() * 4) }, () => {
          const amount = pick(next() < 0.8 ? goodAmounts : anyAmounts);
          const method = pick(['equal', 'equal', 'exact', 'percent'] as const);
          const include = Array.from({ length: count }, () => next() < 0.85);
          return {
            label: '',
            payer: next() < 0.95 ? Math.floor(next() * count) : -1,
            amount,
            method,
            include,
            values: next() < 0.8 ? consistent(method, amount, include) : include.map(() => pick(anyShares)),
          };
        }),
      };
      const outcome = calculate(s);
      expect(outcome.problems.map(p => p.code)).not.toContain('unexpected');
      if (!outcome.result) continue;
      solved++;
      const { balances, payments } = outcome.result;
      expect(balances.reduce((sum, b) => sum + b.minor, 0)).toBe(0);
      const left = Object.fromEntries(balances.map(b => [b.person, b.minor]));
      for (const p of payments) {
        expect(p.minor).toBeGreaterThan(0);
        left[p.from] += p.minor;
        left[p.to] -= p.minor;
      }
      expect(Object.values(left).every(minor => minor === 0)).toBe(true);
      expect(payments.length).toBe(simplifyBalances(Object.fromEntries(balances.map(b => [`p${b.person}`, b.minor]))).length);
    }
    // The generator should reach valid forms as well as invalid ones
    expect(solved).toBeGreaterThan(60);
  });
});

describe('names for new rows', () => {
  const fallback = (n: number) => `Person ${n}`;

  it('takes the first name nobody has', () => {
    expect(pickName(['Ana', 'Ben', 'Cara'], [], fallback)).toBe('Ana');
    expect(pickName(['Ana', 'Ben', 'Cara'], ['Ana', 'Cara'], fallback)).toBe('Ben');
    expect(pickName(['Ana', 'Ben'], ['ben ', 'ANA'], fallback)).toBe('Person 3');
  });

  it('falls back to a numbered name that is not taken either', () => {
    expect(pickName([], ['A', 'B'], fallback)).toBe('Person 3');
    expect(pickName([], ['A', 'Person 2'], fallback)).toBe('Person 3');
  });

  it('splits a translated list, whatever the comma, and drops blanks and repeats', () => {
    expect(splitList('Ana, Ben,, Cara , Ben')).toEqual(['Ana', 'Ben', 'Cara']);
    expect(splitList('أنا، بن، سارة')).toEqual(['أنا', 'بن', 'سارة']);
    expect(splitList('')).toEqual([]);
  });
});

describe('amounts too small for the currency', () => {
  const problemCodes = (amount: string, currency = 'GBP') =>
    codes(state({ currency, expenses: [expense({ amount })] }));

  it('refuses digits past the currency, read from the text', () => {
    expect(problemCodes('0.000000001')).toEqual(['amountDecimals']);
    expect(problemCodes('10.001')).toEqual(['amountDecimals']);
    expect(problemCodes('10.50')).toEqual([]);
    expect(problemCodes('10.500')).toEqual([]);
    expect(problemCodes('5.5', 'JPY')).toEqual(['amountDecimals']);
  });

  it('refuses tiny exact shares', () => {
    const exact = expense({ amount: '10', method: 'exact', include: [true, true, false], values: ['0.000000001', '10', ''] });
    expect(codes(state({ expenses: [exact] }))).toContain('shareDecimals');
  });
});
