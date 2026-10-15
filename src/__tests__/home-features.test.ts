import { describe, expect, it } from 'vitest';
import { features } from '@/data/features';
import {
  SCENE_FEATURES,
  WORLD_FEATURES,
  depictedFeatureIds,
  featureList,
  isAvailable,
} from '@/components/home/data/home-features';

describe('home features', () => {
  it('depicts at least one feature', () => {
    expect(depictedFeatureIds().length).toBeGreaterThan(0);
  });

  it('every depicted feature id is in the registry with status available', () => {
    const status = new Map(features.map(feature => [feature.id, feature.status]));
    const problems = depictedFeatureIds()
      .filter(id => status.get(id) !== 'available')
      .map(id => `${id}: ${status.get(id) ?? 'not in the registry'}`);
    expect(problems).toEqual([]);
  });

  it('isAvailable agrees with the registry', () => {
    expect(isAvailable('settlements')).toBe(true);
    expect(isAvailable('dark-mode')).toBe(false);
    expect(isAvailable('no-such-feature')).toBe(false);
  });

  it('the worlds depict only features scene 7 lists', () => {
    const scene7 = new Set(SCENE_FEATURES.worlds);
    const stray = Object.values(WORLD_FEATURES)
      .flat()
      .filter(id => !scene7.has(id));
    expect(stray).toEqual([]);
  });

  it('the JSON-LD feature list has no duplicates and is non-empty', () => {
    const list = featureList('en');
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list).size).toBe(list.length);
  });
});
