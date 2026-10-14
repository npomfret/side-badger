/**
 * Product screenshot registry (restructure D26, D33). One entry per shot in the site plan's shot
 * list (`tasks/seo-site-expansion-plan.md`, "Shot list"). The app repository's capture script
 * produces the files; P35 imports them and updates `status`.
 *
 * Files live in `src/assets/screenshots/<id>/<locale>.png`, or `neutral.png` when `localized` is
 * false. Dimensions are CSS pixels; the files are captured at 2x density.
 *
 * - `missing`: no file yet. `Screenshot.astro` renders nothing.
 * - `placeholder-en`: a manual English capture (`en.png`). Renders on English pages only.
 * - `captured`: a scripted capture. A localized shot fails the build when a locale's file is missing.
 *
 * Clips (C1 to C3) are not images and are not listed here.
 */
export type ShotStatus = 'missing' | 'placeholder-en' | 'captured';
export type ShotViewport = 'desktop' | 'mobile';

export interface Shot {
  id: string;
  /** What the shot shows, for authors. Page alt text comes from page content, never from here. */
  screen: string;
  /** True when the shot shows interface text, so each locale has its own file. */
  localized: boolean;
  status: ShotStatus;
  viewport: ShotViewport;
  width: number;
  height: number;
}

const DESKTOP = { viewport: 'desktop', width: 1440, height: 900 } as const;
const MOBILE = { viewport: 'mobile', width: 390, height: 844 } as const;

const shot = (
  id: string,
  screen: string,
  size: typeof DESKTOP | typeof MOBILE = DESKTOP,
  localized = true
): Shot => ({ id, screen, localized, status: 'missing', ...size });

export const screenshots: readonly Shot[] = [
  shot('S01', 'Dashboard: three groups with per-currency owed amounts, one pending invitation'),
  shot('S02', 'Create group with currency restrictions open'),
  shot('S03', 'Invite dialog, link tab: QR code and expiry choice'),
  shot('S04', 'Join preview, signed in'),
  shot('S05', 'Expense form, percentage split (rent by room size)'),
  shot('S06', 'Expense form, exact amounts (the gift)'),
  shot('S07', 'Expense form converting yen to pounds, rate shown, Edit rate visible'),
  shot('S08', 'Expense detail: originally entered as, receipt thumbnail, comments, reactions'),
  shot('S09', 'Receipt scanning: analysing, then the filled form'),
  shot('S10', 'Balances: simplified debts in two currencies, Show all on'),
  shot('S11', 'Payment form with quick-settle buttons and the part-payment notice'),
  shot('S12', 'Payment history with reactions'),
  shot('S13', 'Group settings, security: presets and custom permissions'),
  shot('S14', 'Pending members awaiting approval'),
  shot('S15', 'Locked-group banner'),
  shot('S16', 'Shared shopping list with progress'),
  shot('S17', 'Closed poll with winner and vote counts'),
  shot('S18', 'Expenses list with a Questioned badge and the Only questioned filter'),
  shot('S19', 'Notifications dropdown with recent activity'),
  shot('S20', 'Settings, Add to Home Screen or Dock'),
  // The point of S21 is Arabic right to left, so one file serves every page
  shot('S21', 'Group page in Arabic, mobile, right to left', MOBILE, false),
];

export const getShot = (id: string): Shot => {
  const found = screenshots.find(s => s.id === id);
  if (!found) throw new Error(`Unknown screenshot "${id}" (not in src/data/screenshots.ts)`);
  return found;
};
