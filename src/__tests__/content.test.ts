/**
 * The content gate (restructure 3.7, D11, D12, D14, D31, D38).
 *
 * Loads every YAML entry under src/content/{features,use-cases,pages,compare,guides} with
 * js-yaml and the same Zod schemas Astro validates with. With no entries yet it still runs the
 * rule helpers against in-test fixtures, so the gate itself is tested.
 *
 * I18N_MODE=english-first (D38): an entry may be missing only for a page listed in
 * src/i18n/pending/pages.json. Strict mode (default) allows no missing entries.
 */
import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync, type SpawnSyncReturns } from 'child_process';
import { dump, load } from 'js-yaml';
import { getI18nMode, locales, pendingPageIds } from '@/i18n';
import { allPages, getPage, type PageDef } from '@/site/pages';
import {
  contentDirs,
  contentSchemas,
  featurePage,
  richTextPageIds,
  richTextProblem,
  type ContentCollection,
} from '@/content/schemas';
import { computeExample } from '@/lib/settle';

const ROOT = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const ENGLISH_FIRST = getI18nMode() === 'english-first';
const pending = new Set(ENGLISH_FIRST ? pendingPageIds() : []);

// ---------------------------------------------------------------------------
// Helpers (also exercised against fixtures below)
// ---------------------------------------------------------------------------

/** Canonical JSON: sorted keys, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value instanceof Date ? value.toISOString() : value);
}

/** D14: first 8 hex digits of SHA-256 over the English entry without `review` and `translatedFrom`. */
export function sourceHash(english: Record<string, unknown>): string {
  const { review: _review, translatedFrom: _from, ...rest } = english;
  return crypto.createHash('sha256').update(canonicalJson(rest)).digest('hex').slice(0, 8);
}

/** Leaves that must be identical in every locale (ids, shot ids, split structure). */
const STRUCTURAL_LEAVES = new Set(['shot', 'payer', 'method', 'id']);
/** Top-level fields that are bookkeeping and never compared with English. */
const BOOKKEEPING = new Set(['review', 'translatedFrom', 'identicalApproved']);

interface Leaf {
  path: string;
  key: string;
  value: string | number | boolean | null;
}

export function leaves(value: unknown, prefix = '', key = ''): Leaf[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, prefix ? `${prefix}.${i}` : `${i}`, key));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).flatMap(([k, v]) => {
      if (!prefix && BOOKKEEPING.has(k)) return [];
      return leaves(v, prefix ? `${prefix}.${k}` : k, k);
    });
  }
  return [{ path: prefix, key, value: value as Leaf['value'] }];
}

/** Differences in shape between the English entry and a translation. */
export function parityProblems(english: Record<string, unknown>, other: Record<string, unknown>): string[] {
  const en = new Map(leaves(english).map(l => [l.path, l]));
  const ot = new Map(leaves(other).map(l => [l.path, l]));
  const problems: string[] = [];
  for (const p of en.keys()) if (!ot.has(p)) problems.push(`missing ${p}`);
  for (const p of ot.keys()) if (!en.has(p)) problems.push(`extra ${p}`);
  for (const [p, leaf] of en) {
    const o = ot.get(p);
    if (!o) continue;
    // Share keys are part of the path, so a different participant shows up as missing/extra above
    if ((STRUCTURAL_LEAVES.has(leaf.key) || p.startsWith('claims.')) && leaf.value !== o.value) {
      problems.push(`${p} must equal English ("${leaf.value}" vs "${o.value}")`);
    }
    if (typeof leaf.value !== typeof o.value) problems.push(`${p} changes type`);
  }
  return problems;
}

/** String values identical to English that the entry has not approved. */
export function untranslated(english: Record<string, unknown>, other: Record<string, unknown>): string[] {
  const approved = new Set((other.identicalApproved as string[] | undefined) ?? []);
  const en = new Map(leaves(english).map(l => [l.path, l]));
  return leaves(other)
    .filter(l => typeof l.value === 'string' && /\p{L}/u.test(l.value))
    .filter(l => !STRUCTURAL_LEAVES.has(l.key) && l.key !== 'currency' && !l.path.startsWith('claims.'))
    .filter(l => en.get(l.path)?.value === l.value && !approved.has(l.path))
    .map(l => l.path);
}

/** Empty strings and TODO/TBD markers anywhere in an entry. */
export function placeholderProblems(entry: Record<string, unknown>): string[] {
  return leaves(entry)
    .filter(l => typeof l.value === 'string' && (l.value.trim() === '' || /\b(TODO|TBD)\b/.test(l.value)))
    .map(l => l.path);
}

/** Every `page:` link in an entry, with where it is. */
export function pageLinks(entry: Record<string, unknown>): { path: string; id: string }[] {
  return leaves(entry).flatMap(l =>
    typeof l.value === 'string' ? richTextPageIds(l.value).map(id => ({ path: l.path, id })) : []
  );
}

/** The worked example's structure must not change between locales (D23). */
export function exampleProblems(english: Record<string, unknown>, other: Record<string, unknown>): string[] {
  if (!english.example || !other.example) return [];
  try {
    const a = computeExample(english.example as never);
    const b = computeExample(other.example as never);
    return a.transfers.length === b.transfers.length ? [] : [`${a.transfers.length} transfers in English, ${b.transfers.length} here`];
  } catch (error) {
    return [(error as Error).message];
  }
}

// ---------------------------------------------------------------------------
// The entries on disk
// ---------------------------------------------------------------------------

interface Entry {
  collection: ContentCollection;
  slug: string;
  locale: string;
  file: string;
  data: Record<string, unknown>;
}

function loadEntries(base: string): Entry[] {
  const entries: Entry[] = [];
  for (const [collection, dirName] of Object.entries(contentDirs) as [ContentCollection, string][]) {
    const dir = path.join(base, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const slugDir = path.join(dir, slug);
      if (!fs.statSync(slugDir).isDirectory()) continue;
      for (const file of fs.readdirSync(slugDir)) {
        if (!file.endsWith('.yaml')) continue;
        const full = path.join(slugDir, file);
        const data = load(fs.readFileSync(full, 'utf-8')) as Record<string, unknown>;
        entries.push({ collection, slug, locale: file.replace(/\.yaml$/, ''), file: path.relative(ROOT, full), data });
      }
    }
  }
  return entries;
}

const allEntries = loadEntries(CONTENT_DIR);
// Preview fixtures (P24) are English layout fixtures with no page behind them
const isPreview = (e: Entry) => e.slug === '__preview__';
const entries = allEntries.filter(e => !isPreview(e));
const find = (page: PageDef, locale: string) =>
  entries.find(e => e.collection === page.content!.collection && e.slug === page.content!.slug && e.locale === locale);

const contentPages = allPages().filter(p => p.content);
const publishedContentPages = contentPages.filter(p => p.published);

describe(`content entries (${getI18nMode()} mode, ${entries.length} entries, ${allEntries.length - entries.length} previews)`, () => {
  it('has a registered page behind every entry', () => {
    const orphans = entries.filter(
      e => !contentPages.some(p => p.content!.collection === e.collection && p.content!.slug === e.slug)
    );
    expect(orphans.map(e => e.file), 'entries with no page that names them in src/site/pages.ts').toEqual([]);
  });

  it('uses only supported locales', () => {
    const real = new Set<string>(locales);
    expect(entries.filter(e => !real.has(e.locale)).map(e => e.file)).toEqual([]);
  });

  it('validates every entry (and every preview fixture) against its schema', () => {
    const failures = allEntries.flatMap(e => {
      const result = contentSchemas[e.collection].safeParse(e.data);
      return result.success ? [] : [`${e.file}: ${result.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`];
    });
    expect(failures).toEqual([]);
  });

  describe('page coverage', () => {
    it('has an English entry for every published page with content', () => {
      expect(publishedContentPages.filter(p => !find(p, 'en')).map(p => p.id)).toEqual([]);
    });

    it('has an entry in every locale a published page lists (English-first: unless the page is pending)', () => {
      const missing: string[] = [];
      for (const page of publishedContentPages) {
        const wanted = page.locales === 'all' ? locales : locales.filter(l => page.locales.includes(l));
        for (const locale of wanted) {
          if (!find(page, locale) && !pending.has(page.id)) missing.push(`${page.id}/${locale}`);
        }
      }
      expect(missing).toEqual([]);
    });

    it('lists only real, content-bearing pages in pending/pages.json', () => {
      const bad = pendingPageIds().filter(id => !getPage(id));
      expect(bad, 'unknown page ids in pending/pages.json').toEqual([]);
    });

    it('lists a page as pending only while some locale still lacks its entry', () => {
      if (!ENGLISH_FIRST) return;
      const done = pendingPageIds().filter(id => {
        const page = getPage(id);
        if (!page?.content || !page.published) return false;
        const wanted = page.locales === 'all' ? locales : locales.filter(l => page.locales.includes(l));
        return wanted.every(l => find(page, l));
      });
      expect(done, 'complete pages still listed in pending/pages.json').toEqual([]);
    });
  });

  describe('translations', () => {
    const english = new Map(entries.filter(e => e.locale === 'en').map(e => [`${e.collection}/${e.slug}`, e]));
    const translated = entries.filter(e => e.locale !== 'en');

    it('records no source hash on English entries', () => {
      expect(entries.filter(e => e.locale === 'en' && 'translatedFrom' in e.data).map(e => e.file)).toEqual([]);
    });

    it('has an English entry behind every translation', () => {
      expect(translated.filter(e => !english.has(`${e.collection}/${e.slug}`)).map(e => e.file)).toEqual([]);
    });

    it('translatedFrom equals the current English hash', () => {
      const stale = translated.flatMap(e => {
        const en = english.get(`${e.collection}/${e.slug}`);
        if (!en) return [];
        const want = sourceHash(en.data);
        return e.data.translatedFrom === want ? [] : [`${e.file}: translatedFrom ${e.data.translatedFrom ?? '(none)'}, English is ${want}`];
      });
      expect(stale, 'run: npm run i18n content-lock <locale> <entry> after translating').toEqual([]);
    });

    it('has the same structure, claims, shot ids and example shape as English', () => {
      const bad = translated.flatMap(e => {
        const en = english.get(`${e.collection}/${e.slug}`);
        if (!en) return [];
        return [...parityProblems(en.data, e.data), ...exampleProblems(en.data, e.data)].map(p => `${e.file}: ${p}`);
      });
      expect(bad).toEqual([]);
    });

    it('has no value identical to English outside identicalApproved', () => {
      const bad = translated.flatMap(e => {
        const en = english.get(`${e.collection}/${e.slug}`);
        return en ? untranslated(en.data, e.data).map(p => `${e.file}: ${p}`) : [];
      });
      expect(bad).toEqual([]);
    });

    it('lists identicalApproved paths only where the value really is identical', () => {
      const bad = translated.flatMap(e => {
        const en = english.get(`${e.collection}/${e.slug}`);
        if (!en) return [];
        const enLeaves = new Map(leaves(en.data).map(l => [l.path, l.value]));
        const own = new Map(leaves(e.data).map(l => [l.path, l.value]));
        return ((e.data.identicalApproved as string[] | undefined) ?? [])
          .filter(p => !own.has(p) || own.get(p) !== enLeaves.get(p))
          .map(p => `${e.file}: ${p}`);
      });
      expect(bad).toEqual([]);
    });

    it('has no entry still marked machine (D31)', () => {
      const machine = translated.filter(e => (e.data.review as { status?: string } | undefined)?.status === 'machine');
      expect(machine.map(e => e.file), 'run the back-translation check: npm run i18n backcheck <locale> <page>').toEqual([]);
    });
  });

  describe('every entry', () => {
    it('has no empty value, TODO or TBD', () => {
      expect(entries.flatMap(e => placeholderProblems(e.data).map(p => `${e.file}: ${p}`))).toEqual([]);
    });

    it('links only to registered pages, and a published page only to published ones', () => {
      const bad = entries.flatMap(e => {
        const own = contentPages.find(p => p.content!.collection === e.collection && p.content!.slug === e.slug);
        return pageLinks(e.data).flatMap(({ path: where, id }) => {
          const target = getPage(id);
          if (!target) return [`${e.file}: ${where} links to unknown page "${id}"`];
          if (own?.published && !target.published) return [`${e.file}: ${where} links to unpublished page "${id}"`];
          return [];
        });
      });
      expect(bad).toEqual([]);
    });

    it('names a reviewer and date on every reviewed entry', () => {
      const bad = entries.filter(e => {
        const r = e.data.review as { status?: string; reviewer?: string; date?: unknown } | undefined;
        return r?.status === 'reviewed' && !(r.reviewer && r.date);
      });
      expect(bad.map(e => e.file)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// The rules themselves, against fixtures (these also run with no content)
// ---------------------------------------------------------------------------

const cta = { heading: 'Ready?', body: 'Open the [app](https://app.sidebadger.me/).', button: 'Open the app' };
const english = {
  review: { status: 'reviewed', reviewer: 'nick', date: '2026-10-01' },
  claims: ['balances.fewer-payments'],
  meta: { title: 'Split expenses', description: 'Split any expense.' },
  h1: 'Split expenses',
  lead: 'Share a **bill** and see [pricing](page:pricing).',
  cta,
  problem: { heading: 'The problem', body: 'Bills pile up.' },
  workflow: {
    heading: 'How it works',
    steps: [
      { title: 'Add', body: 'Add an expense.', shot: 'add-expense', shotAlt: 'The add expense form' },
      { title: 'Split', body: 'Choose a split.' },
    ],
  },
  options: { heading: 'Options', items: [{ title: 'Equal', body: 'Everyone pays the same.' }] },
  limits: { heading: 'Limits', items: ['Amounts are rounded to the cent.'] },
  faq: {
    heading: 'FAQ',
    items: [1, 2, 3].map(n => ({ q: `Question ${n}?`, a: `Answer ${n}.` })),
  },
  useCasesHeading: 'Use cases',
};
const french = {
  ...english,
  review: { status: 'checked', checker: 'agent-2', date: '2026-10-02' },
  translatedFrom: 'deadbeef',
  meta: { title: 'Partager les dépenses', description: 'Partagez toute dépense.' },
  h1: 'Partager les dépenses',
  lead: 'Partagez une **note** et voyez les [tarifs](page:pricing).',
  cta: { heading: 'Prêt ?', body: "Ouvrez l'[appli](https://app.sidebadger.me/).", button: "Ouvrir l'appli" },
  problem: { heading: 'Le problème', body: 'Les notes pèsent.' },
  workflow: {
    heading: 'Comment ça marche',
    steps: [
      { title: 'Ajouter', body: 'Ajoutez une dépense.', shot: 'add-expense', shotAlt: 'Le formulaire' },
      { title: 'Répartir', body: 'Choisissez une répartition.' },
    ],
  },
  options: { heading: 'Options', items: [{ title: 'Égal', body: 'Chacun paie pareil.' }] },
  limits: { heading: 'Limites', items: ["Les montants sont arrondis au centime."] },
  faq: { heading: 'FAQ', items: [1, 2, 3].map(n => ({ q: `Question ${n} ?`, a: `Réponse ${n}.` })) },
  useCasesHeading: 'Cas d’usage',
};

describe('content rules (fixtures)', () => {
  it('accepts a complete feature page', () => {
    expect(featurePage.safeParse(english).success).toBe(true);
    expect(featurePage.safeParse(french).success).toBe(true);
  });

  it.each([
    ['an unknown field', { ...english, surprise: 1 }],
    ['a missing claims list', { ...english, claims: undefined }],
    ['two FAQ items', { ...english, faq: { heading: 'F', items: english.faq.items.slice(0, 2) } }],
    ['seven FAQ items', { ...english, faq: { heading: 'F', items: [...english.faq.items, ...english.faq.items, english.faq.items[0]] } }],
    ['no limits', { ...english, limits: { heading: 'L', items: [] } }],
    ['one workflow step', { ...english, workflow: { heading: 'H', steps: [english.workflow.steps[0]] } }],
    ['a shot without alt text', { ...english, workflow: { heading: 'H', steps: [{ title: 'A', body: 'B', shot: 's' }, english.workflow.steps[1]] } }],
    ['reviewed without a reviewer', { ...english, review: { status: 'reviewed' } }],
    ['checked without a checker', { ...english, review: { status: 'checked', date: '2026-10-01' } }],
    ['a bad hash', { ...french, translatedFrom: 'xyz' }],
    ['an external link', { ...english, lead: 'See [this](https://example.com).' }],
    ['a block heading in rich text', { ...english, lead: '# Title' }],
    ['a list in rich text', { ...english, lead: '- one\n- two' }],
    ['HTML in rich text', { ...english, lead: 'A <b>bold</b> claim' }],
    ['an image in rich text', { ...english, lead: '![alt](page:pricing)' }],
    ['two paragraphs', { ...english, lead: 'One.\n\nTwo.' }],
    ['an empty heading', { ...english, h1: '' }],
  ])('rejects %s', (_name, entry) => {
    expect(featurePage.safeParse(entry).success).toBe(false);
  });

  it('allows page links and app links in rich text', () => {
    expect(richTextProblem('See [pricing](page:pricing) and [the app](https://app.sidebadger.me/register).')).toBeUndefined();
    expect(richTextProblem('Nested [page](page:feature/split-expenses) link.')).toBeUndefined();
    expect(richTextProblem('A [bad](page:Not Valid) link.')).toMatch(/malformed page link/);
    expect(richTextProblem('A [bad](http://app.sidebadger.me/) link.')).toMatch(/only page:/);
  });

  it('hashes the English entry without review and translatedFrom', () => {
    const a = sourceHash(english);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(sourceHash({ ...english, review: { status: 'machine' }, translatedFrom: 'aaaaaaaa' })).toBe(a);
    expect(sourceHash({ ...english, h1: 'Split expenses!' })).not.toBe(a);
    // key order never matters
    expect(sourceHash({ h1: 'a', lead: 'b' })).toBe(sourceHash({ lead: 'b', h1: 'a' }));
    // fixed vector, shared with scripts/i18n-manager.mjs content-hash
    expect(canonicalJson({ b: [1, { d: 'x', c: null }], a: 'é' })).toBe('{"a":"é","b":[1,{"c":null,"d":"x"}]}');
  });

  it('finds structural drift', () => {
    expect(parityProblems(english, french)).toEqual([]);
    const fewer = { ...french, options: { heading: 'O', items: [] } };
    expect(parityProblems(english, fewer).join()).toMatch(/missing options.items.0.title/);
    const reshot = structuredClone(french) as typeof french;
    reshot.workflow.steps[0].shot = 'other-shot';
    expect(parityProblems(english, reshot).join()).toMatch(/workflow.steps.0.shot must equal English/);
    expect(parityProblems(english, { ...french, claims: ['other.claim'] }).join()).toMatch(/claims.0 must equal English/);
    expect(parityProblems(english, { ...french, bonus: 'x' }).join()).toMatch(/extra bonus/);
  });

  it('finds untranslated values, unless approved', () => {
    expect(untranslated(english, french)).toEqual(['options.heading', 'faq.heading']);
    expect(untranslated(english, { ...french, identicalApproved: ['options.heading', 'faq.heading'] })).toEqual([]);
    expect(untranslated(english, { ...french, h1: english.h1 })).toContain('h1');
  });

  it('finds placeholders and links', () => {
    expect(placeholderProblems({ a: 'fine', b: { c: ' ' }, d: ['TODO later', 'TBD'] })).toEqual(['b.c', 'd.0', 'd.1']);
    expect(placeholderProblems({ a: 'tomorrow' })).toEqual([]);
    expect(pageLinks(english)).toEqual([{ path: 'lead', id: 'pricing' }]);
  });

  it('compares worked examples by structure, not by amounts', () => {
    const example = (amounts: number[], currency = 'EUR') => ({
      currency,
      people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
      expenses: amounts.map((amount, i) => ({
        label: `e${i}`,
        payer: ['a', 'b', 'c'][i],
        amount,
        split: { method: 'equal' as const },
      })),
    });
    expect(exampleProblems({ example: example([90, 45, 15]) }, { example: example([900, 450, 150], 'JPY') })).toEqual([]);
    expect(exampleProblems({ example: example([90, 45, 15]) }, { example: example([30, 30, 30]) })[0]).toMatch(/transfers/);
  });
});

// ---------------------------------------------------------------------------
// The i18n content commands (scripts/i18n-manager.mjs), against a scratch content tree
// ---------------------------------------------------------------------------

describe('i18n content commands', () => {
  const script = path.join(ROOT, 'scripts', 'i18n-manager.mjs');
  const withTree = (run: (dir: string, i18n: (...args: string[]) => SpawnSyncReturns<string>) => void) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
    try {
      const slugDir = path.join(dir, 'features', 'split-expenses');
      fs.mkdirSync(slugDir, { recursive: true });
      fs.writeFileSync(path.join(slugDir, 'en.yaml'), dump(english));
      const { translatedFrom: _t, ...fr } = french;
      fs.writeFileSync(path.join(slugDir, 'fr.yaml'), dump({ ...fr, review: { status: 'machine' } }));
      run(dir, (...args) =>
        spawnSync('node', [script, ...args], {
          encoding: 'utf-8',
          env: { ...process.env, I18N_CONTENT_DIR: dir, NO_COLOR: '1' },
        })
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  it('content-hash prints the same hash as the test helper', () => {
    withTree((_dir, i18n) => {
      expect(i18n('content-hash', 'features/split-expenses').stdout.trim()).toBe(sourceHash(english));
    });
  });

  it('content-lock records translatedFrom, and content-stale reports until then and after an English change', () => {
    withTree((dir, i18n) => {
      const before = i18n('content-stale');
      expect(before.status).toBe(1);
      expect(before.stdout).toMatch(/fr\tunconfirmed\tfeatures\/split-expenses/);

      expect(i18n('content-lock', 'fr', 'features/split-expenses').status).toBe(0);
      const fr = load(fs.readFileSync(path.join(dir, 'features', 'split-expenses', 'fr.yaml'), 'utf-8')) as Record<string, unknown>;
      expect(fr.translatedFrom).toBe(sourceHash(english));
      expect(i18n('content-stale').status).toBe(0);

      // English moves on: the French entry is stale
      const enFile = path.join(dir, 'features', 'split-expenses', 'en.yaml');
      fs.writeFileSync(enFile, dump({ ...english, h1: 'Split every expense' }));
      const after = i18n('content-stale');
      expect(after.status).toBe(1);
      expect(after.stdout).toMatch(/fr\tstale\tfeatures\/split-expenses/);
    });
  });

  it('backcheck writes a packet with the translation first and the English source last', () => {
    withTree((dir, i18n) => {
      const out = path.join(dir, 'packets');
      const run = i18n('backcheck', 'fr', 'features/split-expenses', '--out', out);
      expect(run.status, run.stderr).toBe(0);
      const packet = fs.readFileSync(path.join(out, 'fr-features-split-expenses.md'), 'utf-8');
      const at = (s: string) => packet.indexOf(s);
      expect(at('Partager les dépenses')).toBeGreaterThan(-1);
      expect(at('## BACK-TRANSLATION')).toBeGreaterThan(at('Partager les dépenses'));
      expect(at('## ENGLISH SOURCE')).toBeGreaterThan(at('## BACK-TRANSLATION'));
      expect(at('Split expenses')).toBeGreaterThan(at('## ENGLISH SOURCE'));
      expect(packet).toMatch(/balances\.fewer-payments/);
    });
  });

  it('backcheck --pass records checked with checker, date and source hash', () => {
    withTree((dir, i18n) => {
      const run = i18n('backcheck', 'fr', 'features/split-expenses', '--pass', '--checker', 'agent-9');
      expect(run.status, run.stderr).toBe(0);
      const fr = load(fs.readFileSync(path.join(dir, 'features', 'split-expenses', 'fr.yaml'), 'utf-8')) as Record<string, any>;
      expect(fr.review.status).toBe('checked');
      expect(fr.review.checker).toBe('agent-9');
      expect(fr.review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fr.translatedFrom).toBe(sourceHash(english));
      expect(featurePage.safeParse({ ...fr, review: { ...fr.review, date: String(fr.review.date) } }).success).toBe(true);
    });
  });

  it('content-audit finds missing entries unless english-first lists the page as pending', () => {
    withTree((dir, i18n) => {
      const pagesFile = path.join(dir, 'pages.ts');
      fs.writeFileSync(
        pagesFile,
        `export const pages = [{ id: 'feature/split-expenses', published: true, locales: ['fr', 'de'],
          content: { collection: 'featurePages', slug: 'split-expenses' } }];`
      );
      const pendingDir = path.join(dir, 'pending');
      fs.mkdirSync(pendingDir);
      fs.writeFileSync(path.join(pendingDir, 'keys.json'), '{"added":[],"removed":[]}');
      fs.writeFileSync(path.join(pendingDir, 'pages.json'), '{"added":[]}');
      const audit = (mode: string) =>
        spawnSync('node', [script, 'content-audit'], {
          encoding: 'utf-8',
          env: { ...process.env, I18N_CONTENT_DIR: dir, I18N_PAGES_FILE: pagesFile, I18N_PENDING_DIR: pendingDir, I18N_MODE: mode },
        });

      i18n('content-lock', 'fr', 'features/split-expenses');
      i18n('backcheck', 'fr', 'features/split-expenses', '--pass', '--checker', 'agent-9');

      // Strict, and english-first with the page not pending: German is missing
      for (const mode of ['strict', 'english-first']) {
        const run = audit(mode);
        expect(run.status, mode).toBe(1);
        expect(run.stdout, mode).toBe('de\tmissing\tfeatures/split-expenses\n');
      }
      // English-first with the page pending: a missing entry is allowed
      fs.writeFileSync(path.join(pendingDir, 'pages.json'), '{"added":["feature/split-expenses"]}');
      const pending = audit('english-first');
      expect(pending.status, pending.stdout).toBe(0);
      // Strict mode ignores the manifest
      expect(audit('strict').status).toBe(1);
    });
  });

  it('backcheck --pass refuses without a checker id', () => {
    withTree((_dir, i18n) => {
      expect(i18n('backcheck', 'fr', 'features/split-expenses', '--pass').status).toBe(1);
    });
  });
});
