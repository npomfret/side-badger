/**
 * Where each homepage scene links to (homepage plan, "Scene content" links column).
 *
 * A scene links to its release 1 page from the moment the page is published and has a label, and
 * to `/go/app/` (through `launchHref()`) until then, including while the page is not yet in the
 * registry. Nothing here ever links straight to the app host.
 *
 * The label of a page link is a full-literal `home.links.*` key that H16 adds next to the page.
 * Until a page has a label key in `PAGE_LABELS`, its scene keeps the launch link and
 * `home.scene.tryInApp`, so a visitor never sees a "Try it in Side Badger" label on a page link.
 */
import type { Locale, TranslationKey } from '@/i18n';
import { launchHref, localizedPath } from '@/seo/urls';
import { getPage, requirePage } from '@/site/pages';

export type SceneId =
  | 'top'
  | 'group'
  | 'expenses'
  | 'currencies'
  | 'tangle'
  | 'settle'
  | 'worlds'
  | 'trust'
  | 'start';

/** The scenes in page order. */
export const SCENE_ORDER: readonly SceneId[] = [
  'top',
  'group',
  'expenses',
  'currencies',
  'tangle',
  'settle',
  'worlds',
  'trust',
  'start',
];

export type WorldId = 'housemates' | 'couples' | 'trips' | 'celebrations';

/** Things a scene can link from: a scene, or one of the worlds inside scene 7. */
export type LinkKey = SceneId | `world:${WorldId}`;

/**
 * The first-release page each link is about (registry page ids). `null`: no deeper page, so only
 * the launch link applies (the hero and the final scene use the sign-up button instead).
 * Couples is a release 2 page. It stays in this table, so it links as soon as it is published.
 */
export const LINK_PAGES: Record<LinkKey, string | null> = {
  top: null,
  group: 'how-it-works',
  expenses: 'feature/split-expenses',
  currencies: 'feature/multiple-currencies',
  tangle: 'feature/settle-up',
  settle: 'feature/settle-up',
  worlds: null,
  trust: 'privacy',
  start: 'pricing',
  'world:housemates': 'use-case/housemates',
  'world:couples': 'use-case/couples',
  'world:trips': 'use-case/group-trips',
  'world:celebrations': 'use-case/events-and-celebrations',
};

/**
 * Link labels per page id. Pages already live carry their own key. H16 adds one entry per
 * release 1 page (`home.links.*`, as full literals so the unused-key check sees them).
 */
export const PAGE_LABELS: Partial<Record<string, TranslationKey>> = {
  pricing: 'home.pricing.link',
  privacy: 'home.trust.privacyLink',
  'how-it-works': 'home.hero.ctaSecondary',
};

/** The shared label for a launch link (`/go/app/`). */
export const LAUNCH_LABEL: TranslationKey = 'home.scene.tryInApp';

export interface ResolvedLink {
  kind: 'page' | 'launch';
  href: string;
  labelKey: TranslationKey;
  /** `nofollow` on launch links, none on page links */
  rel?: 'nofollow';
  /** The registry page a page link goes to */
  pageId?: string;
}

/** What link resolution reads. Tests pass their own. */
export interface LinkRegistry {
  isPublished(pageId: string): boolean;
  /** The English path of a published page, such as `/features/settle-up/` */
  path(pageId: string): string;
  labels: Partial<Record<string, TranslationKey>>;
}

export const defaultRegistry: LinkRegistry = {
  isPublished: pageId => getPage(pageId)?.published === true,
  path: pageId => requirePage(pageId).path,
  labels: PAGE_LABELS,
};

/** The scene that a link key's `cta` position names: `scene-<id>`. Worlds report as `worlds`. */
export function sceneOf(key: LinkKey): SceneId {
  return key.startsWith('world:') ? 'worlds' : (key as SceneId);
}

/** The launch link for a scene: `/go/app/?from=home&cta=scene-<id>[&lang=…]`. */
export function sceneLaunchHref(key: LinkKey, locale: Locale): string {
  return launchHref('home', locale, { target: 'app', cta: `scene-${sceneOf(key)}` });
}

/** The sign-up button: `/go/register/?from=home&cta=hero|final[&lang=…]`. */
export function registerHref(cta: 'hero' | 'final', locale: Locale): string {
  return launchHref('home', locale, { target: 'register', cta });
}

/**
 * Resolve a scene's (or world's) link: its page when that page is published and labelled,
 * otherwise `/go/app/`. Scenes with no deeper page always get the launch link.
 */
export function resolveLink(
  key: LinkKey,
  locale: Locale,
  registry: LinkRegistry = defaultRegistry
): ResolvedLink {
  const pageId = LINK_PAGES[key];
  const labelKey = pageId ? registry.labels[pageId] : undefined;
  if (pageId && labelKey && registry.isPublished(pageId)) {
    return { kind: 'page', href: localizedPath(registry.path(pageId), locale), labelKey, pageId };
  }
  return { kind: 'launch', href: sceneLaunchHref(key, locale), labelKey: LAUNCH_LABEL, rel: 'nofollow' };
}

/**
 * The hero's secondary button: the how-it-works page once it is published and labelled,
 * otherwise the `#group` anchor on this page.
 */
export function resolveHowItWorks(
  locale: Locale,
  registry: LinkRegistry = defaultRegistry
): { href: string; labelKey: TranslationKey } {
  const labelKey = registry.labels['how-it-works'] ?? 'home.hero.ctaSecondary';
  if (registry.isPublished('how-it-works')) {
    return { href: localizedPath(registry.path('how-it-works'), locale), labelKey };
  }
  return { href: '#group', labelKey };
}

/** The pricing line and "See pricing" link: `/pricing/` is published. */
export function pricingHref(locale: Locale): string {
  return localizedPath('pricing', locale);
}
