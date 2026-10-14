/** Rule 14: every img has an alt attribute, and content images have width and height. Decorative images (alt="", aria-hidden or role presentation) need no dimensions. */
import type { Site } from '../lib/site';

export function checkImages(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const { $ } = page;
    for (const el of $('img').toArray()) {
      const img = $(el);
      const src = img.attr('src') ?? '(no src)';
      const at = `${page.urlPath}: <img src="${src}">`;
      const alt = img.attr('alt');
      if (alt === undefined) {
        problems.push(`${at} has no alt attribute`);
        continue;
      }
      const decorative =
        alt === '' ||
        img.attr('aria-hidden') === 'true' ||
        img.attr('role') === 'presentation' ||
        img.attr('role') === 'none';
      if (decorative) continue;
      if (!img.attr('width') || !img.attr('height')) problems.push(`${at} is a content image without width and height`);
    }
  }
  return problems;
}
