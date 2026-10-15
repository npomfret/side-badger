/**
 * Which locales the language switcher may offer for the current page.
 *
 * A page in the registry is built only for some locales (its `locales` field, English-first
 * gaps), so the switcher offers exactly the locales `pathsFor(pageId)` generates. A path that
 * is not a registry page (the 404 page) keeps every built locale.
 */
import { getBuildLocales, type Locale } from '../i18n';
import { pageForPath, pathsFor } from '../site/routes';

export function offeredLocales(currentPath: string): Set<Locale> {
  const match = pageForPath(currentPath);
  if (!match) return new Set(getBuildLocales());
  return new Set(pathsFor(match.page.id).map(path => path.props.locale));
}
