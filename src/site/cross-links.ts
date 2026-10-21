/**
 * The page ids a page links to automatically: its registry `related` list, the feature pages a
 * use case depicts, the use cases that depict a feature, the guides that name a product page in
 * their `related` list (and so the guides a product page lists), and the guides a hub holds.
 * Feature ids are not page slugs (`expense-splitting` is homed on `feature/split-expenses`), so
 * the match goes through each feature's `homePage` in `src/data/features.ts`. Not filtered by
 * publication: callers decide which of the ids they may link to.
 */
import { features } from '../data/features';
import { allPages, PRODUCT_PAGE_TYPES, type PageDef } from './pages';

/** The page that is the home of a registry feature id, if it has one. */
function homePageOf(featureId: string): string | undefined {
  return features.find(feature => feature.id === featureId)?.homePage ?? undefined;
}

export function crossLinkedIds(page: PageDef): string[] {
  const ids = new Set<string>(page.related ?? []);
  if (page.type === 'use-case') {
    for (const feature of page.features ?? []) {
      const home = homePageOf(feature);
      if (home) ids.add(home);
    }
  }
  if (page.type === 'feature') {
    for (const other of allPages()) {
      if (other.type === 'use-case' && other.features?.some(feature => homePageOf(feature) === page.id)) {
        ids.add(other.id);
      }
    }
  }
  // A guide links to its product pages through `related`; each product page links back
  if (PRODUCT_PAGE_TYPES.includes(page.type)) {
    for (const other of allPages()) {
      if (other.type === 'article' && other.related?.includes(page.id)) ids.add(other.id);
    }
  }
  // A hub lists the guides filed under it (the hub layout shows them as cards, not as related links)
  if (page.type === 'hub') {
    for (const other of allPages()) {
      if (other.type === 'article' && other.parent === page.id) ids.add(other.id);
    }
  }
  ids.delete(page.id);
  return [...ids];
}
