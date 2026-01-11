/**
 * ADDING A NEW LANGUAGE:
 * 1. Create translation file: src/i18n/{locale}.ts (copy from en.ts)
 * 2. Import it below
 * 3. Add entry to localeConfig
 *
 * That's it! Everything else is derived automatically.
 *
 * ADDING A NEW ALIAS (e.g., regional variant):
 * 1. Add entry to aliasConfig pointing to base locale
 */
import en from './en';
import uk from './uk';
import es from './es';
import ja from './ja';
import ar from './ar';
import de from './de';
import el from './el';
import da from './da';
import ko from './ko';
import sv from './sv';
import it from './it';
import lv from './lv';
import no from './no';
import ph from './ph';
import nlBE from './nl-BE';
import ga from './ga';
import cy from './cy';
import cs from './cs';
import eu from './eu';
import hi from './hi';
import hu from './hu';
import hr from './hr';
import sl from './sl';
import sr from './sr';
import zh from './zh';
import fr from './fr';
import fi from './fi';
import bn from './bn';
import pt from './pt';
import pl from './pl';
import ro from './ro';
import id from './id';
import is from './is';
import pcm from './pcm';
import sw from './sw';
import te from './te';
import ur from './ur';
import fa from './fa';
import tr from './tr';

// =============================================================================
// CENTRAL CONFIGURATION - Single source of truth for all locales
// =============================================================================

/**
 * Main locale configuration. Each locale needs:
 * - name: Display name in the locale's own language
 * - flagCode: circle-flags code (https://hatscripts.github.io/circle-flags/)
 * - flagUrl: (optional) Custom flag URL to override the circle-flags CDN
 * - intlCode: BCP 47 code for Intl.DateTimeFormat
 * - translations: The imported translation object
 * - inDropdown: Whether to show in language picker (false for 'en' since aliases cover it)
 * - dropdownOrder: Sort order in dropdown (alphabetical by English name)
 * - hasLogo: Whether this locale has translated logo images in /public/images/{locale}/
 */
const localeConfig = {
  en: {
    name: 'English',
    flagCode: 'us',
    intlCode: 'en-US',
    translations: en,
    inDropdown: false,
    dropdownOrder: 999, // Not shown
    hasLogo: true,
  },
  ar: {
    name: 'العربية',
    flagCode: 'sa',
    intlCode: 'ar-EG',
    translations: ar,
    inDropdown: true,
    dropdownOrder: 10, // Arabic
    hasLogo: true,
  },
  bn: {
    name: 'বাংলা',
    flagCode: 'bd',
    intlCode: 'bn-BD',
    translations: bn,
    inDropdown: true,
    dropdownOrder: 15, // Bengali
    hasLogo: false,
  },
  eu: {
    name: 'Euskara',
    flagCode: 'es-pv', // Basque Country regional flag
    intlCode: 'eu-ES',
    translations: eu,
    inDropdown: true,
    dropdownOrder: 20, // Basque
    hasLogo: false,
  },
  fa: {
    name: 'فارسی',
    flagCode: 'ir',
    flagUrl: '/flags/iran.png', // Lion and Sun flag
    intlCode: 'fa-IR',
    translations: fa,
    inDropdown: true,
    dropdownOrder: 50,
    hasLogo: false,
  },
  fi: {
    name: 'Suomi',
    flagCode: 'fi',
    intlCode: 'fi-FI',
    translations: fi,
    inDropdown: true,
    dropdownOrder: 55, // Finnish
    hasLogo: false,
  },
  zh: {
    name: '中文',
    flagCode: 'cn',
    intlCode: 'zh-CN',
    translations: zh,
    inDropdown: true,
    dropdownOrder: 25, // Chinese
    hasLogo: false,
  },
  hr: {
    name: 'Hrvatski',
    flagCode: 'hr',
    intlCode: 'hr-HR',
    translations: hr,
    inDropdown: true,
    dropdownOrder: 26, // Croatian
    hasLogo: false,
  },
  cs: {
    name: 'Čeština',
    flagCode: 'cz',
    intlCode: 'cs-CZ',
    translations: cs,
    inDropdown: true,
    dropdownOrder: 28, // Czech
    hasLogo: false,
  },
  cy: {
    name: 'Cymraeg',
    flagCode: 'gb-wls', // Wales regional flag
    intlCode: 'cy-GB',
    translations: cy,
    inDropdown: true,
    dropdownOrder: 195, // Welsh
    hasLogo: false,
  },
  'nl-BE': {
    name: 'Nederlands',
    subtitle: 'België',
    flagCode: 'be',
    intlCode: 'nl-BE',
    translations: nlBE,
    inDropdown: true,
    dropdownOrder: 30, // Dutch (Belgium)
    hasLogo: false,
  },
  fr: {
    name: 'Français',
    flagCode: 'fr',
    intlCode: 'fr-FR',
    translations: fr,
    inDropdown: true,
    dropdownOrder: 60, // French
    hasLogo: false,
  },
  de: {
    name: 'Deutsch',
    flagCode: 'de',
    intlCode: 'de-DE',
    translations: de,
    inDropdown: true,
    dropdownOrder: 70, // German
    hasLogo: false,
  },
  el: {
    name: 'Ελληνικά',
    flagCode: 'gr',
    intlCode: 'el-GR',
    translations: el,
    inDropdown: true,
    dropdownOrder: 72, // Greek
    hasLogo: false,
  },
  da: {
    name: 'Dansk',
    flagCode: 'dk',
    intlCode: 'da-DK',
    translations: da,
    inDropdown: true,
    dropdownOrder: 65, // Danish
    hasLogo: false,
  },
  hi: {
    name: 'हिन्दी',
    flagCode: 'in',
    intlCode: 'hi-IN',
    translations: hi,
    inDropdown: true,
    dropdownOrder: 75, // Hindi
    hasLogo: true,
  },
  hu: {
    name: 'Magyar',
    flagCode: 'hu',
    intlCode: 'hu-HU',
    translations: hu,
    inDropdown: true,
    dropdownOrder: 78, // Hungarian
    hasLogo: false,
  },
  ga: {
    name: 'Gaeilge',
    flagCode: 'ie',
    intlCode: 'ga-IE',
    translations: ga,
    inDropdown: true,
    dropdownOrder: 80, // Irish
    hasLogo: false,
  },
  is: {
    name: 'Íslenska',
    flagCode: 'is',
    intlCode: 'is-IS',
    translations: is,
    inDropdown: true,
    dropdownOrder: 82, // Icelandic
    hasLogo: false,
  },
  id: {
    name: 'Bahasa Indonesia',
    flagCode: 'id',
    intlCode: 'id-ID',
    translations: id,
    inDropdown: true,
    dropdownOrder: 85, // Indonesian
    hasLogo: false,
  },
  it: {
    name: 'Italiano',
    flagCode: 'it',
    intlCode: 'it-IT',
    translations: it,
    inDropdown: true,
    dropdownOrder: 90, // Italian
    hasLogo: false,
  },
  ja: {
    name: '日本語',
    flagCode: 'jp',
    intlCode: 'ja-JP',
    translations: ja,
    inDropdown: true,
    dropdownOrder: 100, // Japanese
    hasLogo: true,
  },
  ko: {
    name: '한국어',
    flagCode: 'kr',
    intlCode: 'ko-KR',
    translations: ko,
    inDropdown: true,
    dropdownOrder: 110, // Korean
    hasLogo: false,
  },
  lv: {
    name: 'Latviešu',
    flagCode: 'lv',
    intlCode: 'lv-LV',
    translations: lv,
    inDropdown: true,
    dropdownOrder: 120, // Latvian
    hasLogo: false,
  },
  no: {
    name: 'Norsk',
    flagCode: 'no',
    intlCode: 'nb-NO',
    translations: no,
    inDropdown: true,
    dropdownOrder: 130, // Norwegian
    hasLogo: false,
  },
  pcm: {
    name: 'Naijá',
    flagCode: 'ng',
    intlCode: 'en-NG',
    translations: pcm,
    inDropdown: true,
    dropdownOrder: 135, // Nigerian Pidgin
    hasLogo: false,
  },
  pt: {
    name: 'Português',
    flagCode: 'pt',
    intlCode: 'pt-PT',
    translations: pt,
    inDropdown: true,
    dropdownOrder: 140, // Portuguese
    hasLogo: false,
  },
  pl: {
    name: 'Polski',
    flagCode: 'pl',
    intlCode: 'pl-PL',
    translations: pl,
    inDropdown: true,
    dropdownOrder: 150, // Polish
    hasLogo: false,
  },
  ro: {
    name: 'Română',
    flagCode: 'ro',
    intlCode: 'ro-RO',
    translations: ro,
    inDropdown: true,
    dropdownOrder: 155, // Romanian
    hasLogo: false,
  },
  sr: {
    name: 'Српски',
    flagCode: 'rs',
    intlCode: 'sr-RS',
    translations: sr,
    inDropdown: true,
    dropdownOrder: 158, // Serbian
    hasLogo: false,
  },
  sl: {
    name: 'Slovenščina',
    flagCode: 'si',
    intlCode: 'sl-SI',
    translations: sl,
    inDropdown: true,
    dropdownOrder: 159, // Slovenian
    hasLogo: false,
  },
  es: {
    name: 'Español',
    flagCode: 'es',
    intlCode: 'es-ES',
    translations: es,
    inDropdown: true,
    dropdownOrder: 160, // Spanish
    hasLogo: false,
  },
  sv: {
    name: 'Svenska',
    flagCode: 'se',
    intlCode: 'sv-SE',
    translations: sv,
    inDropdown: true,
    dropdownOrder: 170, // Swedish
    hasLogo: false,
  },
  sw: {
    name: 'Kiswahili',
    flagCode: 'tz',
    intlCode: 'sw-TZ',
    translations: sw,
    inDropdown: true,
    dropdownOrder: 175, // Swahili
    hasLogo: false,
  },
  ph: {
    name: 'Tagalog',
    flagCode: 'ph',
    intlCode: 'fil-PH',
    translations: ph,
    inDropdown: true,
    dropdownOrder: 180, // Tagalog
    hasLogo: false,
  },
  te: {
    name: 'తెలుగు',
    flagCode: 'in',
    intlCode: 'te-IN',
    translations: te,
    inDropdown: true,
    dropdownOrder: 185, // Telugu
    hasLogo: false,
  },
  tr: {
    name: 'Türkçe',
    flagCode: 'tr',
    intlCode: 'tr-TR',
    translations: tr,
    inDropdown: true,
    dropdownOrder: 187, // Turkish
    hasLogo: false,
  },
  uk: {
    name: 'Українська',
    flagCode: 'ua',
    intlCode: 'uk-UA',
    translations: uk,
    inDropdown: true,
    dropdownOrder: 190, // Ukrainian
    hasLogo: true,
  },
  ur: {
    name: 'اردو',
    flagCode: 'pk',
    intlCode: 'ur-PK',
    translations: ur,
    inDropdown: true,
    dropdownOrder: 192, // Urdu
    hasLogo: false,
  },
} as const;

/**
 * Alias configuration for regional variants that share translations.
 * Each alias points to a base locale but has its own name/flagCode in the dropdown.
 */
const aliasConfig = {
  'nl-NL': {
    name: 'Nederlands',
    flagCode: 'nl',
    target: 'nl-BE' as const,
    dropdownOrder: 35, // Dutch (Netherlands) - after Dutch (Belgium)
  },
  'en-us': {
    name: 'English',
    subtitle: 'American',
    flagCode: 'us',
    target: 'en' as const,
    dropdownOrder: 40, // English variants start here
  },
  'en-au': {
    name: 'English',
    subtitle: 'Australian',
    flagCode: 'au',
    target: 'en' as const,
    dropdownOrder: 41,
  },
  'en-ca': {
    name: 'English',
    subtitle: 'Canadian',
    flagCode: 'ca',
    target: 'en' as const,
    dropdownOrder: 42,
  },
  'en-ie': {
    name: 'English',
    subtitle: 'Irish',
    flagCode: 'ie',
    target: 'en' as const,
    dropdownOrder: 43,
  },
  'en-sc': {
    name: 'English',
    subtitle: 'Scotch',
    flagCode: 'gb-sct', // Scotland regional flag
    target: 'en' as const,
    dropdownOrder: 44,
  },
  'en-gb': {
    name: 'English',
    subtitle: '(actual)',
    flagCode: 'gb',
    target: 'en' as const,
    dropdownOrder: 45,
  },
} as const;

// =============================================================================
// DERIVED TYPES - Automatically generated from config
// =============================================================================

export type Locale = keyof typeof localeConfig;
export type LocaleAlias = keyof typeof aliasConfig;
export type LocaleOrAlias = Locale | LocaleAlias;
export type DropdownLocale =
  | { [K in Locale]: typeof localeConfig[K]['inDropdown'] extends true ? K : never }[Locale]
  | LocaleAlias;

export type TranslationKey = keyof typeof en;

// =============================================================================
// DERIVED DATA - Automatically generated from config
// =============================================================================

// All core locales
export const locales = Object.keys(localeConfig) as Locale[];

// All aliases
export const localeAliases = Object.keys(aliasConfig) as LocaleAlias[];

// Translations record
export const translations: Record<Locale, typeof en> = Object.fromEntries(
  Object.entries(localeConfig).map(([key, config]) => [key, config.translations])
) as Record<Locale, typeof en>;

// Map aliases to their target locale
export const localeAliasMap: Record<LocaleAlias, Locale> = Object.fromEntries(
  Object.entries(aliasConfig).map(([key, config]) => [key, config.target])
) as Record<LocaleAlias, Locale>;

// Locales that have translated logo images
export const logoLocales: Locale[] = Object.entries(localeConfig)
  .filter(([, config]) => config.hasLogo)
  .map(([key]) => key as Locale);

// All locales shown in dropdown, sorted by dropdownOrder
export const allLocales: DropdownLocale[] = [
  ...Object.entries(localeConfig)
    .filter(([, config]) => config.inDropdown)
    .map(([key, config]) => ({ key: key as Locale, order: config.dropdownOrder })),
  ...Object.entries(aliasConfig)
    .map(([key, config]) => ({ key: key as LocaleAlias, order: config.dropdownOrder })),
]
  .sort((a, b) => a.order - b.order)
  .map(item => item.key) as DropdownLocale[];

// Display names for dropdown
export const localeNames: Record<DropdownLocale, string> = {
  ...Object.fromEntries(
    Object.entries(localeConfig)
      .filter(([, config]) => config.inDropdown)
      .map(([key, config]) => [key, config.name])
  ),
  ...Object.fromEntries(
    Object.entries(aliasConfig).map(([key, config]) => [key, config.name])
  ),
} as Record<DropdownLocale, string>;

// Flag codes for dropdown (circle-flags library codes)
export const localeFlagCodes: Record<DropdownLocale, string> = {
  ...Object.fromEntries(
    Object.entries(localeConfig)
      .filter(([, config]) => config.inDropdown)
      .map(([key, config]) => [key, config.flagCode])
  ),
  ...Object.fromEntries(
    Object.entries(aliasConfig).map(([key, config]) => [key, config.flagCode])
  ),
} as Record<DropdownLocale, string>;

// Explicit subtitles for dropdown (used as-is, no parsing)
export const localeSubtitles: Partial<Record<DropdownLocale, string>> = {
  ...Object.fromEntries(
    Object.entries(localeConfig)
      .filter(([, config]) => config.inDropdown && 'subtitle' in config)
      .map(([key, config]) => [key, (config as unknown as { subtitle: string }).subtitle])
  ),
  ...Object.fromEntries(
    Object.entries(aliasConfig)
      .filter(([, config]) => 'subtitle' in config)
      .map(([key, config]) => [key, (config as unknown as { subtitle: string }).subtitle])
  ),
} as Partial<Record<DropdownLocale, string>>;

// Custom flag URLs that override the CDN (for locales with flagUrl defined)
export const localeFlagUrls: Partial<Record<DropdownLocale, string>> = {
  ...Object.fromEntries(
    Object.entries(localeConfig)
      .filter(([, config]) => config.inDropdown && 'flagUrl' in config)
      .map(([key, config]) => [key, (config as { flagUrl: string }).flagUrl])
  ),
} as Partial<Record<DropdownLocale, string>>;

// Helper to get flag URL - checks for custom URL first, then falls back to CDN
export function getFlagUrl(flagCode: string, locale?: DropdownLocale): string {
  // If locale provided and has custom flag URL, use that
  if (locale && localeFlagUrls[locale]) {
    return localeFlagUrls[locale]!;
  }
  // Otherwise use circle-flags CDN
  return `https://cdn.jsdelivr.net/npm/circle-flags@1.0.1/flags/${flagCode}.svg`;
}

// =============================================================================
// FUNCTIONS
// =============================================================================

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
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return 'en';
}

export function getPathWithoutLocale(pathname: string): string {
  const allPrefixes = [...locales, ...localeAliases];
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
  if (locale === 'en') {
    return pathWithoutLocale;
  }
  return `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
}

// RTL language detection
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
export const isRTL = (locale: string): boolean =>
  RTL_LANGUAGES.includes(locale.split('-')[0]);

// Domain configuration from environment variables
// Set PUBLIC_DOMAIN at build time (e.g., "sidebadger.me")
const domain = import.meta.env.PUBLIC_DOMAIN || 'sidebadger.me';

export function getAppUrl(locale: Locale = 'en'): string {
  const baseUrl = `https://demo.${domain}/dashboard`;
  if (locale === 'en') {
    return baseUrl;
  }
  return `${baseUrl}?lang=${locale}`;
}

export function getApiBaseUrl(): string {
  return `https://demo.${domain}`;
}

export function getFormattedDate(locale: Locale): string {
  const date = new Date();
  const intlCode = localeConfig[locale].intlCode;
  return new Intl.DateTimeFormat(intlCode, {
    year: 'numeric',
  }).format(date);
}

/**
 * Generate static paths for all locales.
 * Use this in getStaticPaths() to ensure all languages are included.
 */
export function getLocalePaths() {
  return [
    { params: { locale: undefined } }, // Default (English)
    ...locales.filter(l => l !== 'en').map(locale => ({ params: { locale } })),
    ...localeAliases.map(alias => ({ params: { locale: alias } })),
  ];
}
