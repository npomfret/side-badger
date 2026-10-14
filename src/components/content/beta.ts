/**
 * Whether a page depicts a feature that is in beta (the registry's `status`), so its layout shows
 * the `feature.betaLabel` label (restructure 3.7: "a beta feature renders a beta label").
 * The registry module (`src/data/features.ts`, P22) is read through a glob, so this works before
 * that file exists: with no registry nothing is in beta.
 */
import type { FeatureRecord } from '../../data/types';
import { requirePage } from '../../site/pages';

const registry = import.meta.glob<Record<string, unknown>>('/src/data/features.ts', { eager: true });

function features(): readonly FeatureRecord[] {
  const mod = Object.values(registry)[0];
  const list = mod && (mod.features ?? Object.values(mod).find(Array.isArray));
  return Array.isArray(list) ? (list as FeatureRecord[]) : [];
}

export function dependsOnBeta(pageId: string): boolean {
  const ids = new Set(requirePage(pageId).features ?? []);
  return features().some(feature => ids.has(feature.id) && feature.status === 'beta');
}
