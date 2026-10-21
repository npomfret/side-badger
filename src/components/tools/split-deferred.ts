/**
 * What the split-bill calculator's page script fetches after the page (restructure D36: at most
 * 10 KB of script at load): the engine, the share link's codec, the "Copy link" flow and money
 * formatting. `split-calculator.ts` imports this module on the visitor's first touch of the form,
 * or straight away when the page opens from a share link. A fresh form needs none of it: it waits
 * for an amount before it shows anything.
 *
 * The codec comes with the engine rather than on its own, so "Copy link" can usually write to the
 * clipboard within the click itself, which some browsers require.
 */
export { MAX_EXPENSE_AMOUNT } from '../../lib/minor-units';
export { moneyFormatter } from '../content/money';
export { copyShareLink } from './share-link';
export { calculate } from './split-engine';
export { encodeState, stateFromHash } from './split-fragment';
