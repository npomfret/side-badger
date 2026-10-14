import { describe, expect, it } from 'vitest';
import {
    EXAMPLE_RATES,
    EXPENSES,
    MEMBERS,
    deriveBalances,
    deriveGreedyPayments,
    deriveIous,
    derivePairwiseDebts,
    type MemberId,
} from '@/components/home/data/example-group';

const ids = MEMBERS.map((m) => m.id);

describe('home example group', () => {
    it('has the five members clockwise from the top, with name keys and colours', () => {
        expect(ids).toEqual(['ava', 'ben', 'dev', 'mei', 'sam']);
        for (const m of MEMBERS) {
            expect(m.nameKey).toBe(`home.cast.${m.id}`);
            expect(m.color.light).toMatch(/^#[0-9a-f]{6}$/);
            expect(m.color.dark).toMatch(/^#[0-9a-f]{6}$/);
        }
        expect(EXAMPLE_RATES).toEqual({ JPY: 160, USD: 1.1 });
    });

    it('is consistent: shares sum to the EUR amount, which matches the example rates', () => {
        for (const e of EXPENSES) {
            const sum = Object.values(e.split.shares).reduce((a, b) => a + b, 0);
            expect(sum, `expense ${e.id}`).toBe(e.eurCents);
            const rate = e.original.currency === 'EUR' ? 1 : EXAMPLE_RATES[e.original.currency];
            const minorPerUnit = e.original.currency === 'JPY' ? 1 : 100;
            expect(Math.round((e.original.minor / minorPerUnit / rate) * 100), `expense ${e.id}`).toBe(e.eurCents);
        }
        expect(EXPENSES.reduce((a, e) => a + e.eurCents, 0)).toBe(137000);
    });

    it('derives exactly 19 IOUs', () => {
        const ious = deriveIous();
        expect(ious).toHaveLength(19);
        expect(EXPENSES.map((e) => ious.filter((i) => i.expenseId === e.id).length)).toEqual([4, 4, 4, 4, 3]);
    });

    it('derives exactly 10 pairwise debts with the expected amounts', () => {
        const debts = derivePairwiseDebts();
        expect(debts).toHaveLength(10);
        expect(debts.map((d) => `${d.from}>${d.to}:${d.cents}`).sort()).toEqual(
            [
                'ben>ava:4000',
                'dev>ava:8400',
                'dev>ben:4400',
                'mei>ava:9600',
                'mei>ben:5600',
                'mei>dev:200',
                'sam>ava:8000',
                'sam>ben:4000',
                'sam>dev:2600',
                'sam>mei:1400',
            ].sort(),
        );
        expect(debts.reduce((a, d) => a + d.cents, 0)).toBe(48200);
    });

    it('derives balances that sum to zero', () => {
        const b = deriveBalances();
        expect(b).toEqual({ ava: 30000, ben: 10000, dev: -10000, mei: -14000, sam: -16000 });
        expect(Object.values(b).reduce((a, c) => a + c, 0)).toBe(0);
    });

    it('derives the three greedy payments', () => {
        expect(deriveGreedyPayments()).toEqual([
            { from: 'sam', to: 'ava', cents: 16000 },
            { from: 'mei', to: 'ava', cents: 14000 },
            { from: 'dev', to: 'ben', cents: 10000 },
        ]);
    });

    it('cannot be settled with two or fewer payments (brute force)', () => {
        const b = deriveBalances();
        const edges: [MemberId, MemberId][] = [];
        for (const f of ids) for (const t of ids) if (f !== t) edges.push([f, t]);
        const max = Math.max(...Object.values(b));
        const isZero = (r: Record<MemberId, number>) => ids.every((i) => r[i] === 0);
        // A payment of `a` from f to t moves f's balance up and t's down.
        const apply = (r: Record<MemberId, number>, [f, t]: [MemberId, MemberId], a: number) => ({
            ...r,
            [f]: r[f] + a,
            [t]: r[t] - a,
        });

        // Zero payments.
        expect(isZero(b)).toBe(false);
        let settled = false;
        for (const e1 of edges) {
            for (let a1 = 1; a1 <= max; a1++) {
                const r1 = apply(b, e1, a1);
                if (isZero(r1)) settled = true; // one payment
                for (const e2 of edges) {
                    if (e2[0] === e1[0] && e2[1] === e1[1]) continue;
                    // The second amount is forced: it must clear e2's debtor.
                    const a2 = -r1[e2[0]];
                    if (a2 > 0 && isZero(apply(r1, e2, a2))) settled = true; // two payments
                }
            }
        }
        expect(settled).toBe(false);
    });
});
