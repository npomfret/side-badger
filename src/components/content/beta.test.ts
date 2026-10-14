import { describe, expect, it } from 'vitest';
import { features } from '../../data/features';
import type { FeatureRecord } from '../../data/types';
import { betaFeaturesOf, isBetaPage } from './beta';

/** A registry where one feature of each kind of home page is beta. No real feature is beta today. */
function registryWithBeta(...ids: string[]): FeatureRecord[] {
  return features.map(feature => (ids.includes(feature.id) ? { ...feature, status: 'beta' } : feature));
}

const byId = (id: string) => {
  const feature = features.find(f => f.id === id);
  if (!feature) throw new Error(`fixture: no feature "${id}" in the registry`);
  return feature;
};

describe('beta label placement', () => {
  it('labels nothing with the real registry, where no feature is beta', () => {
    for (const feature of features) expect(isBetaPage(feature.homePage ?? 'home')).toBe(false);
  });

  it("labels a feature page when a feature it is home to is beta", () => {
    expect(byId('settlements').homePage).toBe('feature/settle-up');
    const registry = registryWithBeta('settlements');
    expect(betaFeaturesOf('feature/settle-up', registry).map(f => f.id)).toEqual(['settlements']);
    expect(isBetaPage('feature/settle-up', registry)).toBe(true);
  });

  it('does not label a page that only mentions the beta feature', () => {
    const registry = registryWithBeta('settlements');
    // these pages list `settlements` in their registry `features`, but it is not their subject
    for (const page of ['use-case/housemates', 'use-case/group-trips', 'feature/multiple-currencies', 'how-it-works']) {
      expect(isBetaPage(page, registry), page).toBe(false);
    }
  });

  it('does not label a page that covers many features, such as how it works', () => {
    const homedOnHowItWorks = features.filter(f => f.homePage === 'how-it-works').map(f => f.id);
    expect(homedOnHowItWorks.length, 'fixture: features homed on how it works').toBeGreaterThan(0);
    expect(isBetaPage('how-it-works', registryWithBeta(...homedOnHowItWorks))).toBe(false);
  });
});
