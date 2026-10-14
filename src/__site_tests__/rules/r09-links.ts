/** Rule 9: internal hrefs resolve to files, page links use the slash form, never an alias prefix, and stay in the page's locale (except language-switcher links). */
import { localeAliasMap } from '../../i18n';
import { pageForPath } from '../../site/routes';
import { SITE_ORIGIN, type Site } from '../lib/site';

const aliases = new Set(Object.keys(localeAliasMap));

/** The internal path of an href, or undefined for external, fragment-only and non-HTTP links */
export function internalPath(href: string): string | undefined {
  const value = href.trim();
  if (value === '' || value.startsWith('#')) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:/i.test(value)) return undefined; // mailto:, tel:, data:
  if (value.startsWith('//')) return undefined;
  let url: URL;
  try {
    url = new URL(value, SITE_ORIGIN);
  } catch {
    return undefined;
  }
  if (url.origin !== SITE_ORIGIN) return undefined;
  return decodeURI(url.pathname);
}

export function checkLinks(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const pageLocale = page.is404 ? 'en' : page.locale;
    for (const el of page.$('a[href], link[href]').toArray()) {
      const href = page.$(el).attr('href')!;
      const path = internalPath(href);
      if (path === undefined) continue;
      const at = `${page.urlPath}: <${(el as any).name} href="${href}">`;
      // /go/ is answered by nginx and has no file (D28); rule 15 checks its form
      if (path.startsWith('/go/')) continue;

      const first = path.split('/').filter(Boolean)[0];
      if (first && aliases.has(first)) problems.push(`${at} points at an alias prefix`);

      if (path.endsWith('/index.html')) problems.push(`${at} links to index.html instead of the slash form`);

      const lastSegment = path.split('/').pop() ?? '';
      let file: string;
      if (path.endsWith('/')) file = `${path.slice(1)}index.html`;
      else if (lastSegment.includes('.')) file = path.slice(1);
      else {
        problems.push(`${at} is a page link without the trailing slash`);
        continue;
      }
      if (!site.exists(file)) problems.push(`${at} resolves to no file (${file})`);

      if ((el as any).name === 'a') {
        const match = pageForPath(path);
        const switcher = page.$(el).closest('[data-locale-switch]').length > 0;
        if (match && pageLocale && match.locale !== pageLocale && !switcher) {
          problems.push(`${at} leaves the page's locale (${pageLocale} to ${match.locale})`);
        }
      }
    }
  }
  return problems;
}
