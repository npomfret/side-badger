import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIndexable, overrideLockPages } from '../seo/indexability';
import { alternatesFor } from '../seo/alternates';
import {
  breadcrumbListNode,
  buildGraph,
  faqPageNode,
  serializeJsonLd,
  softwareApplicationNode,
  webPageId,
  type JsonLdNode,
} from '../seo/jsonld';
import { localeConfig, pseudoLocales } from '../i18n';
import { pathsFor } from '../site/routes';

type Loose = Record<string, unknown>;
const byType = (graph: JsonLdNode[], type: string) =>
  graph.filter(node => (node as Loose)['@type'] === type);

afterEach(() => {
  overrideLockPages('fr', undefined);
});

describe('isIndexable (D8)', () => {
  it('indexes English pages and never the 404 page', () => {
    expect(isIndexable('home', 'en')).toBe(true);
    expect(isIndexable('pricing', 'en')).toBe(true);
    expect(isIndexable('not-found', 'en')).toBe(false);
  });

  it('indexes legacy and reviewed locales, not machine or checked ones', () => {
    overrideLockPages('fr', { home: 'legacy' });
    expect(isIndexable('home', 'fr')).toBe(true);
    overrideLockPages('fr', { home: 'machine', pricing: 'checked' });
    expect(isIndexable('home', 'fr')).toBe(false);
    expect(isIndexable('pricing', 'fr')).toBe(false);
    overrideLockPages('fr', { home: 'reviewed' });
    expect(isIndexable('home', 'fr')).toBe(true);
    expect(isIndexable('pricing', 'fr')).toBe(false); // no status
  });

  it('indexes legal pages in English only', () => {
    expect(isIndexable('privacy', 'en')).toBe(true);
    expect(isIndexable('privacy', 'fr')).toBe(false);
  });

  it('never indexes a pseudo-locale', () => {
    for (const locale of pseudoLocales) expect(isIndexable('home', locale)).toBe(false);
  });

  it('does not index an unknown page', () => {
    expect(isIndexable('nope', 'en')).toBe(false);
  });

  it('reads a published content-collection page\'s status from its entry, not the lock file', async () => {
    vi.resetModules();
    vi.doMock('../site/pages', async importOriginal => {
      const actual = await importOriginal<typeof import('../site/pages')>();
      const page = {
        id: 'feature/x',
        type: 'feature',
        path: '/features/x/',
        published: true,
        indexing: 'per-locale-review',
        content: { collection: 'featurePages', slug: 'x' },
      };
      return { ...actual, getPage: (id: string) => (id === page.id ? page : actual.getPage(id)) };
    });
    const fresh = await import('../seo/indexability');
    expect(fresh.isIndexable('feature/x', 'en')).toBe(true);
    // No entry for the locale: not indexable
    expect(fresh.isIndexable('feature/x', 'fr')).toBe(false);
    for (const [status, indexable] of [
      ['reviewed', true],
      ['legacy', true],
      ['machine', false],
      ['checked', false],
    ] as const) {
      fresh.overrideEntryReview('feature/x', 'fr', status);
      expect(fresh.isIndexable('feature/x', 'fr'), status).toBe(indexable);
    }
    // The lock file's `pages` is ignored for content pages
    fresh.overrideEntryReview('feature/x', 'fr', 'machine');
    fresh.overrideLockPages('fr', { 'feature/x': 'reviewed' });
    expect(fresh.isIndexable('feature/x', 'fr')).toBe(false);
    vi.doUnmock('../site/pages');
    vi.resetModules();
  });
});

describe('alternatesFor', () => {
  // Works in strict and English-first mode (D38): the cluster is whatever was built
  const built = pathsFor('home').map(path => path.props.locale);

  it('lists every built indexable locale with configured tags, and x-default', () => {
    const alternates = alternatesFor('home', 'en');
    const expected = built.filter(loc => isIndexable('home', loc)).map(loc => localeConfig[loc].hreflang);
    expect(alternates.map(a => a.hreflang)).toEqual([...expected, 'x-default']);
    expect(alternates.find(a => a.hreflang === 'x-default')?.href).toBe('https://sidebadger.me/');
    expect(alternates.map(a => a.hreflang)).not.toContain('ph');
    if (built.includes('ph') && isIndexable('home', 'ph')) {
      expect(alternates.find(a => a.hreflang === 'tl')?.href).toBe('https://sidebadger.me/ph/');
    }
    if (built.includes('fr') && isIndexable('home', 'fr')) {
      expect(alternates.find(a => a.hreflang === 'fr')?.href).toBe('https://sidebadger.me/fr/');
    }
  });

  it('is the same set from every member of the cluster', () => {
    const fromEnglish = alternatesFor('home', 'en');
    for (const loc of built.filter(l => isIndexable('home', l))) {
      expect(alternatesFor('home', loc)).toEqual(fromEnglish);
    }
  });

  it('lists no locale that was not built', () => {
    const tags = alternatesFor('home', 'en').map(a => a.hreflang);
    for (const loc of Object.keys(localeConfig) as (keyof typeof localeConfig)[]) {
      if (!built.includes(loc) && !(pseudoLocales as readonly string[]).includes(loc)) expect(tags).not.toContain(localeConfig[loc].hreflang);
    }
  });

  it('drops a locale that is not indexable from every cluster', () => {
    overrideLockPages('fr', { home: 'machine' });
    expect(alternatesFor('home', 'en').map(a => a.hreflang)).not.toContain('fr');
    expect(alternatesFor('home', 'fr')).toEqual([]);
  });

  it('emits nothing for the 404 page, a localized legal page or a pseudo-locale', () => {
    expect(alternatesFor('not-found', 'en')).toEqual([]);
    expect(alternatesFor('privacy', 'fr')).toEqual([]);
    expect(alternatesFor('home', 'xx-long')).toEqual([]);
  });
});

describe('JSON-LD graph', () => {
  const base = { logoUrl: 'https://sidebadger.me/images/en/logo-transparent.png' };

  it('has WebSite, Organization and WebPage with the htmlLang as inLanguage', () => {
    const graph = buildGraph({ pageId: 'home', locale: 'ph', name: 'N', description: 'D', ...base });
    expect(graph.map(n => (n as Loose)['@type'])).toEqual(['WebSite', 'Organization', 'WebPage']);
    const page = graph[2] as Loose;
    expect(page.inLanguage).toBe('fil');
    expect(page.url).toBe('https://sidebadger.me/ph/');
    expect(page['@id']).toBe('https://sidebadger.me/ph/#webpage');
  });

  it('has no graph on the 404 page', () => {
    expect(buildGraph({ pageId: 'not-found', locale: 'en', name: 'N', description: 'D', ...base })).toEqual([]);
  });

  it('merges a page node by @id: the English /privacy/ graph has one WebPage with dateModified', () => {
    const id = webPageId('privacy', 'en');
    expect(id).toBe('https://sidebadger.me/privacy/#webpage');
    const graph = buildGraph({
      pageId: 'privacy',
      locale: 'en',
      name: 'Privacy Policy',
      description: 'D',
      nodes: [{ '@type': 'WebPage', '@id': id, dateModified: '2025-01-02T00:00:00.000Z' } as JsonLdNode],
      ...base,
    });
    const withId = graph.filter(n => (n as Loose)['@id'] === id) as Loose[];
    expect(withId).toHaveLength(1);
    expect(withId[0]).toMatchObject({
      '@type': 'WebPage',
      url: 'https://sidebadger.me/privacy/',
      name: 'Privacy Policy',
      inLanguage: 'en',
      isPartOf: { '@id': 'https://sidebadger.me/#website' },
      dateModified: '2025-01-02T00:00:00.000Z',
    });
    expect(graph).toHaveLength(3);
  });

  it('lets a page replace the WebPage type and appends other nodes as is', () => {
    const id = webPageId('pricing', 'en');
    const graph = buildGraph({
      pageId: 'pricing',
      locale: 'en',
      name: 'N',
      description: 'D',
      nodes: [
        { '@type': 'CollectionPage', '@id': id, about: { '@id': 'x' } } as JsonLdNode,
        faqPageNode([{ question: 'Q?', answer: 'A.' }]),
      ],
      ...base,
    });
    expect(byType(graph, 'WebPage')).toHaveLength(0);
    expect((byType(graph, 'CollectionPage')[0] as Loose).about).toEqual({ '@id': 'x' });
    expect(byType(graph, 'FAQPage')).toHaveLength(1);
  });

  it('prices the app at zero in GBP, with no ratings or HowTo', () => {
    const node = softwareApplicationNode('en') as Loose;
    expect(node['@id']).toBe('https://sidebadger.me/#app');
    expect(node.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'GBP' });
    const text = serializeJsonLd([node as JsonLdNode, breadcrumbListNode([])]);
    expect(text).not.toMatch(/HowTo|aggregateRating|AggregateRating|Review/);
  });

  it('escapes < so no value can close the script element', () => {
    const text = serializeJsonLd([{ '@type': 'Thing', name: '</script><b>' } as JsonLdNode]);
    expect(text).not.toContain('<');
    expect(JSON.parse(text)['@graph'][0].name).toBe('</script><b>');
  });
});

describe('locale metadata used by the head', () => {
  it('gives ph lang fil and zh zh-Hans', () => {
    expect(localeConfig.ph.htmlLang).toBe('fil');
    expect(localeConfig.zh.htmlLang).toBe('zh-Hans');
  });
});

describe('social cards and logo locales (P26f)', () => {
  it('OG_CARD_IDS matches the artwork files', async () => {
    const { readdirSync } = await import('node:fs');
    const { OG_CARD_IDS } = await import('../pages/og/[card].png');
    const files = readdirSync('src/assets/og')
      .filter(f => f.endsWith('.png'))
      .map(f => f.replace(/\.png$/, ''))
      .sort();
    expect([...OG_CARD_IDS].sort()).toEqual(files);
  });

  it('every locale with a logo has its logo files, and ko is one of them', async () => {
    const { existsSync } = await import('node:fs');
    const { logoLocales } = await import('../i18n');
    expect(logoLocales).toContain('ko');
    for (const l of logoLocales) {
      expect(existsSync(`public/images/${l}/logo-transparent.png`), l).toBe(true);
    }
  });
});
