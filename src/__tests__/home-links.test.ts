import { describe, expect, it } from 'vitest';
import {
  LINK_PAGES,
  PAGE_LABELS,
  SCENE_ORDER,
  registerHref,
  resolveHowItWorks,
  resolveLink,
  type LinkRegistry,
} from '@/components/home/data/links';
import { getPage } from '@/site/pages';
import en from '@/i18n/en';
import { SCENE_FEATURES, WORLD_FEATURES, depictedFeatureIds, featureList } from '@/components/home/data/home-features';

const PATHS: Record<string, string> = {
  'feature/split-expenses': '/features/split-expenses/',
  'how-it-works': '/how-it-works/',
};
const registry = (published: string[], labels: LinkRegistry['labels'] = {}): LinkRegistry => ({
  isPublished: id => published.includes(id),
  path: id => PATHS[id] ?? `/${id}/`,
  labels,
});

describe('home links', () => {
  it('links to /go/app/ with from, cta and lang until the page is published', () => {
    const link = resolveLink('expenses', 'fr', registry([]));
    expect(link.kind).toBe('launch');
    expect(link.href).toBe('/go/app/?from=home&cta=scene-expenses&lang=fr');
    expect(link.rel).toBe('nofollow');
    expect(link.labelKey).toBe('home.scene.tryInApp');
  });

  it('keeps the launch link for a page that is missing from the registry', () => {
    expect(resolveLink('currencies', 'en', registry([])).href).toBe('/go/app/?from=home&cta=scene-currencies');
  });

  it('links to the page once it is published and labelled', () => {
    const labels = { 'feature/split-expenses': 'home.pricing.link' } as const;
    const live = resolveLink('expenses', 'de', registry(['feature/split-expenses'], labels));
    expect(live).toMatchObject({ kind: 'page', href: '/de/features/split-expenses/', pageId: 'feature/split-expenses' });
    expect(live.rel).toBeUndefined();
  });

  it('keeps the launch link when the page is published but has no label yet', () => {
    expect(resolveLink('expenses', 'en', registry(['feature/split-expenses'])).kind).toBe('launch');
  });

  it('uses the real registry: pricing and privacy are published, release 1 pages are published too', () => {
    expect(resolveLink('trust', 'en')).toMatchObject({ kind: 'page', href: '/privacy/' });
    expect(resolveLink('start', 'en')).toMatchObject({ kind: 'page', href: '/pricing/' });
    expect(resolveLink('tangle', 'en').kind).toBe('page');
  });

  it('worlds report as scene-worlds and couples waits for its page', () => {
    expect(resolveLink('world:couples', 'en', registry([])).href).toBe('/go/app/?from=home&cta=scene-worlds');
    expect(LINK_PAGES['world:couples']).toBe('use-case/couples');
    expect(LINK_PAGES['world:housemates']).toBe('use-case/housemates');
  });

  it('every linked release 1 page is registered and labelled; couples (release 2) is neither', () => {
    const release2 = new Set(['use-case/couples']);
    const ids = new Set(Object.values(LINK_PAGES).filter((id): id is string => id !== null));
    for (const id of ids) {
      if (release2.has(id)) {
        expect(getPage(id), id).toBeUndefined();
        expect(PAGE_LABELS[id], id).toBeUndefined();
        continue;
      }
      expect(getPage(id), id).toBeDefined();
      const key = PAGE_LABELS[id];
      expect(key, id).toBeDefined();
      expect((en as Record<string, string>)[key as string], id).toBeTruthy();
    }
  });

  it('builds sign-up links through /go/register/', () => {
    expect(registerHref('hero', 'en')).toBe('/go/register/?from=home&cta=hero');
    expect(registerHref('final', 'ja')).toBe('/go/register/?from=home&cta=final&lang=ja');
    expect(registerHref('final', 'xx-ar')).toBe('/go/register/?from=home&cta=final');
  });

  it('points the hero secondary button at #group until how-it-works is published', () => {
    expect(resolveHowItWorks('en', registry([])).href).toBe('#group');
    expect(resolveHowItWorks('en', registry(['how-it-works'])).href).toBe('/how-it-works/');
  });

  it('knows nine scenes in order', () => {
    expect(SCENE_ORDER).toHaveLength(9);
    expect(Object.keys(SCENE_FEATURES).sort()).toEqual([...SCENE_ORDER].sort());
  });
});

describe('home features', () => {
  it('lists each depicted feature once, and the worlds chips are depicted', () => {
    const ids = depictedFeatureIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const world of Object.values(WORLD_FEATURES)) {
      for (const id of world) expect(ids).toContain(id);
    }
  });

  it('produces localized titles for the JSON-LD feature list', () => {
    const list = featureList('en');
    expect(list.length).toBeGreaterThan(5);
    expect(list.every(title => title.length > 0 && !title.startsWith('features.'))).toBe(true);
  });
});
