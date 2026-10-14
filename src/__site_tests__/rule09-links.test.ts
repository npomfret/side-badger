import { describe, expect, it } from 'vitest';
import { checkLinks } from './rules/r09-links';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

const targets = {
  'pricing/index.html': '<title>p</title>',
  'fr/index.html': '<title>f</title>',
  'fr/pricing/index.html': '<title>fp</title>',
  '_astro/app.css': 'a{}',
};

describe('rule 9: internal links resolve, use the slash form and stay in the locale', () => {
  it('dist: every internal href', () => {
    expect(checkLinks(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes links that resolve, external and non-HTTP links, fragments and /go/', () => {
      expect(checkLinks(one('r09/link-ok.html', 'index.html', targets))).toEqual([]);
    });

    it('passes the page fixture with a language switcher', () => {
      expect(checkLinks(one('good/home.html', 'index.html', targets))).toEqual([]);
    });

    it('fails a page link without the trailing slash', () => {
      expect(mentions(checkLinks(one('r09/link-no-slash.html', 'index.html', targets)), '/pricing', 'trailing slash')).toBe(true);
    });

    it('fails a link to index.html, even when the file exists', () => {
      expect(mentions(checkLinks(one('r09/link-index-html.html', 'index.html', targets)), '/pricing/index.html', 'instead of the slash form')).toBe(true);
    });

    it('fails a link to a missing file', () => {
      expect(mentions(checkLinks(one('r09/link-missing-file.html', 'index.html', targets)), '/missing/', 'resolves to no file')).toBe(true);
    });

    it('fails a link to a missing asset', () => {
      expect(mentions(checkLinks(one('r09/link-asset-missing.html', 'index.html', targets)), 'missing.css')).toBe(true);
    });

    it('fails a link to an alias prefix', () => {
      const problems = checkLinks(one('r09/link-alias.html', 'index.html', { 'en-gb/pricing/index.html': 'x' }));
      expect(mentions(problems, '/en-gb/pricing/', 'alias prefix')).toBe(true);
    });

    it('fails a link into another locale', () => {
      expect(mentions(checkLinks(one('r09/link-other-locale.html', 'index.html', targets)), 'leaves the page', 'en to fr')).toBe(true);
    });

    it('allows a cross-locale link inside data-locale-switch', () => {
      expect(checkLinks(one('r09/link-switcher.html', 'index.html', targets))).toEqual([]);
    });
  });
});
