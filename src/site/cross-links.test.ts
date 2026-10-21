import { describe, expect, it } from 'vitest';
import { crossLinkedIds } from './cross-links';
import { getPage } from './pages';

describe('crossLinkedIds', () => {
  it('maps feature ids to their home pages, in both directions', () => {
    // `balances` is homed on feature/settle-up, `expense-splitting` on feature/split-expenses
    const housemates = crossLinkedIds(getPage('use-case/housemates')!);
    expect(housemates).toContain('feature/settle-up');
    expect(housemates).toContain('feature/split-expenses');
    expect(housemates).not.toContain('feature/balances');
    expect(crossLinkedIds(getPage('feature/settle-up')!)).toContain('use-case/housemates');
  });

  it('never lists the page itself', () => {
    for (const id of ['feature/settle-up', 'use-case/housemates']) {
      expect(crossLinkedIds(getPage(id)!)).not.toContain(id);
    }
  });

  it("lists a guide's product pages, and each product page lists the guide back", () => {
    const guide = getPage('guide/preview')!;
    const product = [...(guide.related ?? [])];
    expect(product.length).toBeGreaterThanOrEqual(2);
    expect(crossLinkedIds(guide)).toEqual(expect.arrayContaining(product));
    for (const id of product) expect(crossLinkedIds(getPage(id)!), id).toContain('guide/preview');
  });

  it('lists the guides filed under the guides hub, and no other hub does', () => {
    expect(crossLinkedIds(getPage('guides')!)).toContain('guide/preview');
    expect(crossLinkedIds(getPage('features')!)).not.toContain('guide/preview');
    expect(crossLinkedIds(getPage('use-cases')!)).not.toContain('guide/preview');
  });

  it('leaves a product page that no guide names without guide links', () => {
    const ids = crossLinkedIds(getPage('feature/receipt-scanning')!);
    expect(ids.filter(id => getPage(id)?.type === 'article')).toEqual([]);
  });
});
