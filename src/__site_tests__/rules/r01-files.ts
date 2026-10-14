/** Rule 1: every HTML file maps to a registry page and locale (or is 404.html), every built page and locale has a file, and no alias directories exist. */
import { localeAliasMap, type Locale } from '../../i18n';
import { builtPages } from '../../site/pages';
import { pathsFor } from '../../site/routes';
import { localizedPath } from '../../seo/urls';
import type { Site } from '../lib/site';

export interface BuiltPair {
  pageId: string;
  locale: Locale;
}

/**
 * Every page/locale pair the build should produce, from the registry. `pathsFor` already leaves
 * out the pairs English-first mode (D38) excludes, the unpublished pages, and the pseudo-locales
 * unless PREVIEW_PSEUDO=1, so those are neither expected nor required.
 */
export function builtPairs(): BuiltPair[] {
  return builtPages().flatMap(page => pathsFor(page.id).map(path => path.props));
}

export function fileFor(pageId: string, locale: Locale): string {
  return `${localizedPath(pageId, locale).replace(/^\//, '')}index.html`;
}

export function expectedHtmlFiles(pairs: readonly BuiltPair[] = builtPairs()): Set<string> {
  return new Set(pairs.map(pair => fileFor(pair.pageId, pair.locale)));
}

export function checkFiles(site: Site, expected: Set<string> = expectedHtmlFiles()): string[] {
  const problems: string[] = [];
  for (const file of site.files.filter(name => name.endsWith('.html'))) {
    if (file === '404.html') continue;
    if (!expected.has(file)) {
      problems.push(`${file}: HTML file maps to no built registry page and locale`);
    }
  }
  for (const file of expected) {
    if (!site.exists(file)) problems.push(`${file}: expected from the registry but not built`);
  }
  const aliases = new Set(Object.keys(localeAliasMap));
  const topDirs = new Set(site.files.filter(file => file.includes('/')).map(file => file.split('/')[0]));
  for (const dir of topDirs) {
    if (aliases.has(dir)) problems.push(`${dir}/: alias directory exists (aliases are not pages)`);
  }
  return problems;
}
