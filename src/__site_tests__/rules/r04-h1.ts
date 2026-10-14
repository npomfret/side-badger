/** Rule 4: exactly one h1 per page, with text, and not visually hidden. */
import type { Site } from '../lib/site';

export function checkH1(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const h1s = page.$('h1');
    if (h1s.length !== 1) {
      problems.push(`${page.urlPath}: expected exactly one h1, found ${h1s.length}`);
      continue;
    }
    const h1 = h1s.first();
    if (h1.text().trim() === '') problems.push(`${page.urlPath}: h1 is empty`);
    if (h1.is('.sr-only') || h1.closest('.sr-only').length > 0) {
      problems.push(`${page.urlPath}: h1 is inside .sr-only`);
    }
  }
  return problems;
}
