import en from './en';
import uk from './uk';
import es from './es';
import ja from './ja';

export type Locale = 'en' | 'uk' | 'es' | 'ja';
export type TranslationKey = keyof typeof en;

// Comedy aliases that all point to English
export type LocaleAlias = 'en-us' | 'en-au' | 'en-ca' | 'en-gb';
export type LocaleOrAlias = Locale | LocaleAlias;
// Locales shown in dropdown (excludes base 'en' since aliases cover it)
export type DropdownLocale = 'uk' | 'es' | 'ja' | LocaleAlias;

const translations: Record<Locale, typeof en> = { en, uk, es, ja };

// Map aliases to their actual locale
export const localeAliasMap: Record<LocaleAlias, Locale> = {
  'en-us': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'en-gb': 'en',
};

export function resolveLocale(localeOrAlias: LocaleOrAlias): Locale {
  if (localeOrAlias in localeAliasMap) {
    return localeAliasMap[localeOrAlias as LocaleAlias];
  }
  return localeOrAlias as Locale;
}

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const pathname = url.pathname;
  // Check if URL starts with a locale prefix
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  // Default to English (no prefix means English)
  return 'en';
}

export function getPathWithoutLocale(pathname: string): string {
  // Check both core locales and aliases
  const allPrefixes = [...locales, ...Object.keys(localeAliasMap)];
  for (const prefix of allPrefixes) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return pathname.slice(prefix.length + 1);
    }
    if (pathname === `/${prefix}`) {
      return '/';
    }
  }
  return pathname;
}

export function getLocalizedPath(pathname: string, locale: Locale): string {
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  // English uses root path (no prefix)
  if (locale === 'en') {
    return pathWithoutLocale;
  }
  // Other locales get prefixed
  return `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
}

export const locales: Locale[] = ['en', 'uk', 'es', 'ja'];
export const localeAliases: LocaleAlias[] = ['en-us', 'en-au', 'en-ca', 'en-gb'];
export const allLocales: DropdownLocale[] = ['uk', 'es', 'ja', ...localeAliases];

export const localeNames: Record<DropdownLocale, string> = {
  uk: 'Українська',
  es: 'Español',
  ja: '日本語',
  'en-us': 'English (American)',
  'en-au': 'English (Australian)',
  'en-ca': 'English (Canadian)',
  'en-gb': 'English (Actual)',
};

export const localeFlags: Record<DropdownLocale, string> = {
  uk: '🇺🇦',
  es: '🇪🇸',
  ja: '🇯🇵',
  'en-us': '🇺🇸',
  'en-au': '🇦🇺',
  'en-ca': '🇨🇦',
  'en-gb': '🇬🇧',
};

// RTL language detection for future RTL language support
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
export const isRTL = (locale: string): boolean =>
  RTL_LANGUAGES.includes(locale.split('-')[0]);

// Get app URL with language parameter
export function getAppUrl(locale: Locale = 'en'): string {
  const baseUrl = translations.en['app.url'];
  if (locale === 'en') {
    return baseUrl;
  }
  return `${baseUrl}?lang=${locale}`;
}
