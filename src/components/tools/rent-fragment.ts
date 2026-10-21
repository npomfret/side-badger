/**
 * The rent calculator's share link (release 2, P9): the form state as compact JSON, base64url-encoded,
 * in the URL fragment (`#c=…`), as for the split-bill calculator (`fragment-codec.ts`). Browsers
 * never send a fragment to a server, so a group can share a result without anything leaving the
 * browser. Names and figures are the people's own, so the link says so on the page.
 *
 * The fragment comes from anyone who can send a link, so it is parsed strictly: a bad length,
 * character set, encoding, JSON shape, unknown field or out-of-range value returns `null`, and the
 * page starts afresh. Nothing here throws. Names only ever reach the page through `value`.
 *
 * Wire format (version 1), one shape for each mode; only the active mode's figures are kept:
 * - by room size: `{"v":1,"m":"r","c":"GBP","r":"1950","s":"40","u":"m","p":[["Priya","16"],["Tom","12"]]}`
 *   where `s` is the percentage for the shared rooms and `u` the unit, `m` (m²) or `f` (ft²);
 * - by income: `{"v":1,"m":"i","c":"GBP","r":"1400","b":"180","p":[["Maya","2800"],["Jon","1700"]]}`
 *   where `b` is the shared bills, blank for none.
 */
import { HASH_PREFIX, isRecord, isText, readPayload, writePayload } from './fragment-codec';
import {
  DEFAULT_SHARED,
  MAX_NAME_LENGTH,
  MAX_NUMBER_LENGTH,
  MAX_RENT_PEOPLE,
  MIN_PEOPLE,
  newPerson,
  type RentState,
  type Unit,
} from './rent-state';

const VERSION = 1;

const UNIT_CODE: Record<Unit, string> = { m2: 'm', ft2: 'f' };
const CODE_UNIT: Record<string, Unit> = { m: 'm2', f: 'ft2' };

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * The payload for a state, or null when it is over the size cap. The state does not have to be
 * valid: a link keeps whatever was typed, mistakes included.
 */
export function encodeRent(state: RentState): string | null {
  const people = state.people.map(person => [person.name, state.mode === 'room' ? person.area : person.income]);
  const common = { v: VERSION, c: state.currency, r: state.rent, p: people };
  return writePayload(
    state.mode === 'room'
      ? { ...common, m: 'r', s: state.shared, u: UNIT_CODE[state.unit] }
      : { ...common, m: 'i', b: state.bills }
  );
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

/**
 * The state a payload describes, or null if it is not exactly what `encodeRent` writes.
 * `currencies` are the codes the page offers; any other currency is refused.
 */
export function decodeRent(payload: string, currencies: readonly string[]): RentState | null {
  const data = readPayload(payload);
  if (!isRecord(data) || data.v !== VERSION) return null;
  const room = data.m === 'r';
  if (!room && data.m !== 'i') return null;
  // Exactly the fields of its mode: an unknown one means the link is not ours
  if (Object.keys(data).sort().join() !== (room ? 'c,m,p,r,s,u,v' : 'b,c,m,p,r,v')) return null;

  const { c: currency, r: rent, p: people } = data;
  if (typeof currency !== 'string' || !currencies.includes(currency)) return null;
  if (!isText(rent, MAX_NUMBER_LENGTH)) return null;
  if (!Array.isArray(people) || people.length < MIN_PEOPLE || people.length > MAX_RENT_PEOPLE) return null;

  const state: RentState = {
    mode: room ? 'room' : 'income',
    currency,
    rent,
    bills: '',
    shared: DEFAULT_SHARED,
    unit: 'm2',
    people: [],
  };
  if (room) {
    const unit = typeof data.u === 'string' ? CODE_UNIT[data.u] : undefined;
    if (!isText(data.s, MAX_NUMBER_LENGTH) || !unit) return null;
    state.shared = data.s;
    state.unit = unit;
  } else {
    if (!isText(data.b, MAX_NUMBER_LENGTH)) return null;
    state.bills = data.b;
  }

  for (const wire of people) {
    if (!Array.isArray(wire) || wire.length !== 2) return null;
    const [name, figure] = wire as unknown[];
    if (!isText(name, MAX_NAME_LENGTH) || !isText(figure, MAX_NUMBER_LENGTH)) return null;
    const person = newPerson(name);
    if (room) person.area = figure;
    else person.income = figure;
    state.people.push(person);
  }
  return state;
}

/** The state in a location hash (`#c=…`), or null if the hash is not a rent share link. */
export function rentFromHash(hash: string, currencies: readonly string[]): RentState | null {
  return hash.startsWith(HASH_PREFIX) ? decodeRent(hash.slice(HASH_PREFIX.length), currencies) : null;
}
