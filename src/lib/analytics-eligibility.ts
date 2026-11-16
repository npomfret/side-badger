/** Only direct visits to public marketing pages may load the optional beacon. */
export function isAnalyticsVisitEligible(visit: {
  readonly hostname: string;
  readonly search: string;
  readonly hash: string;
  readonly referrer: string;
  readonly pageEligible: boolean;
  readonly permission: boolean;
  readonly privacySignal: boolean;
}): boolean {
  return visit.hostname === 'sidebadger.me'
    && visit.pageEligible
    && visit.permission
    && !visit.privacySignal
    && !visit.search
    && !visit.hash
    && !visit.referrer;
}
