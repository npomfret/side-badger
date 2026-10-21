import { describe, expect, it } from 'vitest';
import { CURRENCIES } from './currencies';
import { HASH_PREFIX, MAX_PAYLOAD_LENGTH } from './fragment-codec';
import {
  DEFAULT_SHARED,
  MAX_NAME_LENGTH,
  MAX_NUMBER_LENGTH,
  MAX_RENT_PEOPLE,
  newPerson,
  type RentState,
} from './rent-engine';
import { decodeRent, encodeRent, rentFromHash } from './rent-fragment';
import { decodeState as decodeSplit, encodeState as encodeSplit } from './split-fragment';

const currencies: readonly string[] = CURRENCIES;

const flat: RentState = {
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
};

const couple: RentState = {
  mode: 'income',
  currency: 'EUR',
  rent: '1400,50',
  bills: '180',
  shared: DEFAULT_SHARED,
  unit: 'm2',
  people: [
    { ...newPerson('Maya'), income: '2800' },
    { ...newPerson('Zoë ☕'), income: '1700' },
  ],
};

/** A payload for any JSON value, as the codec writes them */
const payloadOf = (value: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const room = (over: Record<string, unknown> = {}) => ({
  v: 1,
  m: 'r',
  c: 'GBP',
  r: '1950',
  s: '40',
  u: 'm',
  p: [['Priya', '16'], ['Tom', '12']],
  ...over,
});
const income = (over: Record<string, unknown> = {}) => ({
  v: 1,
  m: 'i',
  c: 'GBP',
  r: '1400',
  b: '180',
  p: [['Maya', '2800'], ['Jon', '1700']],
  ...over,
});

const decode = (value: unknown) => decodeRent(payloadOf(value), currencies);

describe('the rent share link', () => {
  describe('round trip', () => {
    it('gives back a room-size state', () => {
      const payload = encodeRent(flat);
      expect(payload).not.toBeNull();
      expect(decodeRent(payload!, currencies)).toEqual(flat);
    });

    it('gives back an income state, with accents and symbols', () => {
      expect(decodeRent(encodeRent(couple)!, currencies)).toEqual(couple);
    });

    it('keeps the unit, the share for the shared rooms and a mistake someone typed', () => {
      const state: RentState = { ...flat, unit: 'ft2', shared: '12.5', rent: 'lots', people: [{ ...newPerson(''), area: 'big' }, { ...newPerson('Tom'), area: '' }] };
      expect(decodeRent(encodeRent(state)!, currencies)).toEqual(state);
    });

    it('keeps only the figures of the mode it was copied in', () => {
      const both: RentState = {
        ...flat,
        bills: '99',
        people: flat.people.map(person => ({ ...person, income: '5000' })),
      };
      const back = decodeRent(encodeRent(both)!, currencies)!;
      expect(back.mode).toBe('room');
      expect(back.bills).toBe('');
      expect(back.people.map(person => person.income)).toEqual(['', '', '']);
      expect(back.people.map(person => person.area)).toEqual(['16', '12', '10']);
    });

    it('is URL-safe base64 with no padding', () => {
      expect(encodeRent(flat)).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encodeRent(couple)).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('is small: a flat is well under a kilobyte', () => {
      expect(encodeRent(flat)!.length).toBeLessThan(200);
    });

    it('takes every currency the page offers', () => {
      for (const currency of currencies) expect(decodeRent(encodeRent({ ...flat, currency })!, currencies)?.currency).toBe(currency);
    });
  });

  describe('the limits', () => {
    const maxed = (name: string, figure: string): RentState => ({
      mode: 'income',
      currency: 'GBP',
      rent: '9'.repeat(MAX_NUMBER_LENGTH),
      bills: '9'.repeat(MAX_NUMBER_LENGTH),
      shared: '40',
      unit: 'm2',
      people: Array.from({ length: MAX_RENT_PEOPLE }, () => ({ ...newPerson(name), income: figure })),
    });

    it('fits ten people with the longest names in the longest characters', () => {
      // 40 characters that are three bytes each in UTF-8
      const state = maxed('日'.repeat(MAX_NAME_LENGTH), '9'.repeat(MAX_NUMBER_LENGTH));
      const payload = encodeRent(state);
      expect(payload).not.toBeNull();
      expect(payload!.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
      expect(decodeRent(payload!, currencies)).toEqual(state);
    });

    it('takes 2 to 10 people', () => {
      expect(decode(room({ p: [['A', '1']] }))).toBeNull();
      expect(decode(room({ p: [] }))).toBeNull();
      expect(decode(room({ p: [['A', '1'], ['B', '1']] }))).not.toBeNull();
      const people = (count: number) => Array.from({ length: count }, (_x, i) => [`P${i}`, '1']);
      expect(decode(room({ p: people(10) }))).not.toBeNull();
      expect(decode(room({ p: people(11) }))).toBeNull();
      expect(decode(income({ p: people(11) }))).toBeNull();
    });

    it('takes names up to the longest and figures up to the longest', () => {
      expect(decode(room({ p: [['a'.repeat(MAX_NAME_LENGTH), '1'], ['B', '1']] }))).not.toBeNull();
      expect(decode(room({ p: [['a'.repeat(MAX_NAME_LENGTH + 1), '1'], ['B', '1']] }))).toBeNull();
      expect(decode(room({ p: [['A', '1'.repeat(MAX_NUMBER_LENGTH)], ['B', '1']] }))).not.toBeNull();
      expect(decode(room({ p: [['A', '1'.repeat(MAX_NUMBER_LENGTH + 1)], ['B', '1']] }))).toBeNull();
      expect(decode(room({ r: '1'.repeat(MAX_NUMBER_LENGTH + 1) }))).toBeNull();
      expect(decode(room({ s: '1'.repeat(MAX_NUMBER_LENGTH + 1) }))).toBeNull();
      expect(decode(income({ b: '1'.repeat(MAX_NUMBER_LENGTH + 1) }))).toBeNull();
    });

    it('refuses a payload over the size cap, however it is made', () => {
      expect(decodeRent('A'.repeat(MAX_PAYLOAD_LENGTH + 1), currencies)).toBeNull();
      const big = payloadOf(room({ p: [['A', '1'], ['B', '1']], x: 'y'.repeat(MAX_PAYLOAD_LENGTH) }));
      expect(big.length).toBeGreaterThan(MAX_PAYLOAD_LENGTH);
      expect(decodeRent(big, currencies)).toBeNull();
    });

    it('refuses an empty payload', () => {
      expect(decodeRent('', currencies)).toBeNull();
    });
  });

  describe('a link that is not ours', () => {
    it.each([
      ['not base64', '!!!not base64!!!'],
      ['an impossible length', 'A'],
      ['base64 of text that is not JSON', 'aGVsbG8'],
      ['padding', `${payloadOf(room())}==`],
      ['standard base64 characters', payloadOf(room()).replace(/-/g, '+').replace(/_/g, '/') + '+'],
    ])('is refused when it is %s', (_name, payload) => {
      expect(decodeRent(payload, currencies)).toBeNull();
    });

    it.each([
      ['null', null],
      ['a number', 3],
      ['a string', 'text'],
      ['an array', []],
      ['an empty object', {}],
      ['the wrong version', room({ v: 2 })],
      ['no version', (({ v: _v, ...rest }) => rest)(room())],
      ['an unknown mode', room({ m: 'x' })],
      ['a mode that is not text', room({ m: 1 })],
      ['an unknown field', room({ extra: 1 })],
      ['an unknown field on an income link', income({ extra: 1 })],
      ['a room link carrying bills', room({ b: '10' })],
      ['an income link carrying a shared share', income({ s: '40' })],
      ['an income link carrying a unit', income({ u: 'm' })],
      ['a room link with no unit', (({ u: _u, ...rest }) => rest)(room())],
      ['a room link with no shared share', (({ s: _s, ...rest }) => rest)(room())],
      ['an income link with no bills', (({ b: _b, ...rest }) => rest)(income())],
      ['an unknown unit', room({ u: 'cm' })],
      ['a unit that is not text', room({ u: 1 })],
      ['a currency the page does not offer', room({ c: 'XYZ' })],
      ['a currency that is not text', room({ c: 5 })],
      ['a rent that is not text', room({ r: 1950 })],
      ['a shared share that is not text', room({ s: 40 })],
      ['bills that are not text', income({ b: 180 })],
      ['people that are not a list', room({ p: 'Priya' })],
      ['a person that is not a pair', room({ p: [['A'], ['B', '1']] })],
      ['a person that is not a list', room({ p: ['A', 'B'] })],
      ['a name that is not text', room({ p: [[1, '1'], ['B', '1']] })],
      ['a figure that is not text', room({ p: [['A', 1], ['B', '1']] })],
      ['a three-part person', room({ p: [['A', '1', 'x'], ['B', '1']] })],
      ['a control character in a name', room({ p: [['A\nB', '1'], ['B', '1']] })],
      ['a control character in a figure', room({ p: [['A', '1\u0000'], ['B', '1']] })],
      ['a control character in the rent', room({ r: '19\t50' })],
    ])('is refused when it has %s', (_name, value) => {
      expect(decode(value)).toBeNull();
    });

    it('is refused when its bytes are not UTF-8', () => {
      // 0xC3 0x28 is not valid UTF-8
      expect(decodeRent(btoa('Ã(').replace(/=+$/, ''), currencies)).toBeNull();
    });

    it('is refused by the split-bill calculator, and the split-bill link by this one', () => {
      expect(decodeSplit(encodeRent(flat)!, currencies)).toBeNull();
      const split = encodeSplit({ currency: 'GBP', people: ['Ana', 'Ben'], expenses: [] });
      expect(split).not.toBeNull();
      expect(decodeRent(split!, currencies)).toBeNull();
    });
  });

  describe('a valid link, written by hand', () => {
    it('opens by room size', () => {
      expect(decode(room())).toEqual({
        mode: 'room',
        currency: 'GBP',
        rent: '1950',
        bills: '',
        shared: '40',
        unit: 'm2',
        people: [{ name: 'Priya', area: '16', income: '' }, { name: 'Tom', area: '12', income: '' }],
      });
    });

    it('opens by income, with the room-size defaults', () => {
      expect(decode(income({ b: '' }))).toEqual({
        mode: 'income',
        currency: 'GBP',
        rent: '1400',
        bills: '',
        shared: '40',
        unit: 'm2',
        people: [{ name: 'Maya', area: '', income: '2800' }, { name: 'Jon', area: '', income: '1700' }],
      });
    });

    it('takes the square-foot unit', () => {
      expect(decode(room({ u: 'f' }))?.unit).toBe('ft2');
    });
  });

  describe('rentFromHash', () => {
    it('reads a hash that starts with #c=', () => {
      expect(rentFromHash(`${HASH_PREFIX}${encodeRent(flat)}`, currencies)).toEqual(flat);
    });

    it.each(['', '#', '#main-content', '#c', '#c=', '#c=not%20a%20link', '#x=abc', `#C=${'A'.repeat(8)}`])('ignores %j', hash => {
      expect(rentFromHash(hash, currencies)).toBeNull();
    });
  });
});

describe('unit codes are an explicit set', () => {
  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('refuses %s', code => {
    expect(decode(room({ u: code }))).toBeNull();
  });
});
