/**
 * Rule 14: every img has an alt attribute, and content images have width and height. A decorative
 * image is one with `alt=""`, which is how HTML marks an image as conveying nothing. An image with
 * non-empty alt is content even when aria-hidden or role="presentation" is also set, because that
 * markup contradicts itself and would otherwise be a way around the dimension check.
 */
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
      if (alt.trim() === '') continue;
      if (!img.attr('width') || !img.attr('height')) problems.push(`${at} is a content image without width and height`);
    }
  }
  return problems;
}
