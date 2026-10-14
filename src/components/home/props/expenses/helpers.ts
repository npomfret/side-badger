/**
 * Shared bits for the expenses and currencies scenes: translated names, split labels, the
 * receipt's sample date. Amounts always come from `data/example-group.ts`.
 */
import { t, type Locale, type TranslationKey } from '@/i18n';
import { EXPENSES, MEMBERS, type Expense, type MemberId, type SplitKind } from '../../data/example-group';
import { intlCodeFor } from '../../format';

export const SPLIT_KEYS: Record<SplitKind, TranslationKey> = {
  equal: 'home.expenses.splitEqual',
  exact: 'home.expenses.splitExact',
  percent: 'home.expenses.splitPercent',
};

export function expenseById(id: number): Expense {
  const found = EXPENSES.find((e) => e.id === id);
  if (!found) throw new Error(`example-group has no expense ${id}`);
  return found;
}

export function expenseTitle(expense: Expense, locale: Locale): string {
  return t(expense.titleKey as TranslationKey, locale);
}

export function memberName(id: MemberId, locale: Locale): string {
  const member = MEMBERS.find((m) => m.id === id);
  if (!member) throw new Error(`unknown member ${id}`);
  return t(member.nameKey, locale);
}

export function memberColor(id: MemberId): string {
  return MEMBERS.find((m) => m.id === id)?.color.light ?? '#1f2937';
}

/**
 * The date on the sample receipt: an illustrative day inside the story, formatted for the locale.
 * It is not in the example group's data, which carries no dates.
 */
export function receiptDate(locale: Locale): string {
  return new Intl.DateTimeFormat(intlCodeFor(locale), { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 3, 12))
  );
}
