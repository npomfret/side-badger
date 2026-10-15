/**
 * The registry features the homepage depicts, per scene (homepage plan, "Registry IDs depicted").
 * Only `available` features appear. The JSON-LD `featureList` and the worlds' feature chips come
 * from here, so the schema never lists a feature no scene shows.
 *
 * Ids are the registry's (`src/data/features.ts`); `src/__tests__/home-features.test.ts` checks that
 * every depicted id exists there with status `available`. The localized title of each comes from
 * the existing `features.*.title` keys, because the registry is English and internal. A feature
 * with no matching title key is depicted but not listed (`groups`, `accounts`).
 */
import { t, type Locale, type TranslationKey } from '@/i18n';
import { features } from '@/data/features';
import type { SceneId, WorldId } from './links';

export type FeatureId =
  | 'groups'
  | 'invites'
  | 'accounts'
  | 'expense-splitting'
  | 'receipt-scanning'
  | 'multi-currency'
  | 'currency-conversion'
  | 'balances'
  | 'settlements'
  | 'reactions'
  | 'lists'
  | 'polls'
  | 'comments'
  | 'privacy-posture';

/** Scenes 1 to 9. Scene 7's features are the union of its worlds', and scene 9 depicts none. */
export const SCENE_FEATURES: Record<SceneId, readonly FeatureId[]> = {
  top: ['multi-currency', 'balances'], // in the lede only
  group: ['groups', 'invites', 'accounts'],
  expenses: ['expense-splitting', 'receipt-scanning'],
  currencies: ['multi-currency', 'currency-conversion'],
  tangle: ['balances'],
  settle: ['settlements', 'reactions'],
  worlds: [
    'lists',
    'balances',
    'settlements',
    'expense-splitting',
    'multi-currency',
    'currency-conversion',
    'receipt-scanning',
    'polls',
    'comments',
    'reactions',
    'invites',
  ],
  trust: ['privacy-posture'],
  start: [],
};

/** The features each world's chips show (scene 7). */
export const WORLD_FEATURES: Record<WorldId, readonly FeatureId[]> = {
  housemates: ['lists', 'balances', 'settlements'],
  couples: ['expense-splitting', 'balances'],
  trips: ['multi-currency', 'currency-conversion', 'receipt-scanning', 'polls'],
  celebrations: ['polls', 'comments', 'reactions', 'invites'],
};

/** Existing, already translated titles. Full literals, so the unused-key check sees them. */
export const FEATURE_TITLE_KEYS: Partial<Record<FeatureId, TranslationKey>> = {
  'expense-splitting': 'features.splits.title',
  'receipt-scanning': 'features.ai.title',
  'multi-currency': 'features.currency.title',
  'currency-conversion': 'features.fxConversion.title',
  balances: 'features.balances.title',
  settlements: 'features.settle.title',
  invites: 'features.invites.title',
  lists: 'features.lists.title',
  polls: 'features.polls.title',
  comments: 'features.participants.title',
  reactions: 'features.reactions.title',
  'privacy-posture': 'features.noTracking.title',
};

/** Whether the registry has the feature with status `available` */
export function isAvailable(id: string): boolean {
  return features.some(feature => feature.id === id && feature.status === 'available');
}

/** Every depicted feature id once, in first-appearance order across the scenes. */
export function depictedFeatureIds(): FeatureId[] {
  const seen = new Set<FeatureId>();
  for (const ids of Object.values(SCENE_FEATURES)) {
    for (const id of ids) seen.add(id);
  }
  return [...seen];
}

/** Localized titles of the depicted features that have one: the JSON-LD `featureList`. */
export function featureList(locale: Locale): string[] {
  return depictedFeatureIds()
    .filter(isAvailable)
    .map(id => FEATURE_TITLE_KEYS[id])
    .filter((key): key is TranslationKey => key !== undefined)
    .map(key => t(key, locale));
}
