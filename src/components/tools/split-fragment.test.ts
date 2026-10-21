import { describe, expect, it } from 'vitest';
import { CURRENCIES } from './currencies';
import { MAX_PEOPLE, newExpense, type CalcState, type ExpenseState } from './split-engine';
import { HASH_PREFIX, MAX_PAYLOAD_LENGTH, decodeState, encodeState, stateFromHash } from './split-fragment';

const currencies: readonly string[] = CURRENCIES;

const trip: CalcState = {
  currency: 'EUR',
  people: ['Ana', 'Ben', 'Cara'],
  expenses: [
    { ...newExpense('Dinner', 3), amount: '90' },
    {
      label: 'Villa',
      payer: 1,
      amount: '300,50',
      method: 'exact',
      include: [true, false, true],
      values: ['100.25', '', '200.25'],
    },
    {
      label: 'Taxi',
      payer: 2,
      amount: '30',
      method: 'percent',
      include: [true, true, false],
      values: ['60', '40', ''],
    },
    { label: '', payer: -1, amount: '', method: 'equal', include: [false, false, false], values: ['', '', ''] },
  ],
};

/** A payload for any JSON value, as the codec writes them */
const payloadOf = (value: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const wire = (over: Record<string, unknown> = {}) => ({
  v: 1,
  c: 'GBP',
  p: ['Ana', 'Ben'],
  e: [['Dinner', 0, '90', 'e', [0, 1]]],
  ...over,
});

const decode = (value: unknown) => decodeState(payloadOf(value), currencies);

describe('the share link', () => {
  describe('round trip', () => {
    it('gives back the state it was made from', () => {
      const payload = encodeState(trip);
      expect(payload).not.toBeNull();
      expect(decodeState(payload!, currencies)).toEqual(trip);
    });

    it('is URL-safe base64 with no padding', () => {
      expect(encodeState(trip)).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('keeps mistakes as typed, so a link opens on the same screen', () => {
      const wrong: CalcState = {
        currency: 'GBP',
        people: ['', 'Ana'],
        expenses: [{ ...newExpense('', 2), amount: 'twelve pounds', payer: -1 }],
      };
      expect(decodeState(encodeState(wrong)!, currencies)).toEqual(wrong);
    });

    it('keeps names in any script, with emoji', () => {
      const names: CalcState = { ...trip, people: ['أنا', '日本語', 'Zoë 🦡'], expenses: [] };
      expect(decodeState(encodeState(names)!, currencies)).toEqual(names);
    });

    it('drops what was typed for people who are not in the split', () => {
      const typed: ExpenseState = { ...trip.expenses[1], values: ['100.25', 'left over', '200.25'] };
      const back = decodeState(encodeState({ ...trip, expenses: [typed] })!, currencies);
      expect(back?.expenses[0].values).toEqual(['100.25', '', '200.25']);
    });

    it('round-trips twenty people and a full set of expenses', () => {
      const big: CalcState = {
        currency: 'USD',
        people: Array.from({ length: MAX_PEOPLE }, (_, n) => `P${n}`),
        expenses: Array.from({ length: 12 }, (_, n) => ({ ...newExpense(`E${n}`, MAX_PEOPLE, n), amount: '10' })),
      };
      expect(decodeState(encodeState(big)!, currencies)).toEqual(big);
    });
  });

  describe('in the location hash', () => {
    it('reads #c= and nothing else', () => {
      const payload = encodeState(trip)!;
      expect(stateFromHash(`${HASH_PREFIX}${payload}`, currencies)).toEqual(trip);
      for (const hash of ['', '#', '#main-content', `#d=${payload}`, `c=${payload}`, `#C=${payload}`, '#c=']) {
        expect(stateFromHash(hash, currencies), hash).toBeNull();
      }
    });
  });

  describe('malformed input is ignored', () => {
    it.each([
      ['empty', ''],
      ['not base64url', 'not base64!'],
      ['standard base64 characters', 'ab+/'],
      ['padding', 'YQ=='],
      ['a length no base64 has', 'abcde'],
      ['spaces', 'ab cd'],
      ['percent-encoding', '%7B%7D'],
    ])('%s', (_name, payload) => {
      expect(decodeState(payload, currencies)).toBeNull();
    });

    it.each([
      ['text that is not JSON', 'hello'],
      ['JSON that stops short', '{"v":1,'],
      ['null', 'null'],
      ['a number', '5'],
      ['a string', '"x"'],
      ['an array', '[]'],
      ['an empty object', '{}'],
    ])('JSON of the wrong kind: %s', (_name, json) => {
      const payload = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(decodeState(payload, currencies)).toBeNull();
    });

    it('bytes that are not UTF-8', () => {
      const payload = btoa(String.fromCharCode(0x7b, 0xff, 0xfe, 0x7d)).replace(/=+$/, '');
      expect(decodeState(payload, currencies)).toBeNull();
    });

    it('never throws, whatever it is given', () => {
      let seed = 7;
      const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=+/ %{}[]"';
      for (let run = 0; run < 300; run++) {
        const payload = Array.from({ length: Math.floor(next() * 200) }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
        expect(() => decodeState(payload, currencies)).not.toThrow();
        expect(decodeState(payload, currencies)).toBeNull();
      }
      // Valid JSON of random shapes
      for (const value of [1, 'a', [1, 2], { v: 1 }, { v: 1, c: 1, p: 1, e: 1 }, wire({ e: 'x' }), wire({ p: [1, 2] })]) {
        expect(() => decode(value)).not.toThrow();
      }
    });
  });

  describe('oversize input is ignored', () => {
    it('refuses a payload over the cap before decoding it', () => {
      expect(MAX_PAYLOAD_LENGTH).toBe(4096);
      const valid = encodeState(trip)!;
      expect(decodeState(valid + 'A'.repeat(MAX_PAYLOAD_LENGTH), currencies)).toBeNull();
      expect(decodeState('A'.repeat(MAX_PAYLOAD_LENGTH + 1), currencies)).toBeNull();
    });

    it('accepts twenty names of the longest length', () => {
      const people = Array.from({ length: MAX_PEOPLE }, (_, n) => `${n}`.padEnd(40, 'x'));
      const roomy: CalcState = { currency: 'GBP', people, expenses: [] };
      const payload = encodeState(roomy)!;
      expect(payload.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
      expect(decodeState(payload, currencies)).toEqual(roomy);
    });

    it('writes no link for a state that is too big for one', () => {
      const people = Array.from({ length: MAX_PEOPLE }, (_, n) => `${n}`.padEnd(40, 'x'));
      const huge: CalcState = {
        currency: 'GBP',
        people,
        expenses: Array.from({ length: 40 }, (_, n) => ({ ...newExpense(`Expense number ${n}`.padEnd(60, 'y'), MAX_PEOPLE), amount: '12.34' })),
      };
      expect(encodeState(huge)).toBeNull();
    });
  });

  describe('unknown or out-of-range fields are ignored', () => {
    it('accepts the plain wire format (the other cases are this with one thing wrong)', () => {
      expect(decode(wire())).toEqual({
        currency: 'GBP',
        people: ['Ana', 'Ben'],
        expenses: [{ label: 'Dinner', payer: 0, amount: '90', method: 'equal', include: [true, true], values: ['', ''] }],
      });
    });

    it.each([
      ['an unknown top-level field', wire({ x: 1 })],
      ['a prototype field', JSON.parse('{"__proto__":{"a":1},"v":1,"c":"GBP","p":["Ana","Ben"],"e":[]}')],
      ['a missing field', { v: 1, c: 'GBP', p: ['Ana', 'Ben'] }],
      ['another version', wire({ v: 2 })],
      ['a version as text', wire({ v: '1' })],
      ['a currency the page does not offer', wire({ c: 'XXX' })],
      ['a currency in lower case', wire({ c: 'gbp' })],
      ['a currency that is not text', wire({ c: 5 })],
      ['one person', wire({ p: ['Ana'] })],
      ['twenty-one people', wire({ p: Array.from({ length: 21 }, (_, n) => `P${n}`) })],
      ['people that are not text', wire({ p: ['Ana', 7] })],
      ['a name over 40 characters', wire({ p: ['Ana', 'x'.repeat(41)] })],
      ['a name with a control character', wire({ p: ['Ana', 'Be\nn'] })],
      ['expenses that are not a list', wire({ e: {} })],
      ['over 100 expenses', wire({ e: Array.from({ length: 101 }, () => ['E', 0, '1', 'e', [0]]) })],
      ['an expense with four fields', wire({ e: [['E', 0, '1', 'e']] })],
      ['an expense with six fields', wire({ e: [['E', 0, '1', 'e', [0], 'extra']] })],
      ['an expense that is an object', wire({ e: [{ l: 'E' }] })],
      ['a label over 60 characters', wire({ e: [['x'.repeat(61), 0, '1', 'e', [0]]] })],
      ['an amount over 14 characters', wire({ e: [['E', 0, '1'.repeat(15), 'e', [0]]] })],
      ['an amount that is a number', wire({ e: [['E', 0, 90, 'e', [0]]] })],
      ['an unknown method', wire({ e: [['E', 0, '1', 'z', [0]]] })],
      ['a method spelled out', wire({ e: [['E', 0, '1', 'equal', [0]]] })],
      ['a payer below -1', wire({ e: [['E', -2, '1', 'e', [0]]] })],
      ['a payer past the last person', wire({ e: [['E', 2, '1', 'e', [0]]] })],
      ['a payer that is not whole', wire({ e: [['E', 0.5, '1', 'e', [0]]] })],
      ['a person past the last', wire({ e: [['E', 0, '1', 'e', [0, 2]]] })],
      ['a negative person', wire({ e: [['E', 0, '1', 'e', [-1]]] })],
      ['the same person twice', wire({ e: [['E', 0, '1', 'e', [1, 1]]] })],
      ['more shares than people', wire({ e: [['E', 0, '1', 'e', [0, 1, 0]]] })],
      ['an equal split with pairs', wire({ e: [['E', 0, '1', 'e', [[0, '1']]]] })],
      ['an exact split with bare people', wire({ e: [['E', 0, '1', 'x', [0, 1]]] })],
      ['a pair of three', wire({ e: [['E', 0, '1', 'x', [[0, '1', 'x']]] ] })],
      ['a pair value that is a number', wire({ e: [['E', 0, '1', 'p', [[0, 50]]]] })],
      ['a pair value over 14 characters', wire({ e: [['E', 0, '1', 'p', [[0, '5'.repeat(15)]]]] })],
      ['shares that are not a list', wire({ e: [['E', 0, '1', 'e', 'all']] })],
    ])('%s', (_name, value) => {
      expect(decode(value)).toBeNull();
    });

    it('accepts the limits themselves', () => {
      const edge = wire({
        p: [ 'x'.repeat(40), ...Array.from({ length: 19 }, (_, n) => `P${n}`)],
        e: [['y'.repeat(60), -1, '9'.repeat(14), 'p', [[0, '5'.repeat(14)]]]],
      });
      expect(decode(edge)).not.toBeNull();
    });
  });
});
