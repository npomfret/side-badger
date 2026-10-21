/**
 * What every calculator's share link has in common (release 2, R3): the `#c=` prefix, the size cap,
 * base64url over UTF-8, and the strict checks a payload from anyone who can send a link must pass.
 * Each calculator adds its own wire format on top (`split-fragment.ts`, `rent-fragment.ts`).
 *
 * Nothing here throws: a bad length, character set, encoding or JSON gives `undefined`, and the
 * calculator starts afresh.
 */
import { HASH_PREFIX } from './share-hash';

/** Hash prefix of a share link (`share-hash.ts`, so a page can spot a link without this module) */
export { HASH_PREFIX };

/** Longest payload accepted or produced, in characters (about 3 KB of JSON) */
export const MAX_PAYLOAD_LENGTH = 4096;

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

/** The payload for a JSON value, or null when it is over the size cap */
export function writePayload(value: unknown): string | null {
  const payload = toBase64Url(JSON.stringify(value));
  return payload.length > MAX_PAYLOAD_LENGTH ? null : payload;
}

/** The JSON value a payload holds, or `undefined` when its size, characters, encoding or JSON are wrong */
export function readPayload(payload: string): unknown {
  if (payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) return undefined;
  const json = fromBase64Url(payload);
  if (json === null) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

const CONTROL = /[\u0000-\u001f\u007f]/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A string of at most `max` characters with no control characters */
export const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max && !CONTROL.test(value);

/** A whole number from 0 up to, not including, `below` */
export const isIndex = (value: unknown, below: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < below;
