/**
 * Use cases (restructure D16, site plan D9), transcribed from the site plan's page briefs.
 * `features` is each brief's "Claims" list; `scenarios` are the situations its outline and worked
 * example cover. Dropped: clubs, teams and work; school trips; families with children (site plan D9).
 */
import type { UseCaseRecord } from './types';

export const useCases: readonly UseCaseRecord[] = [
  {
    id: 'group-trips',
    audiences: ['group-trips'],
    features: [
      'expense-splitting',
      'balances',
      'settlements',
      'multi-currency',
      'currency-conversion',
      'receipt-scanning',
      'lists',
      'polls',
      'permissions',
    ],
    scenarios: [
      'Friends planning or on a trip, voting on the villa and listing the shared kit to buy',
      'Paying in local currency while away, then settling once at home',
      'Not everyone did everything, so some expenses are split between some people',
      'Stag and hen weekends: a managed group, approval for joiners, exact amounts for the guest of honour',
      'Four friends in Lisbon, with pounds and euros, kept separate or auto-converted to pounds',
    ],
  },
  {
    id: 'housemates',
    audiences: ['housemates'],
    features: [
      'groups',
      'invites',
      'permissions',
      'expense-splitting',
      'expense-questions',
      'balances',
      'settlements',
      'lists',
      'live-updates',
    ],
    scenarios: [
      'Setting up the house as an open or managed group',
      'Rent split by room size and bills split equally, copied each month',
      'The shared shop: a shopping list and the groceries',
      'Working out who owes whom this month',
      'A housemate moving out: they settle first, then the group is locked or closed',
      'Four housemates, one month: rent, energy, internet and groceries',
    ],
  },
  {
    id: 'events-and-celebrations',
    audiences: ['events'],
    features: ['invites', 'permissions', 'expense-splitting', 'balances', 'settlements', 'comments', 'polls'],
    scenarios: [
      'Deciding the venue or the gift with a poll',
      'People chipping in different amounts, by exact amounts, or only the people involved',
      'Keeping receipts and comments together',
      'Organiser controls: a managed group, approval, locking afterwards',
      'A group gift bought for £150, split by exact amounts between six people',
    ],
  },
  {
    // Release 2 page (`/use-cases/couples/`); the record exists because features reference it.
    id: 'couples',
    audiences: ['couples'],
    features: ['expense-splitting', 'balances', 'settlements', 'privacy-posture'],
    scenarios: [
      'Splitting costs 50/50, by income, or bill by bill',
      'The monthly round-up between two people',
      'Rent split 60/40 and groceries split equally, netted to one payment',
    ],
  },
];
