import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { pseudoizeContent } from '../../src/components/content/pseudo-content';
import { moneyFormatter } from '../../src/components/content/money';
import type { WorkedExampleData } from '../../src/content/schemas';
import { computeExample, type Ledger } from '../../src/lib/settle';
import type { PseudoLocale } from '../../src/i18n/pseudo';
import { text, type ShellLocale, type StringKey } from './strings';

/** The four layouts, each shown by one preview page (src/site/preview-pages.ts). */
export type LayoutKind = 'feature' | 'use-case' | 'hub' | 'how-it-works';

export const LAYOUT_ROUTES: Record<LayoutKind, string> = {
  feature: 'features/preview',
  'use-case': 'use-cases/preview',
  hub: 'preview/hub',
  'how-it-works': 'preview/how-it-works',
};

const FIXTURE_FILES: Record<LayoutKind, string> = {
  feature: 'src/content/features/__preview__/en.yaml',
  'use-case': 'src/content/use-cases/__preview__/en.yaml',
  hub: 'src/content/pages/__preview__/en.yaml',
  'how-it-works': 'src/content/pages/__preview__/how-it-works.yaml',
};

export interface Section {
  heading: string;
  body?: string;
  items?: string[];
}

/** The fixture entry as the page shows it in a locale (pseudo-locales are pseudoized English). */
export interface Fixture {
  meta: { title: string; description: string };
  h1: string;
  lead: string;
  cta: { heading: string; body: string; button: string };
  problem?: { heading: string };
  workflow?: { heading: string; steps: { title: string }[] };
  options?: { heading: string; items: unknown[] };
  limits?: { heading: string; items: string[] };
  useCasesHeading?: string;
  scenario?: { heading: string };
  featuresHeading?: string;
  cardsHeading?: string;
  steps?: { title: string }[];
  requirements?: { heading: string };
  example?: WorkedExampleData;
  sections?: Section[];
  exampleAfter?: number;
  faq?: { heading: string; items: { q: string; a: string }[] };
}

export function fixtureFor(kind: LayoutKind, locale: ShellLocale): Fixture {
  const raw = load(fs.readFileSync(path.join(process.cwd(), FIXTURE_FILES[kind]), 'utf-8')) as Fixture;
  return locale === 'en' ? raw : pseudoizeContent(raw, locale as PseudoLocale);
}

/** A UI string in a locale with its `{placeholders}` filled. */
export function uiText(locale: ShellLocale, key: StringKey, params: Record<string, string> = {}): string {
  return text(locale, key).replace(/\{(\w+)\}/g, (_m, name: string) => params[name]);
}

export const INTL: Record<ShellLocale, string> = {
  en: 'en-US',
  'xx-long': 'en-US',
  'xx-ar': 'ar-EG',
  'xx-ja': 'ja-JP',
  'xx-hi': 'hi-IN',
};

/** The example's results as the page words them: net balances and payment lines per ledger. */
export function exampleLines(example: WorkedExampleData, locale: ShellLocale) {
  const { heading: _heading, ...data } = example;
  const result = computeExample(data);
  const money = moneyFormatter(INTL[locale]);
  const names = Object.fromEntries(example.people.map(p => [p.id, p.name]));
  const line = (from: string, to: string, minor: number, currency: string) =>
    uiText(locale, 'example.transfer', { from: names[from], to: names[to], amount: money.minor(minor, currency) });
  const ledger = (l: Ledger) => ({
    currency: l.currency,
    balances: Object.values(l.balances).map(minor => money.minor(minor, l.currency, { signed: true })),
    transfers: l.transfers.map(t => line(t.from, t.to, t.minor, l.currency)),
    pairwise: l.pairwise.map(t => line(t.from, t.to, t.minor, l.currency)),
  });
  return { main: ledger(result), separate: result.separate.map(ledger) };
}
