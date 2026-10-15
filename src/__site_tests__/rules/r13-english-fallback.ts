/** Rule 13: on a non-English page, visible text of 25+ characters identical to the English page's text must be on the locale's approved-identical list. [lang="en"] and [translate="no"] content is exempt. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import { load as loadYaml } from 'js-yaml';
import { marked } from 'marked';
import { contentDirs, RICH_TEXT_MARKED_OPTIONS } from '../../content/schemas';
import { getPage } from '../../site/pages';
import en from '../../i18n/en';
import { getI18nMode, type I18nMode } from '../../i18n';
import pendingKeys from '../../i18n/pending/keys.json';
import { isPseudoPage, squash, visibleTextNodes, type Site } from '../lib/site';
import { fileFor } from './r01-files';

export const MIN_LENGTH = 25;

/** Approved identical texts, keyed by locale. */
export type ApprovedIdentical = (locale: string, pageId?: string) => ReadonlySet<string>;

export interface LockFile {
  keys: Record<string, string>;
  identicalApproved: string[];
  pages: Record<string, string>;
}

/** The text nodes an English i18n value renders as. Values may hold inline HTML (`<br />`). */
export function renderedTexts(value: string): string[] {
  return visibleTextNodes(cheerio.load(value, null, false)).map(node => node.text);
}

/**
 * The approved list is `identicalApproved` in `src/i18n/locks/<locale>.json` (3.6, D15, written by
 * P04): i18n key names whose English value the locale keeps. Each key resolves to the text nodes
 * its English value renders as. A locale without a lock file approves nothing. A key that is not
 * in `en.ts` is an error, because a stale approval would silently approve nothing.
 */
export const approvedFromLocks: ApprovedIdentical = locale => {
  const file = resolve('src/i18n/locks', `${locale}.json`);
  if (!existsSync(file)) return new Set();
  return approvedFromLock(JSON.parse(readFileSync(file, 'utf8')) as LockFile, file);
};

/** The i18n mode and the keys `pending/keys.json` lists under `removed`. */
export interface LockContext {
  mode: I18nMode;
  removed: readonly string[];
}

/** The approved texts of one parsed lock file */
export function approvedFromLock(
  lock: LockFile,
  file: string,
  context: LockContext = { mode: getI18nMode(), removed: pendingKeys.removed as string[] },
): Set<string> {
  if (!Array.isArray(lock.identicalApproved)) {
    throw new Error(`${file}: identicalApproved must be an array of i18n keys`);
  }
  const english = en as Record<string, string>;
  const approved = new Set<string>();
  for (const key of lock.identicalApproved) {
    if (!Object.prototype.hasOwnProperty.call(english, key)) {
      // English-first: a key P13 removed from en.ts may stay in a lock until its translation group runs (D38)
      if (context.mode === 'english-first' && context.removed.includes(key)) continue;
      throw new Error(`${file}: identicalApproved lists "${key}", which is not a key in en.ts`);
    }
    for (const text of renderedTexts(english[key])) approved.add(text);
  }
  return approved;
}

/** The value at a dotted path (`example.people.0.name`) of a parsed YAML entry. */
function valueAt(data: unknown, path: string): unknown {
  let current: unknown = data;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * The text a content value (inline Markdown) renders as: the raw value plus the text nodes of its
 * inline-rendered HTML, so `[link](page:x)` and `**bold**` match what is on the page.
 */
export function renderedContentTexts(value: string): string[] {
  const html = marked.parseInline(value, RICH_TEXT_MARKED_OPTIONS) as string;
  return [value, ...renderedTexts(html)];
}

/** The approved texts of one parsed content entry: its `identicalApproved` paths, rendered. */
export function approvedFromEntry(data: Record<string, unknown>, file: string): Set<string> {
  const paths = data.identicalApproved;
  if (paths === undefined) return new Set();
  if (!Array.isArray(paths)) throw new Error(`${file}: identicalApproved must be an array of dotted paths`);
  const approved = new Set<string>();
  for (const path of paths as string[]) {
    const value = valueAt(data, path);
    if (typeof value !== 'string') throw new Error(`${file}: identicalApproved lists "${path}", which is not a text value`);
    for (const text of renderedContentTexts(value)) approved.add(text);
  }
  return approved;
}

/**
 * Content pages: the entry's own `identicalApproved` paths for this locale, found the way the site
 * does, through the page registry's `content` (collection and slug).
 */
export function approvedFromContent(locale: string, pageId?: string): Set<string> {
  const content = pageId ? getPage(pageId)?.content : undefined;
  if (!content) return new Set();
  const file = resolve('src/content', contentDirs[content.collection], content.slug, `${locale}.yaml`);
  if (!existsSync(file)) return new Set();
  return approvedFromEntry(loadYaml(readFileSync(file, 'utf8')) as Record<string, unknown>, file);
}

/** The lock files' approvals plus, on a content page, the entry's own. */
export const approvedFromLocksAndContent: ApprovedIdentical = (locale, pageId) =>
  new Set([...approvedFromLocks(locale), ...approvedFromContent(locale, pageId)]);

export function checkEnglishFallback(site: Site, approved: ApprovedIdentical = approvedFromLocksAndContent): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    if (page.is404 || !page.page || !page.locale || page.locale === 'en' || isPseudoPage(page)) continue;
    const englishFile = fileFor(page.page.id, 'en');
    const english = site.pages.find(candidate => candidate.file === englishFile);
    if (!english) {
      problems.push(`${page.urlPath}: the English page ${englishFile} is not in the build to compare with`);
      continue;
    }
    const englishTexts = new Set(visibleTextNodes(english.$).map(node => node.text));
    const allowed = approved(page.locale, page.page.id);
    const reported = new Set<string>();
    for (const node of visibleTextNodes(page.$)) {
      if (node.inEnglish || node.text.length < MIN_LENGTH) continue;
      if (!englishTexts.has(node.text) || allowed.has(node.text) || reported.has(node.text)) continue;
      reported.add(node.text);
      problems.push(`${page.urlPath}: English text left untranslated: "${node.text.slice(0, 80)}"`);
    }
  }
  return problems;
}
