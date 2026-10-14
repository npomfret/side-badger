/** Rule 6: html[lang] equals the locale's htmlLang and dir equals its dir. */
import { localeConfig } from '../../i18n';
import type { Site } from '../lib/site';

export function checkLangDir(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    // The 404 page is English. Files with no registry match are rule 1's concern.
    const locale = page.is404 ? 'en' : page.locale;
    if (!locale) continue;
    const meta = localeConfig[locale];
    const html = page.$('html');
    if (html.attr('lang') !== meta.htmlLang) {
      problems.push(`${page.urlPath}: html lang is "${html.attr('lang')}", expected "${meta.htmlLang}"`);
    }
    if (html.attr('dir') !== meta.dir) {
      problems.push(`${page.urlPath}: html dir is "${html.attr('dir')}", expected "${meta.dir}"`);
    }
  }
  return problems;
}
