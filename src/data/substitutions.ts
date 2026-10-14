/**
 * Approved substitutions (site plan, "Approved substitutions"; restructure D16).
 *
 * `insteadOf` is the phrase that must not appear in English page copy or interface text. A cell
 * with "/" is several phrases, split and matched case-insensitively by `registry.test.ts`.
 * `use` is what to write instead.
 */
import type { Substitution } from './types';

export const substitutions: readonly Substitution[] = [
  { insteadOf: 'Free forever / 100% free and unlimited', use: 'Free. No ads. No daily limits.' },
  { insteadOf: 'Zero tracking / no tracking / privacy first', use: 'No ads or third-party trackers' },
  { insteadOf: 'Your data stays yours', use: "(no substitute; don't make the claim)" },
  { insteadOf: 'Settle with a single tap / pay back', use: 'Record a payment' },
  { insteadOf: 'The fewest payments / minimise', use: 'Fewer payments / a short list of payments' },
  { insteadOf: 'Real-time rates / live rates', use: 'A current exchange rate, which you can change' },
  { insteadOf: 'Any currency', use: '140 currencies' },
  { insteadOf: 'Join instantly', use: 'Join with a link or QR code' },
  { insteadOf: 'AI extracts the details accurately', use: 'Fills in the details for you to check' },
  { insteadOf: 'Instant notifications', use: 'Updates appear in the app straight away' },
  { insteadOf: 'Add friends', use: 'Invite people to a group' },
  { insteadOf: 'Coming soon', use: '(nothing; describe what exists)' },
];
