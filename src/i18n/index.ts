import en from './en';

export type Locale = 'en';
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, typeof en> = { en };

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  return 'en';
}

export const locales: Locale[] = ['en'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
};
