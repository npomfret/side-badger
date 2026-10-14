import { describe, expect, it } from 'vitest';
import { checkH1 } from './rules/r04-h1';
import { dist } from './lib/site';
import { mentions, one } from './lib/fixtures';

describe('rule 4: exactly one visible, non-empty h1', () => {
  it('dist: every page', () => {
    expect(checkH1(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a page with one h1', () => {
      expect(checkH1(one('good/home.html'))).toEqual([]);
    });

    it.each([
      ['r04/no-h1.html', 'found 0'],
      ['r04/two-h1.html', 'found 2'],
      ['r04/empty-h1.html', 'h1 is empty'],
      ['r04/sr-only-h1.html', 'inside .sr-only'],
      ['r04/sr-only-parent-h1.html', 'inside .sr-only'],
    ])('fails %s', (name, message) => {
      expect(mentions(checkH1(one(name)), message)).toBe(true);
    });
  });
});
