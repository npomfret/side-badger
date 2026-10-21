/**
 * The comparison page's rules (site plan D16): the schema's checks on a dated, sourced table, and the
 * date the page shows. The English entry on disk is the base each fault is made from.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import { formatAsOf } from '@/components/content/as-of';
import { comparePage } from '@/content/schemas';

type Entry = Record<string, any>;

const english = () =>
  load(fs.readFileSync(path.join(__dirname, '..', 'content', 'compare', 'splitwise', 'en.yaml'), 'utf-8')) as Entry;

/** The English entry with `change` applied to a fresh copy */
function changed(change: (entry: Entry) => void): Entry {
  const entry = structuredClone(english());
  change(entry);
  return entry;
}

const problems = (entry: Entry): string[] => {
  const result = comparePage.safeParse(entry);
  return result.success ? [] : result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
};

describe('the Splitwise comparison entry', () => {
  it('is a valid comparison page', () => {
    expect(problems(english())).toEqual([]);
  });

  it('is dated, and every Splitwise source is an https page on a Splitwise domain', () => {
    const entry = english();
    expect(String(entry.asOf instanceof Date ? entry.asOf.toISOString().slice(0, 10) : entry.asOf)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const source of entry.sources as { url: string }[]) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(new URL(source.url).hostname).toMatch(/(^|\.)splitwise\.com$/);
    }
  });
});

describe('comparison page rules (fixtures)', () => {
  it.each<[string, (entry: Entry) => void, RegExp]>([
    ['a row that cites an unknown source', e => (e.table.rows[0].source = 'nope'), /row cites the unknown source "nope"/],
    ['a source that no row cites', e => e.sources.push({ id: 'extra', label: 'Extra', url: 'https://example.com/' }), /source "extra" is cited by no row/],
    ['a duplicate source id', e => e.sources.push({ ...e.sources[0] }), /duplicate source id "home"/],
    ['an "as of" note with no date', e => (e.asOfNote = 'Read last week.'), /exactly one \{date\}/],
    ['an "as of" note with two dates', e => (e.asOfNote = '{date} and {date}'), /exactly one \{date\}/],
    ['no "as of" day', e => delete e.asOf, /asOf/],
    ['a table placed after more sections than there are', e => (e.tableAfter = e.sections.length + 1), /tableAfter cannot exceed/],
    ['a source that is not https', e => (e.sources[0].url = 'http://www.splitwise.com/'), /https/],
    ['a table with only two rows', e => (e.table.rows = e.table.rows.slice(0, 2)), /table\.rows/],
    ['an app link in a cell', e => (e.table.rows[0].sideBadger = 'Go to [the app](https://app.sidebadger.me/).'), /only \[text\]\(page:<pageId>\)/],
  ])('rejects %s', (_name, change, message) => {
    expect(problems(changed(change)).join('\n')).toMatch(message);
  });
});

describe('the "as of" date', () => {
  it('is a calendar day: no time zone moves it', () => {
    expect(formatAsOf('2026-10-21', 'en', 'en-US')).toBe('21 October 2026');
    expect(formatAsOf('2026-01-01', 'en', 'en-US')).toBe('1 January 2026');
  });

  it('follows the locale outside English', () => {
    expect(formatAsOf('2026-10-21', 'de', 'de-DE')).toBe('21. Oktober 2026');
    expect(formatAsOf('2026-10-21', 'ja', 'ja-JP')).toBe('2026年10月21日');
  });
});
