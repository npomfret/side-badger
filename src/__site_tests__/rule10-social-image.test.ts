import { beforeAll, describe, expect, it } from 'vitest';
import { checkSocialImages } from './rules/r10-social-image';
import { dist } from './lib/site';
import { mentions, one, png } from './lib/fixtures';

describe('rule 10: social images are absolute https URLs to 1200x630 files in the build', () => {
  it('dist: every page', async () => {
    expect(await checkSocialImages(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    let files: Record<string, Buffer>;
    beforeAll(async () => {
      files = { 'og/default-en.png': await png(1200, 630), 'og/logo.png': await png(1200, 377) };
    });

    it('passes a 1200x630 card, ignoring the ?v= hash', async () => {
      expect(await checkSocialImages(one('good/home.html', 'index.html', files))).toEqual([]);
    });

    it('fails a relative image URL', async () => {
      expect(mentions(await checkSocialImages(one('r10/relative-og-image.html', 'index.html', files)), 'og:image', 'not an absolute https URL')).toBe(true);
    });

    it('fails a plain http image URL', async () => {
      expect(mentions(await checkSocialImages(one('r10/http-og-image.html', 'index.html', files)), 'not an absolute https URL')).toBe(true);
    });

    it('fails a missing og:image', async () => {
      expect(mentions(await checkSocialImages(one('r10/no-og-image.html', 'index.html', files)), 'og:image needs exactly one')).toBe(true);
    });

    it('fails a missing twitter:image', async () => {
      expect(mentions(await checkSocialImages(one('r10/no-twitter-image.html', 'index.html', files)), 'twitter:image needs exactly one')).toBe(true);
    });

    it('fails a file that is not in the build', async () => {
      expect(mentions(await checkSocialImages(one('r10/missing-file.html', 'index.html', files)), 'og/nope.png')).toBe(true);
    });

    it('fails a 1200x377 logo used as the card (B2)', async () => {
      expect(mentions(await checkSocialImages(one('r10/wrong-size.html', 'index.html', files)), '1200x377', 'expected 1200x630')).toBe(true);
    });

    it('fails an image on another host', async () => {
      expect(mentions(await checkSocialImages(one('r10/foreign-host.html', 'index.html', files)), 'not served from')).toBe(true);
    });

    it('fails a file that is not an image', async () => {
      const site = one('good/home.html', 'index.html', { 'og/default-en.png': Buffer.from('not a png') });
      expect(mentions(await checkSocialImages(site), 'unreadable')).toBe(true);
    });
  });
});
