import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { renderMarkdown } from '../../scripts/markdown/index.mjs';
import { negotiationConfig } from '../../scripts/markdown/nginx.mjs';
import { markdownPathFor } from '../seo/urls';

const info = { url: 'https://sidebadger.me/features/settle-up/', locale: 'en', indexable: true };
const document = (body: string, lang = 'en') => `<html lang="${lang}"><head><title>Settle up</title><meta name="description" content="Record payments; no money moves."></head><body><header>Site chrome</header><main>${body}</main><footer>Footer</footer></body></html>`;
const rendered = (markdown: string) => load(marked.parse(markdown.replace(/^---\n[\s\S]*?\n---\n/, '')) as string);

describe('Markdown alternate representations', () => {
  it('preserves task explanations, limits, FAQ answers, code, tables and computed balances', () => {
    const md = renderMarkdown(document(`<h1>Settle up</h1><p>Record payments; no money moves.</p>
      <h2>Limits</h2><ul><li>Pay outside Side Badger.</li></ul>
      <h2>Questions</h2><details><summary>Can it send money?</summary><p>No. Record a payment already made.</p></details>
      <dl><div><dt>Alice</dt><dd>£12.50</dd></div><div><dt>Bob</dt><dd>−£12.50</dd></div></dl>
      <table><thead><tr><th>Person</th><th>Balance</th></tr></thead><tbody><tr><td>Alice</td><td>£12.50</td></tr></tbody></table>
      <pre><code class="language-json">{"amount":1250}</code></pre>`), info);
    const $ = rendered(md);
    expect($('h1').text()).toBe('Settle up');
    expect($('li').text()).toBe('Pay outside Side Badger.');
    expect($.text()).toContain('No. Record a payment already made.');
    expect($.text()).toMatch(/Alice:.*£12.50/s);
    expect($.text()).toMatch(/Bob:.*−£12.50/s);
    expect($('table td').first().text()).toBe('Alice');
    expect($('pre code').text().trim()).toBe('{"amount":1250}');
    expect(md).toContain('robots: "index, follow"');
  });

  it('preserves canonical link targets, query strings, fragments and launch routing', () => {
    const md = renderMarkdown(document(`<h1>Links</h1><a href="/go/register/?from=feature/settle-up&amp;cta=hero">Start</a>
      <a href="/pricing/#faq">Pricing</a><a href="#example">Example</a><a href="mailto:support@sidebadger.me">Support</a>`), info);
    const hrefs = rendered(md)('a').map((_, node) => node.attribs.href).get();
    expect(hrefs).toEqual([
      'https://sidebadger.me/go/register/?from=feature/settle-up&cta=hero',
      'https://sidebadger.me/pricing/#faq',
      `${info.url}#example`,
      'mailto:support@sidebadger.me',
    ]);
  });

  it.each([
    { locale: 'en', marker: 'External link' },
    { locale: 'fr', marker: 'Lien externe' },
  ])('omits external-link markers in $locale while preserving other screen-reader text', ({ locale, marker }) => {
    const md = renderMarkdown(document(`<h1>Links</h1>
      <a class="launch-cta" href="/go/register/?from=home&amp;cta=hero"><span class="launch-cta__text">Start a group</span><span class="sr-only">${marker}</span></a>
      <p class="compare-source"><a href="https://example.com/source/" rel="noopener">Source<span class="sr-only">${marker}</span></a></p>
      <a href="/pricing/">Pricing<span class="sr-only"> details</span></a>
      <h2 class="sr-only">Worked example</h2>`, locale), { ...info, locale });
    expect(md).toContain('[Start a group](https://sidebadger.me/go/register/?from=home&cta=hero)');
    expect(md).toContain('[Source](https://example.com/source/)');
    expect(md).toContain('[Pricing details](https://sidebadger.me/pricing/)');
    expect(md).toContain('## Worked example');
    expect(md).not.toContain(marker);
  });

  it('omits chrome, decoration and simulated app screens while retaining use-case descriptions', () => {
    const md = renderMarkdown(document(`<h1>Split bills</h1><nav>Breadcrumb</nav><p>Product explanation</p>
      <span aria-hidden="true">Decorative receipt</span><div hidden>Hidden result</div>
      <div class="scene__visual">Simulated payment</div>
      <div class="scene__visual"><div class="world__text"><h2>Housemates</h2><p>Share household costs.</p></div><div class="world__table">Decorative table</div></div>
      <script>secret()</script><style>.foo{}</style>`), info);
    expect(md).toContain('Product explanation');
    expect(md).toContain('Share household costs.');
    expect(md).not.toMatch(/Site chrome|Footer|Breadcrumb|Decorative|Hidden result|Simulated payment|secret\(\)|\.foo/);
  });

  it('keeps the original language and noindex status', () => {
    const md = renderMarkdown(document('<h1>تقسيم الفواتير</h1><p>سارة: ١٢٫٥٠</p>', 'ar'), { ...info, locale: 'ar', indexable: false });
    expect(md).toContain('lang: "ar"');
    expect(md).toContain('robots: "noindex"');
    expect(rendered(md)('h1').text()).toBe('تقسيم الفواتير');
  });

  it('builds downloadable asset URLs through the URL helper', () => {
    expect(markdownPathFor('home', 'en')).toBe('/index.md');
    expect(markdownPathFor('pricing', 'fr')).toBe('/fr/pricing/index.md');
  });

  it('keeps the shipped nginx negotiation config in sync with its generator', () => {
    expect(readFileSync('nginx/markdown-negotiation.conf', 'utf8')).toBe(negotiationConfig());
  });
});
