/**
 * ADDING A NEW LANGUAGE CHECKLIST:
 * 1. Create translation file: src/i18n/{locale}.ts (copy from en.ts)
 * 2. Import it below
 * 3. Add to Locale type
 * 4. Add to translations record
 * 5. Add to locales array
 * 6. Add to DropdownLocale type (if showing in dropdown)
 * 7. Add to allLocales array (for dropdown ordering)
 * 8. Add to localeNames and localeFlags records
 * 9. Add to getFormattedDate locale map
 *
 * That's it! Pages automatically use getLocalePaths() and
 * astro.config.mjs imports locales from here.
 */
import en from './en';
import uk from './uk';
import es from './es';
import ja from './ja';
import ar from './ar';
import de from './de';
import ko from './ko';
import sv from './sv';
import it from './it';
import lv from './lv';
import no from './no';
import ph from './ph';

export type Locale = 'en' | 'uk' | 'es' | 'ja' | 'ar' | 'de' | 'ko' | 'sv' | 'it' | 'lv' | 'no' | 'ph';
export type TranslationKey = keyof typeof en;

// Comedy aliases that all point to English
export type LocaleAlias = 'en-us' | 'en-au' | 'en-ca' | 'en-gb';
export type LocaleOrAlias = Locale | LocaleAlias;
// Locales shown in dropdown (excludes base 'en' since aliases cover it)
export type DropdownLocale = 'uk' | 'es' | 'ja' | 'ar' | 'de' | 'ko' | 'sv' | 'it' | 'lv' | 'no' | 'ph' | LocaleAlias;

const translations: Record<Locale, typeof en> = { en, uk, es, ja, ar, de, ko, sv, it, lv, no, ph };

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

export const locales: Locale[] = ['en', 'uk', 'es', 'ja', 'ar', 'de', 'ko', 'sv', 'it', 'lv', 'no', 'ph'];
export const localeAliases: LocaleAlias[] = ['en-us', 'en-au', 'en-ca', 'en-gb'];
// Alphabetically by English name (Arabic, English variants, German, Italian, etc.)
export const allLocales: DropdownLocale[] = ['ar', 'en-gb', 'en-us', 'en-au', 'en-ca', 'de', 'it', 'ja', 'ko', 'lv', 'no', 'es', 'sv', 'ph', 'uk'];

export const localeNames: Record<DropdownLocale, string> = {
  uk: 'Українська',
  es: 'Español',
  ja: '日本語',
  ar: 'العربية',
  de: 'Deutsch',
  ko: '한국어',
  sv: 'Svenska',
  it: 'Italiano',
  lv: 'Latviešu',
  no: 'Norsk',
  ph: 'Tagalog',
  'en-us': 'English (American)',
  'en-au': 'English (Australian)',
  'en-ca': 'English (Canadian)',
  'en-gb': 'English (Actual)',
};

export const localeFlags: Record<DropdownLocale, string> = {
  uk: '🇺🇦',
  es: '🇪🇸',
  ja: '🇯🇵',
  ar: '🇸🇦',
  de: '🇩🇪',
  ko: '🇰🇷',
  sv: '🇸🇪',
  it: '🇮🇹',
  lv: '🇱🇻',
  no: '🇳🇴',
  ph: '🇵🇭',
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

export function getFormattedDate(locale: Locale): string {
  const date = new Date();
  // Map our locales to BCP 47 language tags for robust formatting
  const localeForIntl = {
    ar: 'ar-EG',
    ja: 'ja-JP',
    es: 'es-ES',
    uk: 'uk-UA',
    de: 'de-DE',
    ko: 'ko-KR',
    sv: 'sv-SE',
    it: 'it-IT',
    lv: 'lv-LV',
    no: 'nb-NO',
    ph: 'fil-PH',
    en: 'en-US',
  }[locale];

  return new Intl.DateTimeFormat(localeForIntl, {
    year: 'numeric',
  }).format(date);
}

/**
 * Generate static paths for all locales.
 * Use this in getStaticPaths() to ensure all languages are included.
 * This is the SINGLE SOURCE OF TRUTH for locale routing.
 */
export function getLocalePaths() {
  return [
    // Default locale (English) - no prefix
    { params: { locale: undefined } },
    // All non-English locales
    ...locales.filter(l => l !== 'en').map(locale => ({ params: { locale } })),
    // English aliases (comedy variants)
    ...localeAliases.map(alias => ({ params: { locale: alias } })),
  ];
}