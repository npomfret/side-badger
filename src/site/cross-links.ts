/**
 * The page ids a page links to automatically: its registry `related` list, the feature pages a
 * use case depicts and the use cases that depict a feature. Feature ids are not page slugs
 * (`expense-splitting` is homed on `feature/split-expenses`), so the match goes through each
 * feature's `homePage` in `src/data/features.ts`. Not filtered by publication: callers decide
 * which of the ids they may link to.
 */
import { features } from '../data/features';
import { allPages, type PageDef } from './pages';

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
  ids.delete(page.id);
  return [...ids];
}
