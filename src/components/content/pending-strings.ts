/** Pure data, so tests can import it without the i18n index. See ui-strings.ts. */
/** English text for the keys P24 needs and `en.ts` does not have yet. */
export const PENDING_STRINGS = {
  'example.expenses': 'Expenses',
  'example.balances': 'Net balances',
  'example.balanceHint': 'A plus sign means the person is owed money. A minus sign means they owe money.',
  'example.pairwise': 'Paying each person back directly',
  'example.separate': 'Each currency kept separate',
  'example.converted': 'Converted to {currency}',
  'example.illustrativeRate': 'Illustrative rate: {from} = {to}',
} as const;

export type PendingStringKey = keyof typeof PENDING_STRINGS;
