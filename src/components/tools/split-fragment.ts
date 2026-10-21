/**
 * The calculator's share link (release 2, R3): the form state as compact JSON, base64url-encoded,
 * in the URL fragment (`#c=…`). Browsers never send a fragment to a server, so a group can share a
 * result without anything leaving the browser.
 *
 * The fragment comes from anyone who can send a link, so it is parsed strictly: a bad length,
 * character set, encoding, JSON shape, unknown field or out-of-range value returns `null`, and the
 * page starts afresh. Nothing here throws. Names and labels only ever reach the page through
 * `value` and `textContent`.
 *
 * Wire format (version 1): `{"v":1,"c":"GBP","p":["Ana","Ben"],"e":[["Dinner",0,"90","e",[0,1]]]}`
 * where each expense is `[label, payerIndex, amount, method, shares]`; `method` is `e` (equal),
 * `x` (exact) or `p` (percent); `shares` is the list of people for `e` and a list of
 * `[personIndex, value]` pairs for `x` and `p`. A payer of -1 means nobody is chosen.
 */
import {
  MAX_EXPENSES,
  MAX_LABEL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_NUMBER_LENGTH,
  MAX_PEOPLE,
  MIN_PEOPLE,
  type CalcState,
  type ExpenseState,
  type Method,
} from './split-engine';

/** Hash prefix of a share link */
export const HASH_PREFIX = '#c=';
/** Longest payload accepted or produced, in characters (about 3 KB of JSON) */
export const MAX_PAYLOAD_LENGTH = 4096;
const VERSION = 1;

const METHOD_CODE: Record<Method, string> = { equal: 'e', exact: 'x', percent: 'p' };
const CODE_METHOD: Record<string, Method> = { e: 'equal', x: 'exact', p: 'percent' };

type Wire = [label: string, payer: number, amount: string, method: string, shares: unknown[]];

// ---------------------------------------------------------------------------
// base64url over UTF-8
// ---------------------------------------------------------------------------

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(payload: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(payload) || payload.length % 4 === 1) return null;
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * The payload for a state, or null when it is over the size cap. The state does not have to be
 * valid: a link keeps whatever was typed, mistakes included.
 */
export function encodeState(state: CalcState): string | null {
  const expenses = state.expenses.map((expense): Wire => {
    const people = state.people.map((_name, person) => person).filter(person => expense.include[person]);
    return [
      expense.label,
      expense.payer,
      expense.amount,
      METHOD_CODE[expense.method],
      expense.method === 'equal' ? people : people.map(person => [person, expense.values[person] ?? '']),
    ];
  });
  const payload = toBase64Url(JSON.stringify({ v: VERSION, c: state.currency, p: state.people, e: expenses }));
  return payload.length > MAX_PAYLOAD_LENGTH ? null : payload;
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

const CONTROL = /[\u0000-\u001f\u007f]/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max && !CONTROL.test(value);

const index = (value: unknown, below: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < below;

function expenseFrom(wire: unknown, people: number): ExpenseState | null {
  if (!Array.isArray(wire) || wire.length !== 5) return null;
  const [label, payer, amount, code, shares] = wire as unknown[];
  if (!text(label, MAX_LABEL_LENGTH) || !text(amount, MAX_NUMBER_LENGTH)) return null;
  if (!Number.isInteger(payer) || (payer as number) < -1 || (payer as number) >= people) return null;
  const method = typeof code === 'string' ? CODE_METHOD[code] : undefined;
  if (!method || !Array.isArray(shares) || shares.length > people) return null;

  const include = Array.from({ length: people }, () => false);
  const values = Array.from({ length: people }, () => '');
  for (const share of shares) {
    const person = method === 'equal' ? share : Array.isArray(share) && share.length === 2 ? share[0] : undefined;
    if (!index(person, people) || include[person]) return null;
    include[person] = true;
    if (method !== 'equal') {
      if (!text((share as unknown[])[1], MAX_NUMBER_LENGTH)) return null;
      values[person] = (share as string[])[1];
    }
  }
  return { label, payer: payer as number, amount, method, include, values };
}

/**
 * The state a payload describes, or null if it is not exactly what `encodeState` writes.
 * `currencies` are the codes the page offers; any other currency is refused.
 */
export function decodeState(payload: string, currencies: readonly string[]): CalcState | null {
  if (payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) return null;
  const json = fromBase64Url(payload);
  if (json === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  // Exactly these four fields: an unknown one means the link is not ours
  const keys = Object.keys(data).sort();
  if (keys.join() !== 'c,e,p,v' || data.v !== VERSION) return null;

  const { c: currency, p: people, e: expenses } = data;
  if (typeof currency !== 'string' || !currencies.includes(currency)) return null;
  if (!Array.isArray(people) || people.length < MIN_PEOPLE || people.length > MAX_PEOPLE) return null;
  if (!people.every(name => text(name, MAX_NAME_LENGTH))) return null;
  if (!Array.isArray(expenses) || expenses.length > MAX_EXPENSES) return null;

  const decoded: ExpenseState[] = [];
  for (const wire of expenses) {
    const expense = expenseFrom(wire, people.length);
    if (!expense) return null;
    decoded.push(expense);
  }
  return { currency, people: people as string[], expenses: decoded };
}

/** The state in a location hash (`#c=…`), or null if the hash is not a share link. */
export function stateFromHash(hash: string, currencies: readonly string[]): CalcState | null {
  return hash.startsWith(HASH_PREFIX) ? decodeState(hash.slice(HASH_PREFIX.length), currencies) : null;
}
