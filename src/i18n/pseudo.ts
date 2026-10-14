/**
 * Preview-only pseudo-locales (restructure D38).
 *
 * Built only under PREVIEW_PSEUDO=1, so layouts can be checked for long strings and for
 * right-to-left, CJK and Indic scripts before the real translations exist:
 *
 * - `xx-long`  English, accented and 40% longer
 * - `xx-ar`    sample Arabic text at the English length (`lang` ar, `dir` rtl, arabic font)
 * - `xx-ja`    sample Japanese text at the English length (`lang` ja, cjk font)
 * - `xx-hi`    sample Devanagari text at the English length (`lang` hi, devanagari font)
 *
 * `{placeholders}`, HTML tags and entities are left alone, so interpolation and markup still
 * work. This file has no imports, so it can be used from anywhere (including `astro.config.mjs`).
 */

export const PSEUDO_LOCALES = ['xx-long', 'xx-ar', 'xx-ja', 'xx-hi'] as const;
export type PseudoLocale = (typeof PSEUDO_LOCALES)[number];

export type FontScript =
  | 'latin'
  | 'cyrillic-greek'
  | 'arabic'
  | 'devanagari'
  | 'bengali'
  | 'telugu'
  | 'cjk';

export const pseudoMeta: Record<
  PseudoLocale,
  { name: string; htmlLang: string; dir: 'ltr' | 'rtl'; fontScript: FontScript; intlCode: string }
> = {
  'xx-long': { name: 'Pseudo (long)', htmlLang: 'en', dir: 'ltr', fontScript: 'latin', intlCode: 'en-US' },
  'xx-ar': { name: 'Pseudo (Arabic)', htmlLang: 'ar', dir: 'rtl', fontScript: 'arabic', intlCode: 'ar-EG' },
  'xx-ja': { name: 'Pseudo (Japanese)', htmlLang: 'ja', dir: 'ltr', fontScript: 'cjk', intlCode: 'ja-JP' },
  'xx-hi': { name: 'Pseudo (Hindi)', htmlLang: 'hi', dir: 'ltr', fontScript: 'devanagari', intlCode: 'hi-IN' },
};

export function isPseudoLocale(value: string): value is PseudoLocale {
  return (PSEUDO_LOCALES as readonly string[]).includes(value);
}

/** True when PREVIEW_PSEUDO=1. Safe to call where `process` does not exist. */
export function previewPseudoEnabled(): boolean {
  return typeof process !== 'undefined' && process.env?.PREVIEW_PSEUDO === '1';
}

const ACCENTS: Record<string, string> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ĺ', m: 'ɱ',
  n: 'ñ', o: 'ó', p: 'þ', q: 'ɋ', r: 'ŕ', s: 'š', t: 'ť', u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ĺ', M: 'Ṁ',
  N: 'Ñ', O: 'Ó', P: 'Þ', Q: 'Ɋ', R: 'Ŕ', S: 'Š', T: 'Ť', U: 'Ú', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

const FILLER = 'ĺôńĝ ';

// Placeholders, tags and entities pass through untouched
const PROTECTED = /(\{[A-Za-z_]\w*\}|<[^>]+>|&[#A-Za-z0-9]+;)/g;

const ARABIC = Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهوي');
const JAPANESE = Array.from('日本語文字表示例あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ');
const DEVANAGARI_CONSONANTS = Array.from('कखगघचजटडतथदधनपफबभमयरलवशसह');
const DEVANAGARI_SIGNS = Array.from('ािीुूेैोौं');

/** Replace each ASCII letter, keeping everything else. `position` counts from the start of a word. */
function replaceLetters(text: string, pick: (positionInWord: number, counter: number) => string): string {
  let counter = 0;
  let position = 0;
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      out += pick(position, counter++);
      position++;
    } else {
      position = /[0-9]/.test(ch) ? position + 1 : 0;
      out += ch;
    }
  }
  return out;
}

function transformPlain(text: string, locale: PseudoLocale): string {
  switch (locale) {
    case 'xx-long':
      return Array.from(text).map(ch => ACCENTS[ch] ?? ch).join('');
    case 'xx-ar':
      return replaceLetters(text, (_p, n) => ARABIC[n % ARABIC.length]);
    case 'xx-ja':
      return replaceLetters(text, (_p, n) => JAPANESE[n % JAPANESE.length]);
    case 'xx-hi':
      // Consonants at even positions, vowel signs at odd ones, so a sign never starts a word
      return replaceLetters(text, (p, n) =>
        p % 2 === 0
          ? DEVANAGARI_CONSONANTS[n % DEVANAGARI_CONSONANTS.length]
          : DEVANAGARI_SIGNS[n % DEVANAGARI_SIGNS.length]
      );
  }
}

/** Pseudo-localize one string. Whitespace at either end is kept as it is. */
export function pseudoText(text: string, locale: PseudoLocale): string {
  const lead = text.match(/^\s*/)![0];
  const rest = text.slice(lead.length);
  const trail = rest.match(/\s*$/)![0];
  const core = rest.slice(0, rest.length - trail.length);
  if (!core) return text;

  const parts = core.split(PROTECTED);
  let visible = 0;
  let out = '';
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out += part;
    } else {
      visible += part.length;
      out += transformPlain(part, locale);
    }
  });

  if (locale === 'xx-long' && /[A-Za-z]/.test(core)) {
    const extra = Math.ceil(visible * 0.4);
    let filler = '';
    while (filler.length < extra) filler += FILLER;
    out += ' ' + filler.slice(0, extra).trimEnd();
  }
  return lead + out + trail;
}

/** Pseudo-localize every string in a flat translation record. */
export function pseudoTranslations<T extends Record<string, string>>(source: T, locale: PseudoLocale): T {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, pseudoText(value, locale)])
  ) as T;
}

/** Pseudo-localize every string inside a nested value (for content entries). */
export function pseudoize<V>(value: V, locale: PseudoLocale): V {
  if (typeof value === 'string') return pseudoText(value, locale) as V;
  if (Array.isArray(value)) return value.map(item => pseudoize(item, locale)) as V;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, pseudoize(v, locale)])
    ) as V;
  }
  return value;
}
