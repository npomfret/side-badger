import { describe, expect, it } from 'vitest';
import { checkLeaks } from './rules/r12-leaks';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 12: no placeholder text, debug attributes or staging host', () => {
  it('dist: every page and file', () => {
    expect(checkLeaks(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a clean page', () => {
      expect(checkLeaks(one('good/home.html'))).toEqual([]);
    });

    it('ignores script and style bodies and word fragments', () => {
      expect(checkLeaks(one('r12/script-only.html'))).toEqual([]);
    });

    it('checks noscript content, which visitors without JavaScript see', () => {
      const site = one('good/home.html');
      site.pages[0].$('body').append('<noscript><p>Total: undefined</p></noscript>');
      expect(mentions(checkLeaks(site), '<noscript> contains undefined')).toBe(true);
    });

    it.each([
      ['r12/text-undefined.html', 'text contains undefined'],
      ['r12/text-nan.html', 'text contains NaN'],
      ['r12/text-object.html', '[object Object]'],
      ['r12/text-todo.html', 'text contains TODO'],
      ['r12/text-tbd.html', 'text contains TBD'],
      ['r12/text-braces.html', 'text contains {{'],
      ['r12/text-nginx-host.html', '__NGINX_HOST__'],
      ['r12/attr-todo.html', 'img[alt] contains TODO'],
      ['r12/attr-undefined-href.html', 'a[href] contains undefined'],
      ['r12/meta-undefined.html', 'meta[content] contains undefined'],
    ])('fails %s', (name, message) => {
      expect(mentions(checkLeaks(one(name)), message)).toBe(true);
    });

    it('fails the data-pseudo attribute (P12 renders it on pseudo pages)', () => {
      expect(mentions(checkLeaks(one('r12/data-pseudo-attribute.html')), 'data-pseudo')).toBe(true);
    });

    it('fails the data-unpublished attribute', () => {
      expect(mentions(checkLeaks(one('r12/data-unpublished-attribute.html')), 'data-unpublished')).toBe(true);
    });

    it('fails data-pseudo written in visible text or an attribute value', () => {
      const site = one('good/home.html');
      site.pages[0].$('body').append('<p>see data-pseudo</p><a title="data-unpublished" href="/">x</a>');
      const problems = checkLeaks(site);
      expect(mentions(problems, 'text contains data-pseudo')).toBe(true);
      expect(mentions(problems, 'a[title] contains data-unpublished')).toBe(true);
    });

    it('fails the staging host in any file, including non-HTML and binary files', () => {
      const clean = one('good/home.html', 'index.html', { '_astro/app.js': 'fetch("https://staging.sidebadger.me/x")' });
      expect(mentions(checkLeaks(clean), '_astro/app.js', 'staging.sidebadger.me')).toBe(true);
      const binary = one('good/home.html', 'index.html', { 'x.bin': Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from('staging.sidebadger.me')]) });
      expect(mentions(checkLeaks(binary), 'x.bin')).toBe(true);
    });
  });
});
