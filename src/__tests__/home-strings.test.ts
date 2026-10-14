import { describe, expect, it } from 'vitest';
import en from '@/i18n/en';
import { EXPENSES, MEMBERS, deriveGreedyPayments, deriveIous, derivePairwiseDebts } from '@/components/home/data/example-group';

/**
 * The tangle scene's counts are fixed text in the English strings ("Here are 19", "Ten are left",
 * "3, not 10"). This ties each to the example group's derivations, so editing the group without
 * the strings (or the reverse) fails here.
 */
const strings = en as Record<string, string>;

const ious = deriveIous();
const debts = derivePairwiseDebts(ious);
const payments = deriveGreedyPayments();

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => WORDS[n]!;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

describe('home tangle strings match the example group', () => {
    it('counts the IOUs, debts and payments the strings quote', () => {
        expect(ious).toHaveLength(19);
        expect(debts).toHaveLength(10);
        expect(payments).toHaveLength(3);
    });

    it('home.tangle.stepIous quotes the IOU count', () => {
        expect(strings['home.tangle.stepIous']).toContain(`Here are ${ious.length}`);
    });

    it('home.tangle.stepPairs quotes the debt count in words', () => {
        expect(strings['home.tangle.stepPairs']).toContain(`${cap(word(debts.length))} are left`);
    });

    it('home.tangle.showAll and the figure label quote the debt count', () => {
        expect(strings['home.tangle.showAll']).toBe(`Show all ${debts.length} debts`);
        expect(strings['home.tangle.figureLabel']).toContain(`${word(debts.length)} debts`);
        expect(strings['home.tangle.figureLabel']).toContain(`${word(MEMBERS.length)} friends`);
        expect(strings['home.tangle.figureLabel']).toContain(`${word(payments.length)} payments`);
    });

    it('home.tangle.stamp and the before/after titles quote debts and payments', () => {
        expect(strings['home.tangle.stamp']).toBe(`${payments.length}, not ${debts.length}`);
        expect(strings['home.tangle.beforeTitle']).toBe(`Before: ${word(debts.length)} debts`);
        expect(strings['home.tangle.afterTitle']).toBe(`After: ${word(payments.length)} payments`);
        expect(strings['home.tangle.stepPayments']).toBe(`${cap(word(payments.length))} payments settle the lot.`);
    });

    it('home.tangle.body quotes the friends, expenses, debts and payments', () => {
        const body = strings['home.tangle.body']!;
        expect(body).toContain(`${cap(word(MEMBERS.length))} friends and ${word(EXPENSES.length)} expenses`);
        expect(body).toContain(`${word(debts.length)} debts`);
        expect(body).toContain(`${word(payments.length)} payments`);
    });

    it('home.group.memberCount quotes the member count', () => {
        expect(strings['home.group.memberCount']).toBe(`${MEMBERS.length} members`);
    });
});
