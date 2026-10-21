/**
 * The share link's hash prefix (release 2, R3): a calculator's state travels as `#c=…`. In a module
 * of its own so a page script can tell at load whether it was opened from a link without fetching
 * the codec (`fragment-codec.ts`) that reads one.
 */
export const HASH_PREFIX = '#c=';
