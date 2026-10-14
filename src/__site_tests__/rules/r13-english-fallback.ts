/** Rule 13: on a non-English page, visible text of 25+ characters identical to the English page's text must be on the locale's approved-identical list. [lang="en"] content is exempt. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import en from '../../i18n/en';
import { isPseudoPage, squash, visibleTextNodes, type Site } from '../lib/site';
import { fileFor } from './r01-files';

export const MIN_LENGTH = 25;

/** Approved identical texts, keyed by locale. */
export type ApprovedIdentical = (locale: string) => ReadonlySet<string>;

/**
 * The approved list comes from `src/i18n/locks/<locale>.json` (D15, written by P04). Until P04
 * lands there are no lock files, so nothing is approved. Entries may be English texts or English
 * key names (`"cta.button"`), and are read from `approvedIdentical` or `identical` as an array or
 * as an object keyed by i18n key.
 */
export const approvedFromLocks: ApprovedIdentical = locale => {
  const file = resolve('src/i18n/locks', `${locale}.json`);
  const approved = new Set<string>();
  if (!existsSync(file)) return approved;
  const lock = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const raw = lock.approvedIdentical ?? lock.identical ?? [];
  const entries = Array.isArray(raw) ? raw : Object.keys(raw as object);
  for (const entry of entries as string[]) {
    approved.add(squash(entry));
    const fromKey = (en as Record<string, string>)[entry];
    if (fromKey) approved.add(squash(fromKey));
  }
  return approved;
};

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
