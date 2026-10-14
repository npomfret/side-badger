/**
 * Every internal URL comes from here (restructure 2.1, D1, D28).
 *
 * All page URLs end with `/`: `/`, `/pricing/`, `/fr/pricing/`. English has no prefix, and a
 * regional alias is never a page (D3).
 */
import { getLocalizedPath, locales, type Locale } from '../i18n';
import { requirePage, type PageId } from '../site/pages';

const SITE_FALLBACK = 'https://sidebadger.me';

function siteOrigin(): string {
  return (import.meta.env.SITE as string | undefined) || SITE_FALLBACK;
}

/**
 * The URL path of a page in a locale: `/`, `/fr/` or `/fr/features/split-expenses/`.
 * Takes a registry page id (`'pricing'`) or a path (`'/pricing'`, `'/pricing/#faq'`). A path
 * that already carries a locale or alias prefix has it replaced.
 */
export function localizedPath(pageIdOrPath: PageId | (string & {}), locale: Locale): string {
  const path = pageIdOrPath.startsWith('/') ? pageIdOrPath : requirePage(pageIdOrPath).path;
  return getLocalizedPath(path, locale);
}

/** `https://sidebadger.me` plus a path. Uses `import.meta.env.SITE`. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).toString();
}

/** The absolute, slash-form URL of a page in a locale. */
export function canonicalFor(pageIdOrPath: PageId | (string & {}), locale: Locale): string {
  return absoluteUrl(localizedPath(pageIdOrPath, locale));
}

export type LaunchTarget = 'app' | 'register';

export interface LaunchOptions {
  /** `app` opens the dashboard, `register` opens sign-up. Default `app`. */
  target?: LaunchTarget;
  /** The link's position on the page: `hero`, `header`, `footer-cta`, … Default `link`. */
  cta?: string;
}

/**
 * A launch link through the first-party counter (D28): `/go/app/` or `/go/register/` with
 * `from` (the page id), `cta` (the position) and, outside English, `lang`. nginx answers with a
 * 302 to the production app, passes `lang` on only when it is a supported locale, and logs one
 * minimal line per click. Every link to the app is built here, so the destination changes in
 * one place. Give the link `rel="nofollow"`; robots.txt disallows `/go/`.
 *
 *   launchHref('feature/settle-up', 'fr', { target: 'register', cta: 'hero' })
 *   → /go/register/?from=feature/settle-up&cta=hero&lang=fr
 */
export function launchHref(
  pageId: PageId | 'not-found' | (string & {}),
  locale: Locale,
  { target = 'app', cta = 'link' }: LaunchOptions = {}
): string {
  // The slash in a page id is legal in a query string and easier to read in the log
  const encode = (value: string) => encodeURIComponent(value).replace(/%2F/g, '/');
  const params = [`from=${encode(pageId)}`, `cta=${encode(cta)}`];
  // Only a real locale is counted: English has no code, and pseudo-locales are not supported
  if (locale !== 'en' && (locales as readonly string[]).includes(locale)) {
    params.push(`lang=${encode(locale)}`);
  }
  return `/go/${target}/?${params.join('&')}`;
}
