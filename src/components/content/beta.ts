/**
 * Where the `feature.betaLabel` label goes (restructure 3.7: "a beta feature renders a beta
 * label"; site plan: beta means "works but is labelled as unfinished in the app").
 *
 * The label must not overstate. A page lists many features it mentions (`PageDef.features`), and
 * one beta feature among them does not make the page beta. The registry ties each feature to the
 * one page that covers it (`FeatureRecord.homePage`). When that page is a feature page, the page
 * is about the feature, so the label goes:
 *
 * - beside the feature page's `h1`;
 * - beside every card or related link that points to that feature page, so a use case or hub
 *   that shows the feature carries the label next to it, not on itself.
 *
 * A beta feature homed on a page that covers many features (how it works, pricing) gets no
 * page-level label: content entries do not tie a step or an option to a feature id, so labelling
 * one step needs a schema field first.
 */
import { features as registry } from '../../data/features';
import type { FeatureRecord } from '../../data/types';
import { getPage } from '../../site/pages';

/** The beta features whose home is `pageId`. */
export function betaFeaturesOf(pageId: string, features: readonly FeatureRecord[] = registry): FeatureRecord[] {
  return features.filter(feature => feature.homePage === pageId && feature.status === 'beta');
}

/** Whether `pageId` is a feature page about a beta feature, so it and the links to it carry the label. */
export function isBetaPage(pageId: string, features: readonly FeatureRecord[] = registry): boolean {
  return getPage(pageId)?.type === 'feature' && betaFeaturesOf(pageId, features).length > 0;
}
