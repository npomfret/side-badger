/** Rule 5: title and meta description are present and non-empty, and unique among indexable pages in the same locale. */
import { isIndexable, metaContent, type Site } from '../lib/site';

export function checkTitleDescription(site: Site): string[] {
  const problems: string[] = [];
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, key: string, url: string) =>
    map.set(key, [...(map.get(key) ?? []), url]);

  for (const page of site.pages) {
    const at = page.urlPath;
    const titleEls = page.$('head title');
    const title = titleEls.first().text().trim();
    if (titleEls.length !== 1 || title === '') problems.push(`${at}: needs exactly one non-empty <title>`);
    const found = metaContent(page.$, 'name', 'description');
    const description = found[0] ?? '';
    if (found.length !== 1 || description === '') {
      problems.push(`${at}: needs exactly one non-empty meta description`);
    }
    if (!isIndexable(page) || page.is404) continue;
    const locale = page.locale ?? '?';
    if (title) add(titles, `${locale}|${title}`, at);
    if (description) add(descriptions, `${locale}|${description}`, at);
  }
  for (const [key, urls] of titles) {
    if (urls.length > 1) problems.push(`duplicate title "${key.split('|')[1]}" on ${urls.join(', ')}`);
  }
  for (const [key, urls] of descriptions) {
    if (urls.length > 1) problems.push(`duplicate description "${key.split('|')[1]}" on ${urls.join(', ')}`);
  }
  return problems;
}
