/**
 * The registry gate (restructure 3.7, D16, D17, and the site plan's content model).
 *
 * Checks the feature registry (`src/data/*`), the page registry (`src/site/pages.ts`) and the
 * content entries against each other. The data modules arrive with P22, so they are read with
 * `import.meta.glob` and an absent module counts as an empty registry. The rules run on the real
 * data and, separately, on fixtures with deliberate faults, so the gate is tested even while the
 * registry is empty.
 */
import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import en from '@/i18n/en';
import { getI18nMode } from '@/i18n';
import { allPages, type PageDef } from '@/site/pages';
import { contentDirs } from '@/content/schemas';
import type { FeatureRecord, Screenshot, Substitution, UseCaseRecord } from '@/data/types';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const dataModules = import.meta.glob<Record<string, unknown>>('/src/data/*.ts', { eager: true });
const contentFiles = import.meta.glob<string>('/src/content/**/*.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** The array a data module exports under one of `names`, else its only array export, else []. */
function arrayExport<T>(file: string, ...names: string[]): readonly T[] {
  const mod = dataModules[`/src/data/${file}.ts`];
  if (!mod) return [];
  for (const name of names) if (Array.isArray(mod[name])) return mod[name] as T[];
  const arrays = Object.values(mod).filter(Array.isArray);
  return (arrays.length === 1 ? arrays[0] : []) as T[];
}

interface ContentEntry {
  page: PageDef | undefined;
  file: string;
  locale: string;
  data: { claims?: string[] } & Record<string, unknown>;
}

const dirToCollection = Object.fromEntries(Object.entries(contentDirs).map(([c, d]) => [d, c]));

function loadContent(pages: readonly PageDef[]): ContentEntry[] {
  return Object.entries(contentFiles).flatMap(([file, raw]) => {
    const match = /^\/src\/content\/([^/]+)\/([^/]+)\/([^/]+)\.yaml$/.exec(file);
    if (!match || match[2] === '__preview__') return [];
    const [, dir, slug, locale] = match;
    const page = pages.find(p => p.content?.collection === dirToCollection[dir] && p.content.slug === slug);
    return [{ page, file, locale, data: load(raw) as ContentEntry['data'] }];
  });
}

/** Cells of the substitutions table split at "/" into separate phrases. */
export function phrases(sub: Substitution): string[] {
  return sub.insteadOf
    .split('/')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

/** Every string anywhere inside a value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

interface Registry {
  features: readonly FeatureRecord[];
  useCases: readonly UseCaseRecord[];
  pages: readonly PageDef[];
  screenshots: readonly Screenshot[];
  substitutions: readonly Substitution[];
  entries: readonly ContentEntry[];
  /** English interface strings (src/i18n/en.ts) */
  englishStrings: readonly string[];
  hasBetaLabel: boolean;
}

const duplicates = (ids: readonly string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
const SHIPPABLE = ['available', 'beta'];

export function registryProblems(r: Registry): string[] {
  const problems: string[] = [];
  const featureIds = new Set(r.features.map(f => f.id));
  const useCaseIds = new Set(r.useCases.map(u => u.id));
  const pageIds = new Set(r.pages.map(p => p.id));
  const shotIds = new Set(r.screenshots.map(s => s.id));
  const feature = (id: string) => r.features.find(f => f.id === id);

  // Ids are unique
  for (const id of duplicates(r.features.map(f => f.id))) problems.push(`duplicate feature id "${id}"`);
  for (const id of duplicates(r.useCases.map(u => u.id))) problems.push(`duplicate use-case id "${id}"`);
  for (const id of duplicates(r.pages.map(p => p.id))) problems.push(`duplicate page id "${id}"`);
  for (const id of duplicates(r.features.flatMap(f => f.claims.map(c => c.id)))) problems.push(`duplicate claim id "${id}"`);

  // Cross-references resolve
  for (const f of r.features) {
    if (f.homePage !== null && !pageIds.has(f.homePage)) problems.push(`feature "${f.id}": homePage "${f.homePage}" is not a page`);
    for (const id of f.relatedFeatures) if (!featureIds.has(id)) problems.push(`feature "${f.id}": related feature "${id}" is unknown`);
    for (const id of f.useCases) if (!useCaseIds.has(id)) problems.push(`feature "${f.id}": use case "${id}" is unknown`);
    for (const proof of f.proof) {
      if (proof.kind === 'screenshot' && !shotIds.has(proof.ref)) problems.push(`feature "${f.id}": screenshot "${proof.ref}" is not in screenshots.ts`);
      // Worked examples live on use-case pages and on some feature pages and how it works (site plan briefs)
      if (proof.kind === 'worked-example' && !useCaseIds.has(proof.ref) && !pageIds.has(proof.ref)) {
        problems.push(`feature "${f.id}": worked example "${proof.ref}" is neither a use case nor a page`);
      }
    }
  }
  for (const u of r.useCases) {
    for (const id of u.features) if (!featureIds.has(id)) problems.push(`use case "${u.id}": feature "${id}" is unknown`);
  }
  for (const p of r.pages) {
    if (p.parent && !pageIds.has(p.parent)) problems.push(`page "${p.id}": parent "${p.parent}" is not a page`);
    for (const id of p.related ?? []) if (!pageIds.has(id)) problems.push(`page "${p.id}": related page "${id}" is unknown`);
    for (const id of p.features ?? []) if (!featureIds.has(id)) problems.push(`page "${p.id}": feature "${id}" is unknown`);
  }

  // Pages depict only available or beta features; beta is labelled; each published page has substance
  for (const p of r.pages) {
    const depicted = (p.features ?? []).map(feature).filter((f): f is FeatureRecord => Boolean(f));
    for (const f of depicted) {
      if (!SHIPPABLE.includes(f.status)) problems.push(`page "${p.id}" depicts "${f.id}", which is ${f.status}`);
    }
    if (depicted.some(f => f.status === 'beta') && !r.hasBetaLabel) {
      problems.push(`page "${p.id}" depicts a beta feature but en.ts has no "feature.betaLabel"`);
    }
    if (p.published && depicted.length > 0 && !depicted.some(f => f.status === 'available')) {
      problems.push(`published page "${p.id}" has no available feature`);
    }
  }

  // Claims: known ids on shippable features, identical across locales
  const claimOwner = new Map(r.features.flatMap(f => f.claims.map(c => [c.id, f] as const)));
  const claimsByPage = new Map<string, string>();
  for (const e of r.entries) {
    const claims = e.data.claims;
    if (!Array.isArray(claims)) {
      problems.push(`${e.file}: lists no claims array`);
      continue;
    }
    for (const id of claims) {
      const owner = claimOwner.get(id);
      if (!owner) problems.push(`${e.file}: unknown claim id "${id}"`);
      else if (!SHIPPABLE.includes(owner.status)) problems.push(`${e.file}: claim "${id}" belongs to "${owner.id}", which is ${owner.status}`);
    }
    const key = e.page?.id ?? e.file.replace(/\/[^/]+\.yaml$/, '');
    const signature = JSON.stringify([...claims].sort());
    const first = claimsByPage.get(key);
    if (first === undefined) claimsByPage.set(key, signature);
    else if (first !== signature) problems.push(`${e.file}: claims differ between locales`);
  }

  // Wording that must not be used: English YAML and English interface strings
  const banned = r.substitutions.flatMap(s => phrases(s).map(phrase => ({ phrase, use: s.use })));
  const check = (where: string, texts: readonly string[]) => {
    for (const text of texts) {
      const lower = text.toLowerCase();
      for (const { phrase, use } of banned) {
        if (lower.includes(phrase)) problems.push(`${where}: contains "${phrase}" (write: ${use})`);
      }
    }
  };
  for (const e of r.entries.filter(x => x.locale === 'en')) check(e.file, strings({ ...e.data, claims: undefined }));
  check('src/i18n/en.ts', r.englishStrings);
  for (const f of r.features) {
    for (const claim of f.claims) check(`claim "${claim.id}"`, [claim.text]);
  }

  return problems;
}

// ---------------------------------------------------------------------------
// The real registry
// ---------------------------------------------------------------------------

/**
 * English strings allowed to keep a phrase from the "Instead of" column of the substitutions
 * table, keyed by i18n key, with the phrases each key may keep. It held the legacy pricing strings
 * until P31 rewrote them, and it must stay empty: fix the copy instead of adding an entry. A stale
 * entry fails, and strict mode (the W4b gate, D38) applies no exemption and fails while it is
 * non-empty.
 */
const LEGACY_SUBSTITUTION_EXEMPTIONS: Readonly<Record<string, readonly string[]>> = {};

const STRICT = getI18nMode() === 'strict';
const enStrings = en as Record<string, string>;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** English interface strings, with each exempt phrase cut from its key's text (none in strict mode). */
function englishInterfaceStrings(): string[] {
  return Object.entries(enStrings).map(([key, text]) => {
    const exempt = STRICT ? [] : (LEGACY_SUBSTITUTION_EXEMPTIONS[key] ?? []);
    return exempt.reduce((rest, phrase) => rest.split(new RegExp(escapeRegExp(phrase), 'i')).join(' … '), text);
  });
}

const pages = allPages();
const real: Registry = {
  features: arrayExport<FeatureRecord>('features', 'features'),
  useCases: arrayExport<UseCaseRecord>('use-cases', 'useCases', 'useCasesData', 'useCaseRecords'),
  pages,
  screenshots: arrayExport<Screenshot>('screenshots', 'screenshots', 'shots'),
  substitutions: arrayExport<Substitution>('substitutions', 'substitutions'),
  entries: loadContent(pages),
  englishStrings: englishInterfaceStrings(),
  hasBetaLabel: 'feature.betaLabel' in en,
};

describe(`registry (${real.features.length} features, ${real.useCases.length} use cases, ${real.pages.length} pages, ${real.entries.length} content entries)`, () => {
  it('has no problems', () => {
    expect(registryProblems(real)).toEqual([]);
  });

  it('exempts only legacy strings that still use their phrase', () => {
    const banned = real.substitutions.flatMap(phrases);
    const stale = Object.entries(LEGACY_SUBSTITUTION_EXEMPTIONS).flatMap(([key, list]) =>
      list.flatMap(phrase => {
        if (!(key in enStrings)) return [`${key}: no longer in en.ts`];
        if (!banned.includes(phrase)) return [`${key}: "${phrase}" is not a phrase to avoid`];
        if (!enStrings[key].toLowerCase().includes(phrase)) return [`${key}: no longer contains "${phrase}"`];
        return [];
      })
    );
    expect(stale, 'remove these entries from LEGACY_SUBSTITUTION_EXEMPTIONS').toEqual([]);
  });

  it.runIf(STRICT)('has no legacy substitution exemptions left in strict mode (D38)', () => {
    expect(Object.keys(LEGACY_SUBSTITUTION_EXEMPTIONS), 'P31 rewrites these strings').toEqual([]);
  });

  it('gives every registered page a well-formed path and a real parent chain', () => {
    for (const p of pages) {
      expect(p.path, p.id).toMatch(/^\/([a-z0-9-]+\/)*$/);
      const seen = new Set<string>();
      for (let cur: PageDef | undefined = p; cur; cur = pages.find(x => x.id === cur!.parent)) {
        expect(seen.has(cur.id), `parent cycle at "${cur.id}"`).toBe(false);
        seen.add(cur.id);
      }
    }
  });

  it('has a feature home page that lists the feature', () => {
    const bad = real.features.flatMap(f => {
      const home = f.homePage && pages.find(p => p.id === f.homePage);
      return home && home.features && !home.features.includes(f.id) ? [`${f.id} -> ${home.id}`] : [];
    });
    expect(bad, 'a home page must list the features it covers in its `features`').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The rules, against fixtures
// ---------------------------------------------------------------------------

const feature = (over: Partial<FeatureRecord> & { id: string }): FeatureRecord => ({
  homePage: null,
  capability: '',
  problem: '',
  audiences: { primary: [], secondary: [] },
  status: 'available',
  confidence: 'high',
  evidence: [],
  verifiedAt: 'abc1234',
  limits: [],
  prerequisites: [],
  proof: [],
  relatedFeatures: [],
  useCases: [],
  searchLanguage: [],
  claims: [],
  notApproved: [],
  release: 1,
  ...over,
});
const page = (over: Partial<PageDef> & { id: string }): PageDef => ({
  type: 'feature',
  path: `/${over.id}/`,
  published: true,
  locales: 'all',
  indexing: 'per-locale-review',
  ...over,
});
const entry = (file: string, locale: string, data: ContentEntry['data'], p?: PageDef): ContentEntry => ({ file, locale, data, page: p });

const empty: Registry = {
  features: [],
  useCases: [],
  pages: [],
  screenshots: [],
  substitutions: [{ insteadOf: 'Zero tracking / no tracking', use: 'No ads or third-party trackers' }],
  entries: [],
  englishStrings: [],
  hasBetaLabel: true,
};

describe('registry rules (fixtures)', () => {
  it('an empty registry has no problems', () => {
    expect(registryProblems(empty)).toEqual([]);
  });

  const split = feature({ id: 'split', claims: [{ id: 'split.equal', text: 'Split a bill equally.' }], useCases: ['trip'], proof: [{ kind: 'screenshot', ref: 'shot-1' }] });
  const trip: UseCaseRecord = { id: 'trip', audiences: [], features: ['split'], scenarios: [] };
  const splitPage = page({ id: 'feature/split', features: ['split'] });
  const good: Registry = {
    ...empty,
    features: [split],
    useCases: [trip],
    pages: [splitPage],
    screenshots: [{ id: 'shot-1' }],
    entries: [
      entry('/src/content/features/split/en.yaml', 'en', { claims: ['split.equal'], lead: 'Split it.' }, splitPage),
      entry('/src/content/features/split/fr.yaml', 'fr', { claims: ['split.equal'], lead: 'Partagez.' }, splitPage),
    ],
  };

  it('accepts a consistent registry', () => {
    expect(registryProblems(good)).toEqual([]);
  });

  it.each<[string, Partial<Registry>, RegExp]>([
    ['a duplicate feature id', { features: [split, split] }, /duplicate feature id "split"/],
    ['a duplicate page id', { pages: [splitPage, splitPage] }, /duplicate page id/],
    ['a duplicate claim id', { features: [split, feature({ id: 'other', claims: split.claims })] }, /duplicate claim id/],
    ['an unknown related feature', { features: [{ ...split, relatedFeatures: ['nope'] }] }, /related feature "nope"/],
    ['an unknown use case', { features: [{ ...split, useCases: ['nope'] }] }, /use case "nope"/],
    ['a use case with an unknown feature', { useCases: [{ ...trip, features: ['nope'] }] }, /feature "nope"/],
    ['an unknown home page', { features: [{ ...split, homePage: 'nope' as never }] }, /homePage "nope"/],
    ['a missing screenshot', { screenshots: [] }, /screenshot "shot-1"/],
    ['an unknown worked example', { features: [{ ...split, proof: [{ kind: 'worked-example', ref: 'x' }] }] }, /worked example "x"/],
    ['an unknown parent', { pages: [{ ...splitPage, parent: 'nope' }] }, /parent "nope"/],
    ['an unknown page feature', { pages: [{ ...splitPage, features: ['nope'] }] }, /feature "nope"/],
    ['a planned feature on a page', { features: [{ ...split, status: 'planned' }] }, /depicts "split", which is planned/],
    ['a retired feature on a page', { features: [{ ...split, status: 'retired' }] }, /which is retired/],
    ['a published page with only beta features', { features: [{ ...split, status: 'beta' }] }, /no available feature/],
    ['a beta feature without a label', { features: [{ ...split, status: 'beta' }, feature({ id: 'b' })], pages: [{ ...splitPage, features: ['split', 'b'] }], hasBetaLabel: false }, /betaLabel/],
    ['an unknown claim id', { entries: [entry('/e.yaml', 'en', { claims: ['nope'] })] }, /unknown claim id "nope"/],
    ['a claim of a planned feature', { features: [{ ...split, status: 'planned' }], pages: [] }, /belongs to "split", which is planned/],
    ['claims that differ by locale', { entries: [good.entries[0], entry(good.entries[1].file, 'fr', { claims: [] }, splitPage)] }, /claims differ/],
    ['an entry with no claims list', { entries: [entry('/e.yaml', 'en', {})] }, /no claims array/],
    ['a phrase to avoid in English YAML', { entries: [entry('/src/content/features/split/en.yaml', 'en', { claims: [], lead: 'We offer NO TRACKING at all.' }, splitPage)] }, /contains "no tracking"/],
    ['a phrase to avoid in en.ts', { englishStrings: ['Zero tracking, ever'] }, /src\/i18n\/en\.ts: contains "zero tracking"/],
    ['a phrase to avoid in an approved claim', { features: [{ ...split, claims: [{ id: 'split.equal', text: 'Zero tracking.' }] }] }, /claim "split.equal"/],
  ])('reports %s', (_name, patch, message) => {
    expect(registryProblems({ ...good, ...patch }).join('\n')).toMatch(message);
  });

  it('accepts a worked example on a page as well as on a use case', () => {
    const proof = [{ kind: 'worked-example' as const, ref: splitPage.id }, { kind: 'worked-example' as const, ref: trip.id }];
    expect(registryProblems({ ...good, features: [{ ...split, proof }] })).toEqual([]);
  });

  it('allows a beta feature that has an available sibling and a label', () => {
    const beta = feature({ id: 'b', status: 'beta' });
    const r: Registry = { ...good, features: [split, beta], pages: [{ ...splitPage, features: ['split', 'b'] }] };
    expect(registryProblems(r)).toEqual([]);
  });

  it('only checks English text against the phrases to avoid', () => {
    const r: Registry = { ...good, entries: [...good.entries, entry('/src/content/features/split/fr.yaml', 'fr', { claims: ['split.equal'], lead: 'No tracking' }, splitPage)] };
    expect(registryProblems(r)).toEqual([]);
  });

  it('splits a substitutions cell at "/" into phrases', () => {
    expect(phrases({ insteadOf: 'Settle with a single tap / pay back', use: '' })).toEqual(['settle with a single tap', 'pay back']);
  });
});
