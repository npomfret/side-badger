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
});
