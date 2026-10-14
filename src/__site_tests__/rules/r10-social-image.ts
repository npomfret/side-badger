/** Rule 10: og:image and twitter:image are absolute https URLs to a 1200x630 file that exists in the build. */
import sharp from 'sharp';
import { SITE_ORIGIN, metaContent, type Site } from '../lib/site';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export async function checkSocialImages(site: Site): Promise<string[]> {
  const problems: string[] = [];
  const dimensions = new Map<string, string>();

  for (const page of site.pages) {
    const sources: [string, string[]][] = [
      ['og:image', metaContent(page.$, 'property', 'og:image')],
      ['twitter:image', metaContent(page.$, 'name', 'twitter:image')],
    ];
    for (const [name, values] of sources) {
      const at = `${page.urlPath}: ${name}`;
      if (values.length !== 1 || values[0] === '') {
        problems.push(`${at} needs exactly one non-empty value (found ${values.length})`);
        continue;
      }
      const value = values[0];
      if (!value.startsWith('https://')) {
        problems.push(`${at} "${value}" is not an absolute https URL`);
        continue;
      }
      const url = new URL(value);
      if (url.origin !== SITE_ORIGIN) {
        problems.push(`${at} "${value}" is not served from ${SITE_ORIGIN}, so the build cannot hold it`);
        continue;
      }
      const file = decodeURI(url.pathname).slice(1);
      const body = site.read(file);
      if (!body) {
        problems.push(`${at} "${value}" has no file ${file} in the build`);
        continue;
      }
      let size = dimensions.get(file);
      if (size === undefined) {
        try {
          const meta = await sharp(body).metadata();
          size = `${meta.width}x${meta.height}`;
        } catch {
          size = 'unreadable';
        }
        dimensions.set(file, size);
      }
      if (size !== `${CARD_WIDTH}x${CARD_HEIGHT}`) {
        problems.push(`${at} "${value}" is ${size}, expected ${CARD_WIDTH}x${CARD_HEIGHT}`);
      }
    }
  }
  return problems;
}
