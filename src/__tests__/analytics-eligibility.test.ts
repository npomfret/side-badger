import { describe, expect, it } from 'vitest';
import { isAnalyticsVisitEligible } from '../lib/analytics-eligibility';

describe('optional public website analytics', () => {
  const allowed = {
    hostname: 'sidebadger.me', pathname: '/', search: '', hash: '', referrer: '',
    pageEligible: true, permission: true, privacySignal: false,
  } as const;

  it('permits an explicitly allowed direct public production visit', () => {
    expect(isAnalyticsVisitEligible(allowed)).toBe(true);
  });

  it('permits a same-page Safari reload after consent without accepting another referrer', () => {
    expect(isAnalyticsVisitEligible({ ...allowed, referrer: 'https://sidebadger.me/' })).toBe(true);
    expect(isAnalyticsVisitEligible({ ...allowed, pathname: '/privacy/', referrer: 'https://sidebadger.me/privacy/' })).toBe(true);
  });

  it.each([
    { permission: false }, { privacySignal: true }, { pageEligible: false },
    { hostname: 'app.sidebadger.me' }, { hostname: 'staging.sidebadger.me' },
    { hostname: 'localhost' }, { hostname: 'sidebadger.me.example.org' },
    { search: '?invite=private' }, { hash: '#financial-calculator-data' },
    { referrer: 'https://app.sidebadger.me/groups/private?token=secret' },
    { referrer: 'https://sidebadger.me/?private=value' }, { referrer: 'https://sidebadger.me/tools/' },
    { referrer: 'https://sidebadger.me.example.org/' }, { referrer: 'http://sidebadger.me/' },
  ])('excludes a visit with %j', (change) => {
    expect(isAnalyticsVisitEligible({ ...allowed, ...change })).toBe(false);
  });
});
