import { describe, expect, it, vi } from 'vitest';

// Ids the fixture treats as having routes, besides the real registry's own
const extraBuilt = vi.hoisted(() => new Set<string>());
// The registry's own unpublished pages count as published once they are in `extraBuilt`
vi.mock('../../site/pages', async importActual => {
  const actual = await importActual<typeof import('../../site/pages')>();
  const flip = (page: import('../../site/pages').PageDef) =>
    extraBuilt.has(page.id) ? { ...page, published: true } : page;
  const allPages = () => actual.allPages().map(flip);
  return { ...actual, allPages, getPage: (id: string) => allPages().find(page => page.id === id) };
});
vi.mock('../../site/routes', async importActual => {
  const actual = await importActual<typeof import('../../site/routes')>();
  return {
    ...actual,
    pathsFor: (id: string) =>
      extraBuilt.has(id)
        ? (['en', 'fr'] as const).map(locale => ({ params: { locale }, props: { pageId: id, locale } }))
        : actual.pathsFor(id),
  };
});

// A hub and a use case, as P24 will register them; the feature pages come from the real registry
vi.mock('../../site/preview-pages', () => ({
  previewPages: [
    {
      id: 'features',
      type: 'hub',
      path: '/features/',
      published: true,
      locales: 'all',
      nav: { order: 1, labelKey: 'nav.features' },
      indexing: 'per-locale-review',
    },
    {
      id: 'use-case/trips',
      type: 'use-case',
      path: '/use-cases/trips/',
      parent: 'use-cases',
      published: true,
      locales: 'all',
      features: ['balances'],
      content: { collection: 'useCasePages', slug: 'trips' },
      indexing: 'per-locale-review',
    },
  ],
}));

const { breadcrumbJsonLd, clearNavigationCache, breadcrumbsFor, footerGroups, navLinks, pageLabel, linkTextOf, pageLabels, relatedPages } = await import(
  './navigation'
);
const { getPage } = await import('../../site/pages');
const { t } = await import('../../i18n');

describe('navigation from the registry', () => {
  it('lists only published pages with a nav entry, in order, and marks the current page and its section', () => {
    expect(navLinks('pricing', 'en').map(link => [link.label, link.href, link.current])).toEqual([
      ['Pricing', '/pricing/', 'page'],
    ]);
  });

  it('shows a page in the header only once it is published and built', () => {
    // The hub is published in this fixture but the build has no route for it (PREVIEW_UNPUBLISHED is off)
    expect(navLinks('home', 'en').map(link => link.id)).toEqual(['pricing']);
  });

  it('builds the footer groups from the registry and omits empty groups', () => {
    const groups = footerGroups('en');
    expect(groups.map(group => group.id)).toEqual(['product', 'legal']);
    expect(groups[1].links.map(link => link.label)).toEqual(['Privacy Policy', 'Terms of Service', 'Cookie Policy']);
  });

  it('has no breadcrumb for Home or a page one level below it', () => {
    expect(breadcrumbsFor('home', 'en', 'Home')).toEqual([]);
    expect(breadcrumbsFor('pricing', 'en', 'Pricing')).toEqual([]);
    expect(breadcrumbsFor('features', 'en', 'Features')).toEqual([]);
  });

  it('builds Home, hub, page for a page two levels down, and the JSON-LD names match the visible names', () => {
    const crumbs = breadcrumbsFor('feature/settle-up', 'fr', 'Régler les comptes');
    // Names come from the locale's strings, so the test holds before and after French is translated
    expect(crumbs.map(crumb => crumb.name)).toEqual([
      t('nav.home', 'fr'),
      pageLabel(getPage('features')!, 'fr'),
      'Régler les comptes',
    ]);
    expect(crumbs.map(crumb => crumb.href)).toEqual(['/fr/', '/fr/features/', '/fr/features/settle-up/']);

    const [list] = breadcrumbJsonLd(crumbs) as unknown as {
      '@type': string;
      itemListElement: { position: number; name: string; item: string }[];
    }[];
    expect(list['@type']).toBe('BreadcrumbList');
    expect(list.itemListElement.map(item => item.name)).toEqual(crumbs.map(crumb => crumb.name));
    expect(list.itemListElement.map(item => item.item)).toEqual(crumbs.map(crumb => crumb.url));
    expect(list.itemListElement.map(item => item.position)).toEqual([1, 2, 3]);
  });

  it('writes no JSON-LD when there is no breadcrumb', () => {
    expect(breadcrumbJsonLd([])).toEqual([]);
  });

  it('refuses a page with no link label, so a published page cannot appear unnamed', () => {
    expect(() => pageLabel(getPage('feature/settle-up')!, 'en')).toThrow(/no link label/);
    expect(pageLabel(getPage('feature/settle-up')!, 'en', { 'feature/settle-up': 'Settle up' })).toBe('Settle up');
  });

  it('lists related pages that are published and built only', () => {
    expect(relatedPages('feature/settle-up', 'en')).toEqual([]);
    extraBuilt.add('use-case/trips');
    extraBuilt.add('feature/settle-up');
    clearNavigationCache();
    try {
      expect(relatedPages('feature/settle-up', 'en').map(page => page.id)).toEqual(['use-case/trips']);
      // Feature ids are not page slugs: `balances` is homed on feature/settle-up
      expect(relatedPages('use-case/trips', 'en').map(page => page.id)).toEqual(['feature/settle-up']);
    } finally {
      extraBuilt.clear();
      clearNavigationCache();
    }
  });

  it('labels content pages with their content title, only in the locales they are built in', async () => {
    extraBuilt.add('feature/settle-up');
    clearNavigationCache();
    try {
      const titles: Record<string, string> = { 'feature/settle-up:en': 'Settle up', 'feature/settle-up:fr': 'Régler' };
      const read = async (page: { id: string }, locale: string) => titles[`${page.id}:${locale}`];
      const labels = await pageLabels('en', read);
      expect(labels).toEqual({ 'feature/settle-up': 'Settle up' });
      expect(footerGroups('en', labels).find(group => group.id === 'product')!.links.map(link => link.label)).toEqual([
        'Settle up',
        'Pricing',
      ]);
      expect((await pageLabels('fr', read))['feature/settle-up']).toBe('Régler');
      // Not built in German, so no label is loaded
      expect(await pageLabels('de', read)).toEqual({});
    } finally {
      extraBuilt.clear();
      clearNavigationCache();
    }
  });

  it('prefers the short navLabel and falls back to the h1', () => {
    expect(linkTextOf({ navLabel: 'Settle up', h1: 'Settle up with fewer payments' })).toBe('Settle up');
    expect(linkTextOf({ h1: 'Settle up with fewer payments' })).toBe('Settle up with fewer payments');
    expect(linkTextOf({ navLabel: '', h1: 'Heading' })).toBe('Heading');
    expect(linkTextOf(null)).toBeUndefined();
  });

  it('orders the product footer group How it works, Features, the feature pages, then Pricing', () => {
    const order = (id: string) => getPage(id)!.footer!.order;
    const ids = ['how-it-works', 'features', 'feature/split-expenses', 'feature/settle-up', 'feature/multiple-currencies', 'pricing'];
    expect(ids.map(order)).toEqual([...ids.map(order)].sort((a, b) => a - b));
    expect(new Set(ids.map(order)).size).toBe(ids.length);
  });
});
