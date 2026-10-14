/**
 * The "Japan trip" example group behind the homepage tangle scene.
 *
 * All money is in whole cents of the group currency (EUR) unless a field says
 * otherwise. Names are display keys (`home.cast.*`); the stable `id` is what
 * the rest of the data refers to. Debts, balances and payments are derived by
 * the pure functions below, never typed in.
 */

export type MemberId = 'ava' | 'ben' | 'dev' | 'mei' | 'sam';

export interface Member {
    id: MemberId;
    /** Translation key for the display name. */
    nameKey: `home.cast.${MemberId}`;
    /** Avatar colours from the app's palette (packages/shared/src/user-colors.ts). */
    color: { name: string; light: string; dark: string };
}

/** Clockwise pentagon order from the top. */
export const MEMBERS: readonly Member[] = [
    { id: 'ava', nameKey: 'home.cast.ava', color: { name: 'Ocean Blue', light: '#1f5582', dark: '#4a9eff' } },
    { id: 'ben', nameKey: 'home.cast.ben', color: { name: 'Tangerine', light: '#c2410c', dark: '#fb923c' } },
    { id: 'dev', nameKey: 'home.cast.dev', color: { name: 'Teal', light: '#0f766e', dark: '#2dd4bf' } },
    { id: 'mei', nameKey: 'home.cast.mei', color: { name: 'Royal Purple', light: '#59359a', dark: '#a855f7' } },
    { id: 'sam', nameKey: 'home.cast.sam', color: { name: 'Amber Yellow', light: '#b45309', dark: '#fbbf24' } },
];

export const GROUP = {
    nameKey: 'home.group.name',
    currency: 'EUR',
} as const;

export type CurrencyCode = 'EUR' | 'JPY' | 'USD';

/** Fixed example rates, labelled as examples on the page. Units of currency per 1 EUR. */
export const EXAMPLE_RATES = { JPY: 160, USD: 1.1 } as const;

export type SplitKind = 'equal' | 'exact' | 'percent';

export interface Expense {
    id: number;
    titleKey: string;
    noteKey?: string;
    paidBy: MemberId;
    /** Amount in the currency it was paid in, in that currency's minor units (JPY has none). */
    original: { currency: CurrencyCode; minor: number };
    /** The amount in EUR cents. */
    eurCents: number;
    split: {
        kind: SplitKind;
        /** Each participant's share in EUR cents. Members absent here are not included. */
        shares: Partial<Record<MemberId, number>>;
        /** For percent splits only: whole percentages per participant. */
        percents?: Partial<Record<MemberId, number>>;
    };
}

export const EXPENSES: readonly Expense[] = [
    {
        id: 1,
        titleKey: 'home.expenses.itemApartment',
        paidBy: 'ava',
        original: { currency: 'JPY', minor: 96000 },
        eurCents: 60000,
        split: { kind: 'equal', shares: { ava: 12000, ben: 12000, dev: 12000, mei: 12000, sam: 12000 } },
    },
    {
        id: 2,
        titleKey: 'home.expenses.itemRail',
        paidBy: 'ben',
        original: { currency: 'EUR', minor: 40000 },
        eurCents: 40000,
        split: { kind: 'equal', shares: { ava: 8000, ben: 8000, dev: 8000, mei: 8000, sam: 8000 } },
    },
    {
        id: 3,
        titleKey: 'home.expenses.itemTransfer',
        paidBy: 'mei',
        original: { currency: 'USD', minor: 13200 },
        eurCents: 12000,
        split: { kind: 'equal', shares: { ava: 2400, ben: 2400, dev: 2400, mei: 2400, sam: 2400 } },
    },
    {
        id: 4,
        titleKey: 'home.expenses.itemDinner',
        noteKey: 'home.expenses.dinnerNote',
        paidBy: 'dev',
        original: { currency: 'JPY', minor: 24000 },
        eurCents: 15000,
        split: { kind: 'exact', shares: { ava: 3600, ben: 3600, dev: 2600, mei: 2600, sam: 2600 } },
    },
    {
        id: 5,
        titleKey: 'home.expenses.itemKaraoke',
        noteKey: 'home.expenses.karaokeNote',
        paidBy: 'sam',
        original: { currency: 'JPY', minor: 16000 },
        eurCents: 10000,
        split: {
            kind: 'percent',
            shares: { ava: 4000, ben: 4000, mei: 1000, sam: 1000 },
            percents: { ava: 40, ben: 40, mei: 10, sam: 10 },
        },
    },
];

/** One participant owes one payer their share of one expense. */
export interface Iou {
    expenseId: number;
    from: MemberId;
    to: MemberId;
    cents: number;
}

/** A net amount `from` owes `to`, or a suggested payment. */
export interface Transfer {
    from: MemberId;
    to: MemberId;
    cents: number;
}

const ORDER: readonly MemberId[] = MEMBERS.map((m) => m.id);

/** Stage 1: every non-payer participant owes the payer their share, per expense. */
export function deriveIous(expenses: readonly Expense[] = EXPENSES): Iou[] {
    const ious: Iou[] = [];
    for (const expense of expenses) {
        for (const id of ORDER) {
            const share = expense.split.shares[id];
            if (share === undefined || share === 0 || id === expense.paidBy) continue;
            ious.push({ expenseId: expense.id, from: id, to: expense.paidBy, cents: share });
        }
    }
    return ious;
}

/**
 * Stage 2: opposite debts between the same pair cancel, leaving one debt per
 * pair. Ordered by creditor, then debtor, in member order.
 */
export function derivePairwiseDebts(ious: readonly Iou[] = deriveIous()): Transfer[] {
    const owed = new Map<string, number>();
    const key = (a: MemberId, b: MemberId) => `${a}>${b}`;
    for (const iou of ious) {
        owed.set(key(iou.from, iou.to), (owed.get(key(iou.from, iou.to)) ?? 0) + iou.cents);
    }
    const debts: Transfer[] = [];
    for (let i = 0; i < ORDER.length; i++) {
        for (let j = i + 1; j < ORDER.length; j++) {
            const a = ORDER[i];
            const b = ORDER[j];
            const aOwesB = owed.get(key(a, b)) ?? 0;
            const bOwesA = owed.get(key(b, a)) ?? 0;
            if (aOwesB > bOwesA) debts.push({ from: a, to: b, cents: aOwesB - bOwesA });
            else if (bOwesA > aOwesB) debts.push({ from: b, to: a, cents: bOwesA - aOwesB });
        }
    }
    return debts.sort((x, y) => ORDER.indexOf(x.to) - ORDER.indexOf(y.to) || ORDER.indexOf(x.from) - ORDER.indexOf(y.from));
}

/** Stage 3: net balance per member. Positive means owed money. Sums to zero. */
export function deriveBalances(debts: readonly Transfer[] = derivePairwiseDebts()): Record<MemberId, number> {
    const balances: Record<MemberId, number> = { ava: 0, ben: 0, dev: 0, mei: 0, sam: 0 };
    for (const debt of debts) {
        balances[debt.from] -= debt.cents;
        balances[debt.to] += debt.cents;
    }
    return balances;
}

/**
 * Stage 4: greedy settlement, ported from the app's `simplifyDebts`
 * (server/src/utils/debtSimplifier.ts, `createOptimalTransactions`).
 * Creditors and debtors are each sorted by size, largest first (stable, so
 * ties keep member order). The largest debtor pays the largest creditor the
 * smaller of the two amounts; each side that reaches zero advances.
 */
export function deriveGreedyPayments(balances: Record<MemberId, number> = deriveBalances()): Transfer[] {
    const creditors: { id: MemberId; cents: number }[] = [];
    const debtors: { id: MemberId; cents: number }[] = [];
    for (const id of ORDER) {
        const cents = balances[id];
        if (cents > 0) creditors.push({ id, cents });
        else if (cents < 0) debtors.push({ id, cents: -cents });
    }
    creditors.sort((a, b) => b.cents - a.cents);
    debtors.sort((a, b) => b.cents - a.cents);

    const payments: Transfer[] = [];
    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const cents = Math.min(creditor.cents, debtor.cents);
        if (cents !== 0) payments.push({ from: debtor.id, to: creditor.id, cents });
        creditor.cents -= cents;
        debtor.cents -= cents;
        if (creditor.cents === 0) ci++;
        if (debtor.cents === 0) di++;
    }
    return payments;
}
