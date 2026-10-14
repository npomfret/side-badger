/**
 * The four use-case worlds of scene 7, in order (homepage plan, "Use-case worlds"). Every key is a
 * full literal, so the unused-key check sees it. Links resolve through `links.ts` (`world:<id>`);
 * couples stays on `/go/app/` until its release-2 page is published.
 */
import { t, tf, type Locale, type TranslationKey } from '@/i18n';
import { formatNumber } from '../format';
import { FEATURE_TITLE_KEYS, WORLD_FEATURES } from './home-features';
import type { WorldId } from './links';

export interface WorldDef {
  id: WorldId;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** The two prop labels */
  propOneKey: TranslationKey;
  propTwoKey: TranslationKey;
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: 'housemates',
    titleKey: 'home.worlds.housemates.title',
    bodyKey: 'home.worlds.housemates.body',
    propOneKey: 'home.worlds.housemates.propOne',
    propTwoKey: 'home.worlds.housemates.propTwo',
  },
  {
    id: 'couples',
    titleKey: 'home.worlds.couples.title',
    bodyKey: 'home.worlds.couples.body',
    propOneKey: 'home.worlds.couples.propOne',
    propTwoKey: 'home.worlds.couples.propTwo',
  },
  {
    id: 'trips',
    titleKey: 'home.worlds.trips.title',
    bodyKey: 'home.worlds.trips.body',
    propOneKey: 'home.worlds.trips.propOne',
    propTwoKey: 'home.worlds.trips.propTwo',
  },
  {
    id: 'celebrations',
    titleKey: 'home.worlds.celebrations.title',
    bodyKey: 'home.worlds.celebrations.body',
    propOneKey: 'home.worlds.celebrations.propOne',
    propTwoKey: 'home.worlds.celebrations.propTwo',
  },
];

/** The localized feature chips of a world: only features that have a translated title. */
export function worldChips(id: WorldId, locale: Locale): string[] {
  return WORLD_FEATURES[id]
    .map(feature => FEATURE_TITLE_KEYS[feature])
    .filter((key): key is TranslationKey => key !== undefined)
    .map(key => t(key, locale));
}

/** "{current} of {total}" for the carousel's readout, with the locale's digits. */
export function positionText(current: number, locale: Locale): string {
  return tf(
    'home.worlds.position',
    { current: formatNumber(current, locale), total: formatNumber(WORLDS.length, locale) },
    locale
  );
}
