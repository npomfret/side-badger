import en from '../../src/i18n/en';
import ar from '../../src/i18n/ar';
import de from '../../src/i18n/de';
import fr from '../../src/i18n/fr';
import hi from '../../src/i18n/hi';
import ja from '../../src/i18n/ja';
import pcm from '../../src/i18n/pcm';
import pl from '../../src/i18n/pl';
import ur from '../../src/i18n/ur';
import zh from '../../src/i18n/zh';
import { PSEUDO_LOCALES, pseudoTranslations, type PseudoLocale } from '../../src/i18n/pseudo';

/**
 * The real locales the localized checks run in (P41, W4b): Latin (`de`, `fr`, `pl`, `pcm`), CJK
 * (`ja`, `zh`), Indic (`hi`) and right to left (`ar`, `ur`).
 */
export const LOCALIZED_LOCALES = ['de', 'ja', 'hi', 'ar', 'fr', 'pl', 'ur', 'zh', 'pcm'] as const;
export type LocalizedLocale = (typeof LOCALIZED_LOCALES)[number];

/** Each localized locale's name in the language switcher, written in that language */
export const LOCALE_NAMES: Record<LocalizedLocale, string> = {
  ar: 'العربية',
  de: 'Deutsch',
  fr: 'Français',
  hi: 'हिन्दी',
  ja: '日本語',
  pcm: 'Naijá',
  pl: 'Polski',
  ur: 'اردو',
  zh: '中文',
};

/** The `<html lang>` each localized locale's pages carry */
export const HTML_LANG: Record<LocalizedLocale, string> = {
  ar: 'ar',
  de: 'de',
  fr: 'fr',
  hi: 'hi',
  ja: 'ja',
  pcm: 'pcm',
  pl: 'pl',
  ur: 'ur',
  zh: 'zh-Hans',
};

/** The locales the shell is checked in: English, the four preview pseudo-locales (D38) and the real ones above. */
export type ShellLocale = 'en' | PseudoLocale | LocalizedLocale;
/** English and the pseudo-locales: the set the English-wave specs iterate. */
export const SHELL_LOCALES: readonly ('en' | PseudoLocale)[] = ['en', ...PSEUDO_LOCALES];

export type StringKey = keyof typeof en;

const REAL_TABLES: Record<LocalizedLocale, Record<string, string>> = { ar, de, fr, hi, ja, pcm, pl, ur, zh };

const tables = new Map<ShellLocale, Record<string, string>>();

/** The page's text for a key in a locale. Pseudo-locale text is generated from English. */
export function text(locale: ShellLocale, key: StringKey): string {
  let table = tables.get(locale);
  if (!table) {
    if (locale === 'en') table = en;
    else if (isLocalized(locale)) table = REAL_TABLES[locale];
    else table = pseudoTranslations(en as Record<string, string>, locale);
    tables.set(locale, table);
  }
  return table[key];
}

export function isLocalized(locale: ShellLocale): locale is LocalizedLocale {
  return (LOCALIZED_LOCALES as readonly string[]).includes(locale);
}

/** The URL of a page in a locale: `/pricing/` in English, `/xx-ar/pricing/` or `/ar/pricing/` elsewhere. */
export function pathFor(locale: ShellLocale, route: string): string {
  const tail = route.replace(/^\/+|\/+$/g, '');
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${prefix}/${tail}${tail ? '/' : ''}`;
}

/** Whether the locale is written right to left */
export function isRtl(locale: ShellLocale): boolean {
  return locale === 'xx-ar' || locale === 'ar' || locale === 'ur';
}
