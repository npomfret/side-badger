import { describe, expect, it } from 'vitest';
import { checkImages } from './rules/r14-images';
import { dist } from './lib/site';
import { fx, mentions, one, sites } from './lib/fixtures';

describe('rule 14: images have alt, and content images have dimensions', () => {
  it('dist: every img', () => {
    expect(checkImages(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a content image with alt, width and height', () => {
      expect(checkImages(one('r14/content-ok.html'))).toEqual([]);
    });

    it('passes decorative images without dimensions', () => {
      expect(checkImages(one('r14/decorative-ok.html'))).toEqual([]);
    });

    it('fails an img with no alt attribute, even with dimensions', () => {
      expect(mentions(checkImages(one('r14/img-no-alt.html')), 'no alt attribute')).toBe(true);
    });

    it('fails a content image without width and height', () => {
      expect(mentions(checkImages(one('r14/content-img-no-size.html')), 'without width and height')).toBe(true);
    });

    it('treats an image with non-empty alt as content even when aria-hidden or role="presentation"', () => {
      const site = sites({
        'index.html': fx('r14/content-img-no-size.html').replace('alt="A chart"', 'alt="A chart" aria-hidden="true"'),
        'pricing/index.html': fx('r14/content-img-no-size.html').replace('alt="A chart"', 'alt="A chart" role="presentation"'),
      });
      const problems = checkImages(site);
      expect(mentions(problems, '/:', 'without width and height')).toBe(true);
      expect(mentions(problems, '/pricing/', 'without width and height')).toBe(true);
    });

    it('fails a content image with only a width', () => {
      expect(mentions(checkImages(one('r14/content-img-no-height.html')), 'without width and height')).toBe(true);
    });
  });
});
