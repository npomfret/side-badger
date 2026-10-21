/**
 * Page art (release 2, R7): the small paper-prop compositions in the hero of a content page,
 * keyed by registry page id. Each is a layout (its geometry, `PageArt.astro`) and two to four
 * props from the homepage kit. This file holds ids, indexes and translation keys only; the words
 * are resolved per locale at build time, and may come only from:
 *
 * - the page's worked example (`person`, `payer`, `expense`, `amount`, `converted`, `paid` and
 *   `payment`, all by index, so a locale's names and amounts follow its own example and always
 *   agree with it);
 * - the homepage's example group (`home`, an expense id from `components/home/data`);
 * - translated `en.ts` keys: the `home.*` strings the homepage props already use, and
 *   `art.<page>.<slot>` for anything new (at most six words, in the site's dry voice).
 *
 * An example reference on a page whose entry has no such person or expense fails the build.
 * `page-art.test.ts` checks every entry against the English entries.
 */
import type { TranslationKey } from '../i18n';

/** Where a piece of art text comes from */
export type ArtText =
  | { key: TranslationKey }
  /** A person's name in the page's worked example */
  | { person: number }
  /** The name of who paid expense n */
  | { payer: number }
  /** An expense's label, first letter capitalised */
  | { expense: number }
  /** An expense's amount, in the currency it was paid in */
  | { amount: number }
  /** The same amount in the group's currency, as the converted ledger shows it: "≈ £200.00" */
  | { converted: number }
  /** "Kwame paid £120.00 for Energy" (`example.paid`) */
  | { paid: number }
  /** "Dana pays Amira £60.00": the n-th suggested payment (`example.transfer`) */
  | { payment: number }
  /** An amount from the homepage's example group, by expense id, as it was paid */
  | { home: number };

/** The one line under a receipt's rule: a label and what it comes to */
interface Line {
  label: ArtText;
  amount?: ArtText;
}

/** A prop of the homepage kit, with what it says. `tilt` (degrees) overrides the layout's default. */
export type ArtItem =
  | { prop: 'receipt'; title: ArtText; total?: Line; tilt?: number }
  | { prop: 'sticky'; text: ArtText; color?: 'yellow' | 'pink'; tilt?: number }
  | { prop: 'stamp'; text: ArtText; tone?: 'red' | 'green' | 'ink'; tilt?: number }
  /** A group member's polaroid; `tag` sits under the name */
  | { prop: 'polaroid'; person: number; tag?: ArtText; tilt?: number }
  | { prop: 'avatar'; person: number }
  | { prop: 'bubble'; text: ArtText; side: 'start' | 'end' }
  /** An expense card, or (with `payment`) a card for a suggested payment */
  | { prop: 'ledger'; expense: number; tilt?: number }
  | { prop: 'ledger'; payment: number; tilt?: number };

/**
 * The fixed layouts. Items fill them in order.
 * - `cluster`: a tall prop at the start, a second at the end, a third beneath it (receipt, sticky, stamp)
 * - `stack`: expense cards one under another, a stamp landing on the last
 * - `row`: props side by side, overlapping a little (notes, polaroids, receipts)
 * - `chat`: avatar and bubble, bubble and avatar
 * - `flank`: two props, one at each end of a centred hero (pricing); together when there is no room
 */
export type ArtLayout = 'cluster' | 'stack' | 'row' | 'chat' | 'flank';

export interface PageArtDef {
  layout: ArtLayout;
  items: readonly ArtItem[];
}

const key = (value: TranslationKey): ArtText => ({ key: value });


export const pageArt: Readonly<Record<string, PageArtDef>> = {
  // "Who paid for the taxi?" is the example's taxi: Ben paid it, and it is in the app
  'how-it-works': {
    layout: 'chat',
    items: [
      { prop: 'avatar', person: 2 },
      { prop: 'bubble', side: 'start', text: key('home.chaos.chatTaxi') },
      { prop: 'bubble', side: 'end', text: key('art.howItWorks.reply') },
      { prop: 'avatar', person: 0 },
    ],
  },
  // The homepage's story in three props: the problem, an expense, the answer
  features: {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: key('home.expenses.itemDinner'),
        total: { label: key('home.expenses.fieldAmount'), amount: { home: 4 } },
      },
      { prop: 'sticky', text: key('home.chaos.sticky') },
      { prop: 'stamp', text: key('home.settle.allSettled'), tone: 'green' },
    ],
  },
  // One card per split method the example uses: by percentage, equally, by exact amounts
  'feature/split-expenses': {
    layout: 'stack',
    items: [
      { prop: 'ledger', expense: 0 },
      { prop: 'ledger', expense: 1 },
      { prop: 'ledger', expense: 2 },
    ],
  },
  // The example's two suggested payments, and the stamp they earn
  'feature/settle-up': {
    layout: 'stack',
    items: [
      { prop: 'ledger', payment: 0 },
      { prop: 'ledger', payment: 1 },
      { prop: 'stamp', text: key('home.settle.allSettled'), tone: 'green' },
    ],
  },
  // A receipt in pounds, a receipt in yen, and what the yen come to
  'feature/multiple-currencies': {
    layout: 'row',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      {
        prop: 'receipt',
        title: { expense: 1 },
        total: { label: { payer: 1 }, amount: { amount: 1 } },
      },
      { prop: 'stamp', text: { converted: 1 }, tone: 'green' },
    ],
  },
  // Join approval, in one sticky and one stamp (no example: keys only)
  'feature/groups-and-permissions': {
    layout: 'row',
    items: [
      { prop: 'sticky', text: key('art.groupsAndPermissions.sticky'), color: 'pink' },
      { prop: 'stamp', text: key('art.groupsAndPermissions.stamp'), tone: 'ink' },
    ],
  },
  // The comments next to the numbers: Aisha questions the example's wine, Tom moves it
  'feature/plan-together': {
    layout: 'chat',
    items: [
      { prop: 'avatar', person: 2 },
      { prop: 'bubble', side: 'start', text: key('art.planTogether.question') },
      { prop: 'bubble', side: 'end', text: key('art.planTogether.reply') },
      { prop: 'avatar', person: 0 },
    ],
  },
  // The badger reads the receipt; you check its homework (no example: the homepage's karaoke receipt)
  'feature/receipt-scanning': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: key('home.expenses.itemKaraoke'),
        total: { label: key('home.expenses.fieldAmount'), amount: { home: 5 } },
      },
      { prop: 'sticky', text: key('home.expenses.scanning') },
      { prop: 'stamp', text: key('art.receiptScanning.stamp'), tone: 'green' },
    ],
  },
  // The phone's complaint, and the answer (no example: keys only)
  'feature/web-app': {
    layout: 'row',
    items: [
      { prop: 'sticky', text: key('art.webApp.sticky') },
      { prop: 'stamp', text: key('art.webApp.stamp'), tone: 'green' },
    ],
  },
  'use-cases': {
    layout: 'row',
    items: [
      { prop: 'sticky', text: key('home.worlds.housemates.propTwo') },
      { prop: 'sticky', text: key('home.worlds.couples.propTwo'), color: 'pink' },
      { prop: 'sticky', text: key('home.worlds.trips.propTwo') },
    ],
  },
  // The group photo, and who paid for what
  'use-case/group-trips': {
    layout: 'row',
    items: [
      { prop: 'polaroid', person: 0, tag: { amount: 0 } },
      { prop: 'polaroid', person: 1, tag: { amount: 1 } },
      { prop: 'polaroid', person: 2, tag: { amount: 2 } },
      { prop: 'polaroid', person: 3, tag: { amount: 3 } },
    ],
  },
  // The rent, an energy bill and the eternal question
  'use-case/housemates': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: { paid: 1 } },
      { prop: 'sticky', text: key('home.worlds.housemates.propTwo'), color: 'pink' },
    ],
  },
  'use-case/events-and-celebrations': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: key('home.worlds.celebrations.propTwo'), color: 'pink' },
      { prop: 'stamp', text: key('art.eventsAndCelebrations.stamp'), tone: 'ink' },
    ],
  },
  // The couple's photos, what each paid, and how the relationship is holding up
  'use-case/couples': {
    layout: 'row',
    items: [
      { prop: 'polaroid', person: 0, tag: { amount: 0 } },
      { prop: 'polaroid', person: 1, tag: { amount: 1 } },
      { prop: 'stamp', text: key('art.couples.stamp'), tone: 'green' },
    ],
  },
  pricing: {
    layout: 'flank',
    items: [
      {
        prop: 'receipt',
        title: key('art.pricing.title'),
        total: { label: key('art.pricing.total'), amount: key('pricing.free.price') },
      },
      { prop: 'stamp', text: key('art.pricing.stamp'), tone: 'green' },
    ],
  },

  // The help page: the questions people arrive with, and the stamp they leave with (no example: keys only)
  support: {
    layout: 'row',
    items: [
      { prop: 'sticky', text: key('art.support.sticky') },
      { prop: 'sticky', text: key('home.chaos.chatTaxi'), color: 'pink' },
      { prop: 'stamp', text: key('art.support.stamp'), tone: 'green' },
    ],
  },

  // The comparison page: the bill the free bits leave you, and the stamp that says so (no Splitwise marks, no new keys)
  'compare/splitwise': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: key('art.pricing.title'),
        total: { label: key('art.pricing.total'), amount: key('pricing.free.price') },
      },
      { prop: 'stamp', text: key('art.pricing.stamp'), tone: 'green' },
    ],
  },

  // The calculator: the worked example's answer, stamped
  'split-bill-calculator': {
    layout: 'stack',
    items: [
      { prop: 'ledger', payment: 0 },
      { prop: 'ledger', payment: 1 },
      { prop: 'stamp', text: key('home.settle.allSettled'), tone: 'green' },
    ],
  },

  // The rent calculator: the flat's rent, the question every flat asks, and the check that closes it
  'rent-split-calculator': {
    layout: 'row',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: key('art.rentSplitCalculator.sticky'), color: 'pink' },
      { prop: 'stamp', text: key('art.rentSplitCalculator.stamp'), tone: 'green' },
    ],
  },

  // Guides: the story's own expense, the joke and the rule
  'guide/how-to-split-rent-by-room-size': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: key('art.howToSplitRentByRoomSize.sticky') },
      { prop: 'stamp', text: key('art.howToSplitRentByRoomSize.stamp'), tone: 'green' },
    ],
  },
  'guide/how-to-split-a-holiday-villa-when-people-stay-different-nights': {
    layout: 'stack',
    items: [
      { prop: 'ledger', expense: 0 },
      { prop: 'ledger', payment: 0 },
      { prop: 'stamp', text: key('art.howToSplitAHolidayVillaWhenPeopleStayDifferentNights.stamp'), tone: 'ink' },
    ],
  },
  'guide/how-to-split-a-stag-or-hen-weekend': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 1 },
        total: { label: { payer: 1 }, amount: { amount: 1 } },
      },
      { prop: 'sticky', text: key('art.howToSplitAStagOrHenWeekend.sticky'), color: 'pink' },
      { prop: 'stamp', text: key('art.howToSplitAStagOrHenWeekend.stamp'), tone: 'green' },
    ],
  },
  // The rent by percentage, the takeaway split equally on purpose
  'guide/how-to-split-bills-with-a-partner-who-earns-more': {
    layout: 'stack',
    items: [
      { prop: 'ledger', expense: 0 },
      { prop: 'ledger', expense: 2 },
      { prop: 'stamp', text: key('art.howToSplitBillsWithAPartnerWhoEarnsMore.stamp'), tone: 'ink' },
    ],
  },
  // Ramen in yen, the tourist's question, and the answer in pounds
  'guide/how-to-split-a-trip-paid-in-several-currencies': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 2 },
        total: { label: { payer: 2 }, amount: { amount: 2 } },
      },
      { prop: 'sticky', text: key('art.howToSplitATripPaidInSeveralCurrencies.sticky') },
      { prop: 'stamp', text: { converted: 2 }, tone: 'green' },
    ],
  },
  // The present on the buyer's card, the budget poll, the chip-ins
  'guide/how-to-collect-for-a-group-gift': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: key('art.howToCollectForAGroupGift.sticky'), color: 'pink' },
      { prop: 'stamp', text: key('art.howToCollectForAGroupGift.stamp'), tone: 'green' },
    ],
  },
  // The party wine, asked about politely, in the app's own word for it
  'guide/what-to-do-when-someone-disputes-a-shared-expense': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 2 },
        total: { label: { payer: 2 }, amount: { amount: 2 } },
      },
      { prop: 'sticky', text: key('art.whatToDoWhenSomeoneDisputesASharedExpense.sticky'), color: 'pink' },
      { prop: 'stamp', text: key('art.whatToDoWhenSomeoneDisputesASharedExpense.stamp'), tone: 'red' },
    ],
  },
  // The two biggest of the four payments, all to Mo, before the flight
  'guide/how-to-settle-up-after-a-group-trip': {
    layout: 'stack',
    items: [
      { prop: 'ledger', payment: 0 },
      { prop: 'ledger', payment: 1 },
      { prop: 'stamp', text: key('art.howToSettleUpAfterAGroupTrip.stamp'), tone: 'green' },
    ],
  },

  // Layout-review pages (src/site/preview-pages.ts): one per layout, so the layouts spec checks
  // every layout for overflow and axe in English and the pseudo-locales
  'preview/hub': {
    layout: 'row',
    items: [
      { prop: 'sticky', text: key('home.worlds.housemates.propTwo') },
      { prop: 'sticky', text: key('home.worlds.couples.propTwo'), color: 'pink' },
      { prop: 'sticky', text: key('home.worlds.trips.propTwo') },
      { prop: 'sticky', text: key('home.worlds.celebrations.propTwo'), color: 'pink' },
    ],
  },
  'preview/how-it-works': {
    layout: 'chat',
    items: [
      { prop: 'avatar', person: 2 },
      { prop: 'bubble', side: 'start', text: key('home.chaos.chatTaxi') },
      { prop: 'bubble', side: 'end', text: key('art.howItWorks.reply') },
      { prop: 'avatar', person: 0 },
    ],
  },
  'feature/preview': {
    layout: 'stack',
    items: [
      { prop: 'ledger', expense: 0 },
      { prop: 'ledger', expense: 2 },
      { prop: 'stamp', text: { converted: 1 }, tone: 'green' },
    ],
  },
  'compare/preview': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: key('art.pricing.title'),
        total: { label: key('art.pricing.total'), amount: key('pricing.free.price') },
      },
      { prop: 'stamp', text: key('art.pricing.stamp'), tone: 'green' },
    ],
  },
  'use-case/preview': {
    layout: 'cluster',
    items: [
      {
        prop: 'receipt',
        title: { expense: 0 },
        total: { label: { payer: 0 }, amount: { amount: 0 } },
      },
      { prop: 'sticky', text: { paid: 1 } },
      { prop: 'stamp', text: key('home.settle.allSettled'), tone: 'green' },
    ],
  },
};

/** The art for a registry page id, or undefined when the page has none */
export function artFor(pageId: string): PageArtDef | undefined {
  return pageArt[pageId];
}
