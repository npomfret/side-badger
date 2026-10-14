import { describe, expect, it } from 'vitest';
import { checkLaunchLinks } from './rules/r15-launch-links';
import { launchHref } from '../seo/urls';
import { dist, siteFromFiles } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 15: every app link goes through /go/ with from, cta, lang and nofollow', () => {
  it('dist: every link to the app', () => {
    expect(checkLaunchLinks(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes English links with no lang', () => {
      expect(checkLaunchLinks(one('r15/en-ok.html'))).toEqual([]);
    });

    it('passes a French link with lang=fr', () => {
      expect(checkLaunchLinks(one('r15/fr-ok.html', 'fr/index.html'))).toEqual([]);
    });

    it('fails a link straight to the app', () => {
      expect(mentions(checkLaunchLinks(one('r15/direct-app-link.html')), 'links straight to the app')).toBe(true);
    });

    it('fails a link to the staging app', () => {
      expect(mentions(checkLaunchLinks(one('r15/staging-app-link.html')), 'links straight to the app')).toBe(true);
    });

    it('fails a /go/ link with another target', () => {
      expect(mentions(checkLaunchLinks(one('r15/wrong-target.html')), 'is not /go/app/ or /go/register/')).toBe(true);
    });

    it('fails a missing from', () => {
      expect(mentions(checkLaunchLinks(one('r15/no-from.html')), 'no "from"')).toBe(true);
    });

    it('fails a missing cta', () => {
      expect(mentions(checkLaunchLinks(one('r15/no-cta.html')), 'no "cta"')).toBe(true);
    });

    it('fails a missing rel nofollow', () => {
      expect(mentions(checkLaunchLinks(one('r15/no-nofollow.html')), 'rel="nofollow"')).toBe(true);
    });

    it('fails a French page link without lang', () => {
      expect(mentions(checkLaunchLinks(one('r15/fr-no-lang.html', 'fr/index.html')), 'no "lang" on a fr page')).toBe(true);
    });

    it('fails a French page link with another locale in lang', () => {
      expect(mentions(checkLaunchLinks(one('r15/fr-wrong-lang.html', 'fr/index.html')), 'lang=de on a fr page')).toBe(true);
    });

    it('exempts pseudo-locale pages from lang, because launchHref omits it', () => {
      expect(launchHref('home', 'xx-long', { cta: 'hero' })).not.toContain('lang=');
      expect(checkLaunchLinks(one('r15/pseudo-no-lang.html', 'xx-long/index.html'))).toEqual([]);
    });

    it('accepts what launchHref builds', () => {
      const href = (locale: 'en' | 'fr') => launchHref('home', locale, { cta: 'hero' }).replace(/&/g, '&amp;');
      const page = (lang: string, locale: 'en' | 'fr') =>
        `<html lang="${lang}"><body><a href="${href(locale)}" rel="nofollow">Go</a></body></html>`;
      expect(checkLaunchLinks(siteFromFiles({ 'index.html': page('en', 'en'), 'fr/index.html': page('fr', 'fr') }))).toEqual([]);
    });
  });
});
