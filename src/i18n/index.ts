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
 *    (an alias is only a display choice and a redirect, it is never built as a page; D3)
 *
 * Locale metadata (htmlLang, hreflang, ogLocale, dir, browserLanguages, fontScript) is derived
 * from the code and intlCode in `metaOverrides` and `fontScripts` below (D5). A new language
 * needs an entry in `fontScripts`, and in `metaOverrides` only when its tags differ from its code.
 */
import en from './en';
import pendingKeys from './pending/keys.json';
import pendingPages from './pending/pages.json';
import {
  PSEUDO_LOCALES,
  isPseudoLocale,
  previewPseudoEnabled,
  pseudoMeta,
  pseudoTranslations,
  type FontScript,
  type PseudoLocale,
} from './pseudo';
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
 * - intlCode: BCP 47 code for Intl.DateTimeFormat
 * - translations: The imported translation object
 * - inDropdown: Whether to show in language picker (false for 'en' since aliases cover it)
 * - dropdownOrder: Sort order in dropdown (alphabetical by English name)
 * - hasLogo: Whether this locale has translated logo images in /public/images/{locale}/
 */
const baseLocaleConfig = {
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
    dropdownOrder: 30, // Bengali
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
    intlCode: 'fa-IR',
    translations: fa,
    inDropdown: true,
    dropdownOrder: 250, // Persian
    hasLogo: false,
  },
  fi: {
    name: 'Suomi',
    flagCode: 'fi',
    intlCode: 'fi-FI',
    translations: fi,
    inDropdown: true,
    dropdownOrder: 100, // Finnish
    hasLogo: false,
  },
  zh: {
    name: '中文',
    flagCode: 'cn',
    intlCode: 'zh-CN',
    translations: zh,
    inDropdown: true,
    dropdownOrder: 40, // Chinese
    hasLogo: false,
  },
  hr: {
    name: 'Hrvatski',
    flagCode: 'hr',
    intlCode: 'hr-HR',
    translations: hr,
    inDropdown: true,
    dropdownOrder: 50, // Croatian
    hasLogo: false,
  },
  cs: {
    name: 'Čeština',
    flagCode: 'cz',
    intlCode: 'cs-CZ',
    translations: cs,
    inDropdown: true,
    dropdownOrder: 60, // Czech
    hasLogo: false,
  },
  cy: {
    name: 'Cymraeg',
    flagCode: 'gb-wls', // Wales regional flag
    intlCode: 'cy-GB',
    translations: cy,
    inDropdown: true,
    dropdownOrder: 390, // Welsh
    hasLogo: false,
  },
  'nl-BE': {
    name: 'Nederlands',
    subtitle: 'België',
    flagCode: 'be',
    intlCode: 'nl-BE',
    translations: nlBE,
    inDropdown: true,
    dropdownOrder: 80, // Dutch (Belgium)
    hasLogo: false,
  },
  fr: {
    name: 'Français',
    flagCode: 'fr',
    intlCode: 'fr-FR',
    translations: fr,
    inDropdown: true,
    dropdownOrder: 110, // French
    hasLogo: false,
  },
  de: {
    name: 'Deutsch',
    flagCode: 'de',
    intlCode: 'de-DE',
    translations: de,
    inDropdown: true,
    dropdownOrder: 120, // German
    hasLogo: false,
  },
  el: {
    name: 'Ελληνικά',
    flagCode: 'gr',
    intlCode: 'el-GR',
    translations: el,
    inDropdown: true,
    dropdownOrder: 130, // Greek
    hasLogo: false,
  },
  da: {
    name: 'Dansk',
    flagCode: 'dk',
    intlCode: 'da-DK',
    translations: da,
    inDropdown: true,
    dropdownOrder: 70, // Danish
    hasLogo: false,
  },
  hi: {
    name: 'हिन्दी',
    flagCode: 'in',
    intlCode: 'hi-IN',
    translations: hi,
    inDropdown: true,
    dropdownOrder: 140, // Hindi
    hasLogo: true,
  },
  hu: {
    name: 'Magyar',
    flagCode: 'hu',
    intlCode: 'hu-HU',
    translations: hu,
    inDropdown: true,
    dropdownOrder: 150, // Hungarian
    hasLogo: false,
  },
  ga: {
    name: 'Gaeilge',
    flagCode: 'ie',
    intlCode: 'ga-IE',
    translations: ga,
    inDropdown: true,
    dropdownOrder: 180, // Irish (Gaelic)
    hasLogo: false,
  },
  is: {
    name: 'Íslenska',
    flagCode: 'is',
    intlCode: 'is-IS',
    translations: is,
    inDropdown: true,
    dropdownOrder: 160, // Icelandic
    hasLogo: false,
  },
  id: {
    name: 'Bahasa Indonesia',
    flagCode: 'id',
    intlCode: 'id-ID',
    translations: id,
    inDropdown: true,
    dropdownOrder: 170, // Indonesian
    hasLogo: false,
  },
  it: {
    name: 'Italiano',
    flagCode: 'it',
    intlCode: 'it-IT',
    translations: it,
    inDropdown: true,
    dropdownOrder: 190, // Italian
    hasLogo: false,
  },
  ja: {
    name: '日本語',
    flagCode: 'jp',
    intlCode: 'ja-JP',
    translations: ja,
    inDropdown: true,
    dropdownOrder: 200, // Japanese
    hasLogo: true,
  },
  ko: {
    name: '한국어',
    flagCode: 'kr',
    intlCode: 'ko-KR',
    translations: ko,
    inDropdown: true,
    dropdownOrder: 210, // Korean
    hasLogo: true,
  },
  lv: {
    name: 'Latviešu',
    flagCode: 'lv',
    intlCode: 'lv-LV',
    translations: lv,
    inDropdown: true,
    dropdownOrder: 220, // Latvian
    hasLogo: false,
  },
  no: {
    name: 'Norsk',
    flagCode: 'no',
    intlCode: 'nb-NO',
    translations: no,
    inDropdown: true,
    dropdownOrder: 240, // Norwegian
    hasLogo: false,
  },
  pcm: {
    name: 'Naijá',
    flagCode: 'ng',
    intlCode: 'en-NG',
    translations: pcm,
    inDropdown: true,
    dropdownOrder: 230, // Nigerian Pidgin
    hasLogo: false,
  },
  pt: {
    name: 'Português',
    flagCode: 'pt',
    intlCode: 'pt-PT',
    translations: pt,
    inDropdown: true,
    dropdownOrder: 270, // Portuguese
    hasLogo: false,
  },
  pl: {
    name: 'Polski',
    flagCode: 'pl',
    intlCode: 'pl-PL',
    translations: pl,
    inDropdown: true,
    dropdownOrder: 260, // Polish
    hasLogo: false,
  },
  ro: {
    name: 'Română',
    flagCode: 'ro',
    intlCode: 'ro-RO',
    translations: ro,
    inDropdown: true,
    dropdownOrder: 280, // Romanian
    hasLogo: false,
  },
  sr: {
    name: 'Српски',
    flagCode: 'rs',
    intlCode: 'sr-RS',
    translations: sr,
    inDropdown: true,
    dropdownOrder: 290, // Serbian
    hasLogo: false,
  },
  sl: {
    name: 'Slovenščina',
    flagCode: 'si',
    intlCode: 'sl-SI',
    translations: sl,
    inDropdown: true,
    dropdownOrder: 300, // Slovenian
    hasLogo: false,
  },
  es: {
    name: 'Español',
    flagCode: 'es',
    intlCode: 'es-ES',
    translations: es,
    inDropdown: true,
    dropdownOrder: 310, // Spanish
    hasLogo: false,
  },
  sv: {
    name: 'Svenska',
    flagCode: 'se',
    intlCode: 'sv-SE',
    translations: sv,
    inDropdown: true,
    dropdownOrder: 330, // Swedish
    hasLogo: false,
  },
  sw: {
    name: 'Kiswahili',
    flagCode: 'tz',
    intlCode: 'sw-TZ',
    translations: sw,
    inDropdown: true,
    dropdownOrder: 320, // Swahili
    hasLogo: false,
  },
  ph: {
    name: 'Tagalog',
    flagCode: 'ph',
    intlCode: 'fil-PH',
    translations: ph,
    inDropdown: true,
    dropdownOrder: 340, // Tagalog
    hasLogo: false,
  },
  te: {
    name: 'తెలుగు',
    flagCode: 'in',
    intlCode: 'te-IN',
    translations: te,
    inDropdown: true,
    dropdownOrder: 350, // Telugu
    hasLogo: false,
  },
  tr: {
    name: 'Türkçe',
    flagCode: 'tr',
    intlCode: 'tr-TR',
    translations: tr,
    inDropdown: true,
    dropdownOrder: 360, // Turkish
    hasLogo: false,
  },
  uk: {
    name: 'Українська',
    flagCode: 'ua',
    intlCode: 'uk-UA',
    translations: uk,
    inDropdown: true,
    dropdownOrder: 370, // Ukrainian
    hasLogo: true,
  },
  ur: {
    name: 'اردو',
    flagCode: 'pk',
    intlCode: 'ur-PK',
    translations: ur,
    inDropdown: true,
    dropdownOrder: 380, // Urdu
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
    dropdownOrder: 81, // Dutch (Netherlands)
  },
  'en-us': {
    name: 'English',
    subtitle: 'American',
    flagCode: 'us',
    target: 'en' as const,
    dropdownOrder: 90, // English (American)
  },
  'en-au': {
    name: 'English',
    subtitle: 'Australian',
    flagCode: 'au',
    target: 'en' as const,
    dropdownOrder: 91, // English (Australian)
  },
  'en-gb': {
    name: 'English',
    subtitle: '(actual)',
    flagCode: 'gb',
    target: 'en' as const,
    dropdownOrder: 92, // English (British)
  },
  'en-ca': {
    name: 'English',
    subtitle: 'Canadian',
    flagCode: 'ca',
    target: 'en' as const,
    dropdownOrder: 93, // English (Canadian)
  },
  'en-ie': {
    name: 'English',
    subtitle: 'Irish',
    flagCode: 'ie',
    target: 'en' as const,
    dropdownOrder: 94, // English (Irish)
  },
  'en-sc': {
    name: 'English',
    subtitle: 'Scotch',
    flagCode: 'gb-sct', // Scotland regional flag
    target: 'en' as const,
    dropdownOrder: 95, // English (Scotch)
  },
} as const;

// =============================================================================
// LOCALE METADATA (D5, D35) - derived from the config above
// =============================================================================

type BaseConfig = typeof baseLocaleConfig;

/** The locales that have a translation file and a real URL prefix. */
export type RealLocale = keyof BaseConfig;

/** Which font family set a locale needs (restructure D24). Read by the homepage task's H4. */
export type { FontScript, PseudoLocale };

export interface LocaleMeta {
  /** Value of `<html lang>` */
  htmlLang: string;
  /** Value of `hreflang` alternates (a valid ISO 639 tag, not necessarily the URL prefix) */
  hreflang: string;
  /** Value of `og:locale` */
  ogLocale: string;
  dir: 'ltr' | 'rtl';
  /** Lower-case browser language subtags that select this locale */
  browserLanguages: readonly string[];
  fontScript: FontScript;
}

/** Only where a tag differs from the locale code. The `ph` row is D35. */
const metaOverrides: Partial<
  Record<RealLocale, Partial<Pick<LocaleMeta, 'htmlLang' | 'hreflang' | 'browserLanguages'>>>
> = {
  // `ph` is a path prefix, not a language. Tagalog is `tl` for alternates and `fil` for the document.
  ph: { htmlLang: 'fil', hreflang: 'tl', browserLanguages: ['fil', 'tl'] },
  // zh-Hans selects Simplified glyphs; the alternate covers all Chinese readers
  zh: { htmlLang: 'zh-Hans', hreflang: 'zh', browserLanguages: ['zh'] },
  no: { browserLanguages: ['no', 'nb', 'nn'] },
  'nl-BE': { browserLanguages: ['nl'] },
};

const rtlLocales: readonly RealLocale[] = ['ar', 'fa', 'ur'];

const fontScripts: Record<RealLocale, FontScript> = {
  en: 'latin', cs: 'latin', cy: 'latin', da: 'latin', de: 'latin', es: 'latin', eu: 'latin',
  fi: 'latin', fr: 'latin', ga: 'latin', hr: 'latin', hu: 'latin', id: 'latin', is: 'latin',
  it: 'latin', lv: 'latin', 'nl-BE': 'latin', no: 'latin', pcm: 'latin', ph: 'latin', pl: 'latin',
  pt: 'latin', ro: 'latin', sl: 'latin', sv: 'latin', sw: 'latin', tr: 'latin',
  el: 'cyrillic-greek', sr: 'cyrillic-greek', uk: 'cyrillic-greek',
  ar: 'arabic', fa: 'arabic', ur: 'arabic',
  hi: 'devanagari', bn: 'bengali', te: 'telugu',
  ja: 'cjk', ko: 'cjk', zh: 'cjk',
};

function deriveMeta(code: RealLocale, intlCode: string): LocaleMeta {
  const override = metaOverrides[code] ?? {};
  return {
    htmlLang: override.htmlLang ?? code,
    hreflang: override.hreflang ?? code,
    ogLocale: intlCode.replace('-', '_'),
    dir: rtlLocales.includes(code) ? 'rtl' : 'ltr',
    browserLanguages: override.browserLanguages ?? [code.toLowerCase()],
    fontScript: fontScripts[code],
  };
}

const realLocaleConfig = Object.fromEntries(
  Object.entries(baseLocaleConfig).map(([code, config]) => [
    code,
    { ...config, ...deriveMeta(code as RealLocale, config.intlCode) },
  ])
) as unknown as { [K in RealLocale]: BaseConfig[K] & LocaleMeta };

interface PseudoEntry extends LocaleMeta {
  name: string;
  flagCode: string;
  intlCode: string;
  inDropdown: false;
  dropdownOrder: number;
  hasLogo: false;
  pseudo: true;
}

const pseudoLocaleConfig = Object.fromEntries(
  PSEUDO_LOCALES.map(code => {
    const meta = pseudoMeta[code];
    const entry: PseudoEntry = {
      name: meta.name,
      flagCode: 'xx',
      intlCode: meta.intlCode,
      inDropdown: false,
      dropdownOrder: 999,
      hasLogo: false,
      pseudo: true,
      htmlLang: meta.htmlLang,
      hreflang: meta.htmlLang,
      ogLocale: meta.intlCode.replace('-', '_'),
      dir: meta.dir,
      browserLanguages: [],
      fontScript: meta.fontScript,
    };
    return [code, entry];
  })
) as Record<PseudoLocale, PseudoEntry>;

/**
 * Every locale's configuration, with the derived metadata. The four preview pseudo-locales
 * (D38) are described here so components can read their `dir` and `fontScript`, but they are
 * not in `locales`, and no route is built for them unless PREVIEW_PSEUDO=1.
 */
export const localeConfig = { ...realLocaleConfig, ...pseudoLocaleConfig };

// =============================================================================
// DERIVED TYPES - Automatically generated from config
// =============================================================================

export type Locale = RealLocale | PseudoLocale;
export type LocaleAlias = keyof typeof aliasConfig;
export type LocaleOrAlias = Locale | LocaleAlias;
export type DropdownLocale =
  | { [K in Locale]: typeof localeConfig[K]['inDropdown'] extends true ? K : never }[Locale]
  | LocaleAlias;

export type TranslationKey = keyof typeof en;

// =============================================================================
// DERIVED DATA - Automatically generated from config
// =============================================================================

// The real locales (never the pseudo-locales): hreflang, language detection, nginx, tests
export const locales = Object.keys(realLocaleConfig) as RealLocale[];

// Preview pseudo-locales (D38)
export const pseudoLocales: readonly PseudoLocale[] = PSEUDO_LOCALES;
export { isPseudoLocale };

// All aliases
export const localeAliases = Object.keys(aliasConfig) as LocaleAlias[];

// Translations record (real locales only; pseudo-locale text is generated on demand)
export const translations: Record<RealLocale, typeof en> = Object.fromEntries(
  Object.entries(realLocaleConfig).map(([key, config]) => [key, config.translations])
) as Record<RealLocale, typeof en>;

const pseudoTables = new Map<PseudoLocale, typeof en>();
function pseudoTable(locale: PseudoLocale): typeof en {
  let table = pseudoTables.get(locale);
  if (!table) {
    table = pseudoTranslations(en as Record<string, string>, locale) as typeof en;
    pseudoTables.set(locale, table);
  }
  return table;
}

// Map aliases to their target locale
export const localeAliasMap: Record<LocaleAlias, RealLocale> = Object.fromEntries(
  Object.entries(aliasConfig).map(([key, config]) => [key, config.target])
) as Record<LocaleAlias, RealLocale>;

// Locales that have translated logo images
export const logoLocales: Locale[] = Object.entries(realLocaleConfig)
  .filter(([, config]) => config.hasLogo)
  .map(([key]) => key as Locale);

// All locales shown in dropdown, sorted by dropdownOrder
export const allLocales: DropdownLocale[] = [
  ...Object.entries(realLocaleConfig)
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
    Object.entries(realLocaleConfig)
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
    Object.entries(realLocaleConfig)
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
    Object.entries(realLocaleConfig)
      .filter(([, config]) => config.inDropdown && 'subtitle' in config)
      .map(([key, config]) => [key, (config as unknown as { subtitle: string }).subtitle])
  ),
  ...Object.fromEntries(
    Object.entries(aliasConfig)
      .filter(([, config]) => 'subtitle' in config)
      .map(([key, config]) => [key, (config as unknown as { subtitle: string }).subtitle])
  ),
} as Partial<Record<DropdownLocale, string>>;

/**
 * Flags are served from `public/flags/` (D24, B34), never from a CDN. Every flag is an SVG
 * under 2 KB except Iran's Lion and Sun, which is a 48px PNG derived from the old artwork.
 * `locale` is accepted for compatibility; the file is chosen by flag code alone.
 */
const rasterFlags: ReadonlySet<string> = new Set(['ir']);

export function getFlagUrl(flagCode: string, _locale?: DropdownLocale): string {
  return `/flags/${flagCode}.${rasterFlags.has(flagCode) ? 'png' : 'svg'}`;
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
  const table = isPseudoLocale(locale) ? pseudoTable(locale) : translations[locale];
  return table?.[key] ?? translations.en[key] ?? key;
}

const PLACEHOLDER = /\{([A-Za-z_]\w*)\}/g;

/**
 * Translate a string and fill its `{placeholder}` tokens (D13). Word order differs between
 * languages, so sentences are never built from fragments. A placeholder with no value is a
 * bug in the caller, so it throws rather than shipping `{name}` to visitors.
 */
export function tf(
  key: TranslationKey,
  params: Record<string, string | number>,
  locale: Locale = 'en'
): string {
  return t(key, locale).replace(PLACEHOLDER, (_token, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error(`tf("${key}", …, "${locale}"): no value for {${name}}`);
    }
    return String(params[name]);
  });
}

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return localeConfig[locale];
}

/** The locale a browser language tag selects (`nl-NL` → `nl-BE`, `nb` → `no`, `fil` → `ph`). */
export function localeForBrowserLanguage(tag: string): RealLocale | undefined {
  const lower = tag.toLowerCase();
  const candidates = [lower, lower.split('-')[0]];
  for (const candidate of candidates) {
    const match = locales.find(l => localeConfig[l].browserLanguages.includes(candidate));
    if (match) return match;
  }
  return undefined;
}

const allPrefixedLocales = (): string[] => [...Object.keys(localeConfig), ...localeAliases];

export function getLocaleFromUrl(url: URL): Locale {
  const pathname = url.pathname;
  for (const locale of Object.keys(localeConfig) as Locale[]) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return 'en';
}

export function getPathWithoutLocale(pathname: string): string {
  for (const prefix of allPrefixedLocales()) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return pathname.slice(prefix.length + 1);
    }
    if (pathname === `/${prefix}`) {
      return '/';
    }
  }
  return pathname;
}

/**
 * The slash form of a path (D1): `/pricing` → `/pricing/`. A path whose last segment has a
 * file extension (`/sitemap-index.xml`) is left alone, and so are a query string and hash.
 */
export function ensureTrailingSlash(pathname: string): string {
  const match = pathname.match(/^([^?#]*)([?#].*)?$/)!;
  let path = match[1] || '/';
  const suffix = match[2] ?? '';
  if (!path.startsWith('/')) path = `/${path}`;
  const last = path.split('/').pop() ?? '';
  if (!path.endsWith('/') && !last.includes('.')) path += '/';
  return path + suffix;
}

/** Always the slash form (D1). Aliases and an existing locale prefix are replaced. */
export function getLocalizedPath(pathname: string, locale: Locale): string {
  const slashed = ensureTrailingSlash(pathname);
  const suffixAt = slashed.search(/[?#]/);
  const path = suffixAt === -1 ? slashed : slashed.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? '' : slashed.slice(suffixAt);
  const base = ensureTrailingSlash(getPathWithoutLocale(path));
  return (locale === 'en' ? base : `/${locale}${base}`) + suffix;
}

// Right-to-left comes from each locale's `dir` (B30: there is no `he` locale)
export const isRTL = (locale: string): boolean => {
  const config =
    (localeConfig as Record<string, LocaleMeta | undefined>)[locale] ??
    (localeConfig as Record<string, LocaleMeta | undefined>)[locale.split('-')[0]];
  return config?.dir === 'rtl';
};

// Domain configuration from environment variables
// Set PUBLIC_DOMAIN at build time (e.g., "sidebadger.me")
const domain = import.meta.env.PUBLIC_DOMAIN || 'sidebadger.me';

// The external app, which also serves the policy API
const appOrigin = `https://app.${domain}`;

export function getAppUrl(locale: Locale = 'en'): string {
  const baseUrl = `${appOrigin}/dashboard`;
  if (locale === 'en') {
    return baseUrl;
  }
  return `${baseUrl}?lang=${locale}`;
}

export function getFormattedDate(locale: Locale): string {
  const date = new Date();
  const intlCode = localeConfig[locale].intlCode;
  return new Intl.DateTimeFormat(intlCode, {
    year: 'numeric',
  }).format(date);
}

// =============================================================================
// WHICH LOCALES GET ROUTES (D38)
// =============================================================================

export type I18nMode = 'strict' | 'english-first';

/** `I18N_MODE`: `strict` (the default) or `english-first`. Read on every call. */
export function getI18nMode(): I18nMode {
  const mode = (typeof process !== 'undefined' && process.env?.I18N_MODE) || 'strict';
  if (mode !== 'strict' && mode !== 'english-first') {
    throw new Error(`I18N_MODE must be "strict" or "english-first" (got "${mode}")`);
  }
  return mode;
}

/** Keys the English file has, plus those `pending/keys.json` says were added. */
function requiredKeys(): string[] {
  return [...new Set([...Object.keys(en), ...(pendingKeys.added as string[])])];
}

/** English keys a locale lacks. Empty means the locale is complete. */
export function missingKeys(locale: RealLocale): string[] {
  const table = translations[locale] as Record<string, string>;
  return requiredKeys().filter(key => !(key in table));
}

/** Page ids listed in `pending/pages.json`: their non-English content is not written yet. */
export function pendingPageIds(): string[] {
  return pendingPages.added as string[];
}

/**
 * The locales to build routes for. Strict mode builds all of them. English-first mode builds
 * English and every locale that has every key, so no English fallback is ever built at a
 * localized URL. PREVIEW_PSEUDO=1 adds the four pseudo-locales.
 */
export function getBuildLocales(): Locale[] {
  const real =
    getI18nMode() === 'strict'
      ? [...locales]
      : locales.filter(locale => locale === 'en' || missingKeys(locale).length === 0);
  return [...real, ...(previewPseudoEnabled() ? PSEUDO_LOCALES : [])];
}

/**
 * Generate static paths for all built locales (no aliases, D3).
 * Use this in getStaticPaths() to ensure all languages are included.
 */
export function getLocalePaths() {
  return getBuildLocales().map(locale => ({
    params: { locale: locale === 'en' ? undefined : locale },
  }));
}
