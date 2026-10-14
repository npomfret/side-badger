/** Rule 13: on a non-English page, visible text of 25+ characters identical to the English page's text must be on the locale's approved-identical list. [lang="en"] content is exempt. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import en from '../../i18n/en';
import { isPseudoPage, squash, visibleTextNodes, type Site } from '../lib/site';
import { fileFor } from './r01-files';

export const MIN_LENGTH = 25;

/** Approved identical texts, keyed by locale. */
export type ApprovedIdentical = (locale: string) => ReadonlySet<string>;

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

/** The approved texts of one parsed lock file */
export function approvedFromLock(lock: LockFile, file: string): Set<string> {
  if (!Array.isArray(lock.identicalApproved)) {
    throw new Error(`${file}: identicalApproved must be an array of i18n keys`);
  }
  const english = en as Record<string, string>;
  const approved = new Set<string>();
  for (const key of lock.identicalApproved) {
    if (!Object.prototype.hasOwnProperty.call(english, key)) {
      throw new Error(`${file}: identicalApproved lists "${key}", which is not a key in en.ts`);
    }
    for (const text of renderedTexts(english[key])) approved.add(text);
  }
  return approved;
}

export function checkEnglishFallback(site: Site, approved: ApprovedIdentical = approvedFromLocks): string[] {
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
    const allowed = approved(page.locale);
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
