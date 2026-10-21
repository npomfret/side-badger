/**
 * The page-art gate (release 2, R7): `src/data/page-art.ts` against the registry, the English
 * entries and `en.ts`. The words of the art come from the page's worked example and from keys, so
 * a stale index or key must fail here, not at build time in some other locale.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import en from '@/i18n/en';
import { artFor, pageArt, type ArtItem, type ArtLayout, type ArtText } from '@/data/page-art';
import { computeExample, type ExampleData } from '@/lib/settle';
import { allPages, getPage, type PageDef } from '@/site/pages';

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const DIRS: Record<NonNullable<PageDef['content']>['collection'], string> = {
  featurePages: 'features',
  useCasePages: 'use-cases',
  sitePages: 'pages',
};
const englishKeys = new Set(Object.keys(en));
/** `PREVIEW_SLUG` of page-content.ts, which imports `astro:content` and so cannot load under Vitest */
const PREVIEW_SLUG = '__preview__';

/** The English worked example of a page, or undefined when its entry has none. */
function englishExample(page: PageDef): ExampleData | undefined {
  if (!page.content) return undefined;
  const { collection, slug } = page.content;
  // The preview entries are fixtures: how it works' has a file of its own
  const file = slug === PREVIEW_SLUG && page.type === 'how-it-works' ? 'how-it-works' : 'en';
  const entry = load(fs.readFileSync(path.join(CONTENT_DIR, DIRS[collection], slug, `${file}.yaml`), 'utf-8')) as {
    example?: ExampleData & { heading?: string };
  };
  if (!entry.example) return undefined;
  const { heading: _heading, ...data } = entry.example;
  return data;
}

/** Every text an item says, with where in the item it is. */
function textsOf(item: ArtItem): ArtText[] {
  switch (item.prop) {
    case 'receipt':
      return [item.title, ...(item.total ? [item.total.label, ...(item.total.amount ? [item.total.amount] : [])] : [])];
    case 'sticky':
    case 'stamp':
    case 'bubble':
      return [item.text];
    case 'polaroid':
      return item.tag ? [item.tag] : [];
    case 'ledger':
    case 'avatar':
      return [];
  }
}

/** The example people an item draws, by index */
function peopleOf(item: ArtItem): number[] {
  return item.prop === 'polaroid' || item.prop === 'avatar' ? [item.person] : [];
}

const SHAPES: Record<ArtLayout, { min: number; max: number; kinds?: readonly ArtItem['prop'][] }> = {
  cluster: { min: 2, max: 3 },
  stack: { min: 2, max: 4 },
  row: { min: 2, max: 4 },
  chat: { min: 4, max: 4, kinds: ['avatar', 'bubble', 'bubble', 'avatar'] },
  flank: { min: 2, max: 2 },
};

const entries = Object.entries(pageArt);

describe('page art', () => {
  it('has art for every page the release gives it to', () => {
    const real = [
      'how-it-works',
      'features',
      'feature/split-expenses',
      'feature/settle-up',
      'feature/multiple-currencies',
      'use-cases',
      'use-case/group-trips',
      'use-case/housemates',
      'use-case/events-and-celebrations',
      'pricing',
    ];
    for (const id of real) expect(artFor(id), `art for ${id}`).toBeDefined();
  });

  for (const [pageId, art] of entries) {
    describe(pageId, () => {
      const page = getPage(pageId);

      it('is a registered page, with a layout it fits', () => {
        expect(page, `"${pageId}" in the page registry (or the preview pages)`).toBeDefined();
        const shape = SHAPES[art.layout];
        expect(shape, `layout "${art.layout}"`).toBeDefined();
        expect(art.items.length).toBeGreaterThanOrEqual(Math.max(2, shape.min));
        expect(art.items.length).toBeLessThanOrEqual(Math.min(4, shape.max));
        if (shape.kinds) expect(art.items.map(item => item.prop)).toEqual(shape.kinds);
      });

      it('names only keys that exist, and example references its entry can resolve', () => {
        const example = page ? englishExample(page) : undefined;
        const result = example ? computeExample(example) : undefined;
        const has = (list: readonly unknown[] | undefined, n: number) => list !== undefined && n >= 0 && n < list.length;

        const check = (text: ArtText) => {
          if ('key' in text) {
            expect(englishKeys.has(text.key), `key ${text.key} is in en.ts`).toBe(true);
          } else if ('home' in text) {
            expect(text.home, 'a homepage expense id').toBeGreaterThan(0);
          } else {
            expect(example, `${JSON.stringify(text)} needs a worked example`).toBeDefined();
            if ('person' in text) expect(has(example?.people, text.person), `person ${text.person}`).toBe(true);
            if ('payer' in text) expect(has(example?.expenses, text.payer), `expense ${text.payer}`).toBe(true);
            if ('expense' in text) expect(has(example?.expenses, text.expense), `expense ${text.expense}`).toBe(true);
            if ('amount' in text) expect(has(example?.expenses, text.amount), `expense ${text.amount}`).toBe(true);
            if ('paid' in text) expect(has(example?.expenses, text.paid), `expense ${text.paid}`).toBe(true);
            if ('payment' in text) expect(has(result?.transfers, text.payment), `payment ${text.payment}`).toBe(true);
            if ('converted' in text) {
              const expense = example?.expenses[text.converted];
              expect(expense, `expense ${text.converted}`).toBeDefined();
              expect(expense?.currency, `expense ${text.converted} is in another currency`).toBeDefined();
              expect(expense?.currency).not.toBe(example?.currency);
            }
          }
        };

        for (const item of art.items) {
          textsOf(item).forEach(check);
          for (const person of peopleOf(item)) {
            expect(example, 'a polaroid or avatar needs a worked example').toBeDefined();
            expect(has(example?.people, person), `person ${person}`).toBe(true);
          }
          if (item.prop === 'ledger') {
            expect(example, 'a ledger card needs a worked example').toBeDefined();
            if ('expense' in item) expect(has(example?.expenses, item.expense), `expense ${item.expense}`).toBe(true);
            else expect(has(result?.transfers, item.payment), `payment ${item.payment}`).toBe(true);
          }
        }
      });
    });
  }

  describe('the art keys', () => {
    const used = new Set(
      entries.flatMap(([, art]) => art.items.flatMap(textsOf)).flatMap(text => ('key' in text ? [text.key] : []))
    );
    const artKeys = Object.keys(en).filter(key => key.startsWith('art.'));

    it('are all used by some page', () => {
      expect(artKeys.filter(key => !used.has(key as never))).toEqual([]);
    });

    it('say at most six words, and name the page they are for', () => {
      const registryIds = new Set(allPages().map(page => page.id));
      for (const key of artKeys) {
        const words = (en as Record<string, string>)[key]!.trim().split(/\s+/);
        expect(words.length, `${key}: "${(en as Record<string, string>)[key]}"`).toBeLessThanOrEqual(6);
        // art.<page>.<slot>: the page segment is the camel-cased last part of a registry id
        const page = key.split('.')[1]!;
        const camel = (id: string) => id.split('/').at(-1)!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
        expect([...registryIds].some(id => camel(id) === page), `${key} names a page`).toBe(true);
      }
    });
  });
});
