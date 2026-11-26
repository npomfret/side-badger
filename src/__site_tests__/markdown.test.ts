import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { marked } from 'marked';
import { load as loadYaml } from 'js-yaml';
import { dist, squash } from './lib/site';
import { isPseudoLocale, t, type Locale } from '../i18n';
import { hasMarkdownAlternate } from '../site/pages';

describe('published Markdown representations', () => {
  const site = dist();
  const published = site.pages.filter(page => hasMarkdownAlternate(page.page) && page.locale && !isPseudoLocale(page.locale));
  const agentHint = '<!-- AI agents: This page is available as Markdown. Request this URL with Accept: text/markdown, or follow the text/markdown alternate link in the document head. This is the Side Badger marketing website; the web app is https://app.sidebadger.me/. MCP endpoint: https://app.sidebadger.me/api/mcp (Streamable HTTP; OAuth account linking required). After connecting, use tools/list for current tool descriptions and input/output schemas. REST API documentation (OpenAPI 3.1): https://app.sidebadger.me/api/docs. Use each operation\'s documented authentication and permissions. Skills: use the manage-shared-expenses workflow skill when supplied by your connected integration. No public skill download is linked here yet. -->';

  it('provides discoverable alternates only for built published pages', () => {
    const expected = new Set(published.map(page => page.file.replace(/index\.html$/, 'index.md')));
    expect(new Set(site.files.filter(file => file.endsWith('.md')))).toEqual(expected);
    for (const page of site.pages) {
      const alternates = page.$('link[rel="alternate"][type="text/markdown"]');
      const instructions = page.$('head meta[name="agent:instructions"]');
      const documentation = page.$('head meta[name="agent:documentation"]');
      const api = page.$('head link[rel="service-desc"]');
      expect(alternates.length, page.urlPath).toBe(published.includes(page) ? 1 : 0);
      expect(instructions.length, page.urlPath).toBe(alternates.length);
      expect(documentation.length, page.urlPath).toBe(alternates.length);
      expect(api.length, page.urlPath).toBe(alternates.length);
      expect(page.$('meta[name="agent:endpoint"], meta[name="agent:method"]').length, page.urlPath).toBe(0);
      expect(page.html.startsWith(`<!DOCTYPE html>${agentHint}`), page.urlPath).toBe(published.includes(page));
      if (alternates.length) {
        expect(alternates.attr('href'), page.urlPath).toBe(`/${page.file.replace(/index\.html$/, 'index.md')}`);
        expect(instructions.attr('content'), page.urlPath).toBe(agentHint.slice('<!-- AI agents: '.length, -' -->'.length));
        expect(documentation.attr('content'), page.urlPath).toBe('https://app.sidebadger.me/api/docs');
        expect(api.attr('href'), page.urlPath).toBe(documentation.attr('content'));
        expect(api.attr('type'), page.urlPath).toBe('application/json');
      }
    }
  });

  it('keeps Markdown agent instructions and documentation identical to the HTML metadata', () => {
    for (const page of published) {
      const markdown = site.read(page.file.replace(/index\.html$/, 'index.md'))!.toString('utf8');
      expect(loadYaml(markdown.split('\n---\n')[0].slice(4)), page.urlPath).toHaveProperty('agent', {
        instructions: page.$('head meta[name="agent:instructions"]').attr('content'),
        documentation: page.$('head meta[name="agent:documentation"]').attr('content'),
      });
    }
  });

  it('gives the legal pages no Markdown alternate, because their policy text is loaded in the browser', () => {
    const legal = site.pages.filter(page => page.page?.type === 'legal');
    expect(legal.length).toBeGreaterThan(0);
    for (const page of legal) {
      expect(page.$('link[rel="alternate"][type="text/markdown"]').length, page.urlPath).toBe(0);
      expect(site.exists(page.file.replace(/index\.html$/, 'index.md')), page.urlPath).toBe(false);
    }
  });

  it('retains headings, plan/feature limits, FAQ answers, language and source URLs', () => {
    for (const page of published) {
      const markdown = site.read(page.file.replace(/index\.html$/, 'index.md'))!.toString('utf8');
      const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
      const $ = load(marked.parse(body) as string);
      expect(squash($('h1').text()), page.urlPath).toBe(squash(page.$('main h1').text()));
      expect(markdown, page.urlPath).toContain(`url: "https://sidebadger.me${page.urlPath}"`);
      expect(markdown, page.urlPath).toContain(`lang: ${JSON.stringify(page.$('html').attr('lang'))}`);
      const noindex = page.$('meta[name="robots"]').attr('content')?.includes('noindex');
      expect(markdown, page.urlPath).toContain(`robots: "${noindex ? 'noindex' : 'index, follow'}"`);
      const text = squash($.text());
      for (const element of page.$('.faq-entry, .limits-list li, .page-hero__lead').toArray()) {
        // Markdown syntax can add whitespace between adjacent inline/block elements.
        const original = squash(page.$(element).text());
        expect(text.replace(/\s/g, ''), page.urlPath).toContain(original.replace(/\s/g, ''));
      }
      expect(body, page.urlPath).not.toContain('<script');
    }
  });

  it('keeps the screen-reader "external link" marker out of Markdown link text', () => {
    for (const page of published) {
      const markdown = site.read(page.file.replace(/index\.html$/, 'index.md'))!.toString('utf8');
      const $ = load(marked.parse(markdown.replace(/^---\n[\s\S]*?\n---\n/, '')) as string);
      const marker = t('a11y.externalLink', page.locale as Locale);
      for (const link of $('a').toArray()) {
        expect($(link).text(), `${page.urlPath} link to ${$(link).attr('href')}`).not.toContain(marker);
      }
    }
  });

  it('keeps Markdown HTTP links resolvable and launch URLs routed through the counter', () => {
    for (const page of published) {
      const markdown = site.read(page.file.replace(/index\.html$/, 'index.md'))!.toString('utf8');
      const $ = load(marked.parse(markdown.replace(/^---\n[\s\S]*?\n---\n/, '')) as string);
      for (const link of $('a[href], img[src]').toArray()) {
        const url = new URL($(link).attr('href') ?? $(link).attr('src')!);
        expect(url.hostname, page.urlPath).not.toBe('staging.sidebadger.me');
        expect(url.hostname, page.urlPath).not.toBe('app.sidebadger.me');
        if (url.origin !== 'https://sidebadger.me' || url.pathname.startsWith('/go/')) continue;
        const file = url.pathname.slice(1) + (url.pathname.endsWith('/') ? 'index.html' : '');
        expect(site.exists(decodeURI(file)), `${page.urlPath}: ${url}`).toBe(true);
      }
    }
  });
});
