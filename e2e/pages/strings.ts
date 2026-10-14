import en from '../../src/i18n/en';
import { PSEUDO_LOCALES, pseudoTranslations, type PseudoLocale } from '../../src/i18n/pseudo';

/** The locales the shell is checked in: English and the four preview pseudo-locales (D38). */
export type ShellLocale = 'en' | PseudoLocale;
export const SHELL_LOCALES: readonly ShellLocale[] = ['en', ...PSEUDO_LOCALES];

export type StringKey = keyof typeof en;

const tables = new Map<ShellLocale, Record<string, string>>();

/** The page's text for a key in a locale. Pseudo-locale text is generated from English. */
export function text(locale: ShellLocale, key: StringKey): string {
  let table = tables.get(locale);
  if (!table) {
    table = locale === 'en' ? en : pseudoTranslations(en as Record<string, string>, locale);
    tables.set(locale, table);
  }
  return table[key];
}

/** The URL of a page in a locale: `/pricing/` in English, `/xx-ar/pricing/` in a pseudo-locale. */
export function pathFor(locale: ShellLocale, route: string): string {
  const tail = route.replace(/^\/+|\/+$/g, '');
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${prefix}/${tail}${tail ? '/' : ''}`;
}

/** Whether the locale is written right to left */
export function isRtl(locale: ShellLocale): boolean {
  return locale === 'xx-ar';
}
