import { describe, expect, it, vi } from 'vitest';

// A hub, a feature below it and a use case, as P21 and P24 will register them
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
      id: 'feature/settle-up',
      type: 'feature',
      path: '/features/settle-up/',
      parent: 'features',
      published: true,
      locales: 'all',
      footer: { group: 'product', order: 2 },
      related: ['use-case/trips'],
      indexing: 'per-locale-review',
    },
    {
      id: 'use-case/trips',
      type: 'use-case',
      path: '/use-cases/trips/',
      parent: 'use-cases',
      published: false,
      locales: 'all',
      features: ['settle-up'],
      indexing: 'per-locale-review',
    },
  ],
}));

const { breadcrumbJsonLd, breadcrumbsFor, footerGroups, navLinks, pageLabel, relatedPages } = await import(
  './navigation'
);
const { getPage } = await import('../../site/pages');

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
    expect(crumbs.map(crumb => crumb.name)).toEqual(['Home', 'Features', 'Régler les comptes']);
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

  it('lists related pages that are published only', () => {
    expect(relatedPages('feature/settle-up', 'en')).toEqual([]);
  });
});
