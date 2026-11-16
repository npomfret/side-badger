import { describe, expect, it } from 'vitest';
import { isAnalyticsVisitEligible } from '../lib/analytics-eligibility';

describe('optional public website analytics', () => {
  const allowed = {
    hostname: 'sidebadger.me', search: '', hash: '', referrer: '',
    pageEligible: true, permission: true, privacySignal: false,
  } as const;

  it('permits an explicitly allowed direct public production visit', () => {
    expect(isAnalyticsVisitEligible(allowed)).toBe(true);
  });

  it.each([
    { permission: false }, { privacySignal: true }, { pageEligible: false },
    { hostname: 'app.sidebadger.me' }, { hostname: 'staging.sidebadger.me' },
    { hostname: 'localhost' }, { hostname: 'sidebadger.me.example.org' },
    { search: '?invite=private' }, { hash: '#financial-calculator-data' },
    { referrer: 'https://app.sidebadger.me/groups/private?token=secret' },
  ])('excludes a visit with %j', (change) => {
    expect(isAnalyticsVisitEligible({ ...allowed, ...change })).toBe(false);
  });
});
