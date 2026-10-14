/**
 * A parsed view of a built site, shared by the output rules (restructure 2.8).
 *
 * `loadDist()` reads the real `dist/`. `siteFromFiles()` builds the same model from in-memory
 * files, which is how the fixture tests feed each rule good and bad input.
 */
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { localeConfig, type Locale } from '../../i18n';
import { pageForPath } from '../../site/routes';
import { isIndexable as isIndexableByRegistry, reviewStatus } from '../../seo/indexability';

export { overrideLockPages } from '../../seo/indexability';
import type { PageDef } from '../../site/pages';

export const SITE_ORIGIN = 'https://sidebadger.me';

export interface SitePage {
  /** Path relative to the site root: `fr/pricing/index.html` */
  file: string;
  /** URL path: `/fr/pricing/`, or `/404.html` for the 404 page */
  urlPath: string;
  html: string;
  $: CheerioAPI;
  is404: boolean;
  /** The registry page and locale this file belongs to, if any */
  page?: PageDef;
  locale?: Locale;
}

export interface Site {
  /** Every file under the root, as forward-slash relative paths */
  files: string[];
  read(file: string): Buffer | undefined;
  exists(file: string): boolean;
  pages: SitePage[];
}

export function fileToUrlPath(file: string): string {
  if (file === '404.html') return '/404.html';
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

function buildPage(file: string, html: string): SitePage {
  const urlPath = fileToUrlPath(file);
  const is404 = file === '404.html';
  const match = is404 ? undefined : pageForPath(urlPath);
  return { file, urlPath, html, $: cheerio.load(html), is404, page: match?.page, locale: match?.locale };
}

function assemble(files: string[], read: (file: string) => Buffer | undefined): Site {
  const sorted = [...files].sort();
  const pages = sorted
    .filter(file => file.endsWith('.html'))
    .map(file => buildPage(file, read(file)!.toString('utf8')));
  const set = new Set(sorted);
  return { files: sorted, read, exists: file => set.has(file), pages };
}

export function siteFromFiles(files: Record<string, string | Buffer>): Site {
  const map = new Map(Object.entries(files).map(([name, body]) => [name, Buffer.from(body)]));
  return assemble([...map.keys()], file => map.get(file));
}

function walk(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).split('\\').join('/'));
  }
}

export function distRoot(): string {
  return resolve(process.env.SITE_DIST ?? 'dist');
}

export function loadDist(root = distRoot()): Site {
  if (!existsSync(root)) {
    throw new Error(`No build output at ${root}. Run "npm run build" before "npm run check:site".`);
  }
  const files: string[] = [];
  walk(root, root, files);
  return assemble(files, file => (existsSync(join(root, file)) ? readFileSync(join(root, file)) : undefined));
}

let cached: Site | undefined;
/** The real `dist/`, parsed once per test file */
export function dist(): Site {
  cached ??= loadDist();
  return cached;
}

// ---------------------------------------------------------------------------------------------
// Helpers shared by the rules

export function metaContent($: CheerioAPI, attr: 'name' | 'property', key: string): string[] {
  return $(`meta[${attr}="${key}"]`)
    .toArray()
    .map(el => ($(el).attr('content') ?? '').trim());
}

export function robotsDirectives($: CheerioAPI): string[] {
  return metaContent($, 'name', 'robots').flatMap(value =>
    value.toLowerCase().split(',').map(part => part.trim())
  );
}

/** True when the page asks for `noindex`, whatever the plan says it should do */
export function declaresNoindex(page: SitePage): boolean {
  return robotsDirectives(page.$).includes('noindex');
}

export function isPseudoPage(page: SitePage): boolean {
  return !!page.locale && (localeConfig[page.locale] as { pseudo?: true }).pseudo === true;
}

/**
 * Whether D8 (2.6) makes this page indexable, decided by `isIndexable(pageId, locale)` from
 * `src/seo/indexability.ts` (the module that also drives canonical, robots, the sitemap and
 * hreflang), never from what the page itself says, so a build that wrongly marks pages
 * `noindex` cannot pass. `undefined` means the file maps to no registry page (rule 1 reports it).
 */
export function indexability(page: SitePage): { indexable: boolean; reason: string } | undefined {
  if (page.is404) return { indexable: false, reason: 'the 404 page' };
  if (!page.page || !page.locale) return undefined;
  if (isPseudoPage(page)) return { indexable: false, reason: 'a pseudo-locale page' };
  if (page.$('[data-unpublished]').length > 0) return { indexable: false, reason: 'a page marked data-unpublished' };
  const indexable = isIndexableByRegistry(page.page.id, page.locale);
  if (page.page.indexing === 'english-only' && page.locale !== 'en') {
    return { indexable, reason: 'a localized legal page' };
  }
  const status = reviewStatus(page.page.id, page.locale);
  return { indexable, reason: page.locale === 'en' ? 'English (always reviewed)' : `review status "${status ?? 'none'}"` };
}

/** Indexable under D8. A file outside the registry falls back to what it declares. */
export function isIndexable(page: SitePage): boolean {
  return indexability(page)?.indexable ?? !declaresNoindex(page);
}

export function canonicalLinks(page: SitePage): string[] {
  return page.$('link[rel="canonical"]').toArray().map(el => (page.$(el).attr('href') ?? '').trim());
}

export function alternateLinks(page: SitePage): { hreflang: string; href: string }[] {
  return page.$('link[rel="alternate"][hreflang]').toArray().map(el => ({
    hreflang: (page.$(el).attr('hreflang') ?? '').trim(),
    href: (page.$(el).attr('href') ?? '').trim(),
  }));
}

/** Normalise whitespace so text compares equal across line breaks */
export function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Text nodes a visitor can see: script, style, noscript, template and the head are excluded */
export function visibleTextNodes($: CheerioAPI): { text: string; inEnglish: boolean }[] {
  const out: { text: string; inEnglish: boolean }[] = [];
  const skip = new Set(['script', 'style', 'noscript', 'template', 'head']);
  const visit = (node: any, inEnglish: boolean): void => {
    if (node.type === 'text') {
      const text = squash(node.data ?? '');
      if (text) out.push({ text, inEnglish });
      return;
    }
    if (node.type !== 'tag' && node.type !== 'root') return;
    if (node.type === 'tag' && skip.has(node.name)) return;
    const english = inEnglish || (node.type === 'tag' && /^en(-|$)/i.test(node.attribs?.lang ?? ''));
    for (const child of node.children ?? []) visit(child, english);
  };
  visit($.root().get(0), false);
  return out;
}

export function visibleText($: CheerioAPI): string {
  return visibleTextNodes($).map(node => node.text).join(' ');
}
