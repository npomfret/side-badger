import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatNumber,
  formatRate,
  mirrorAngle,
  mirrorPathD,
  mirrorX,
} from '@/components/home/format';

describe('home formatMoney', () => {
  it('formats minor units for the locale', () => {
    expect(formatMoney(30000, 'EUR', 'en')).toBe('€300.00');
    expect(formatMoney(30000, 'EUR', 'en', { whole: true })).toBe('€300');
    expect(formatMoney(96000, 'JPY', 'en')).toBe('¥96,000');
    expect(formatMoney(13200, 'USD', 'en')).toBe('$132.00');
  });

  it('keeps the sign with the number when signed', () => {
    expect(formatMoney(30000, 'EUR', 'en', { signed: true, whole: true })).toBe('+€300');
    expect(formatMoney(-14000, 'EUR', 'en', { signed: true, whole: true })).toMatch(/^[-−]€140$/);
    expect(formatMoney(0, 'EUR', 'en', { signed: true, whole: true })).toBe('€0');
  });

  it('uses the locale digits and the pseudo-locale codes', () => {
    expect(formatMoney(30000, 'EUR', 'ar', { whole: true })).toMatch(/[٠-٩]{3}/);
    expect(formatMoney(30000, 'EUR', 'xx-ar', { whole: true })).toMatch(/[٠-٩]{3}/);
    expect(formatMoney(30000, 'EUR', 'xx-long', { whole: true })).toBe('€300');
    expect(formatMoney(30000, 'EUR', 'de', { whole: true })).toContain('300');
  });

  it('formats numbers and rates', () => {
    expect(formatNumber(19, 'en')).toBe('19');
    expect(formatNumber(19, 'ar')).toMatch(/[٠-٩]{2}/);
    expect(formatRate(160, 'en')).toBe('160');
    expect(formatRate(1.1, 'en')).toBe('1.10');
  });
});

describe('home geometry mirroring', () => {
  it('mirrors x and angles', () => {
    expect(mirrorX(40, 360)).toBe(320);
    expect(mirrorAngle(0)).toBe(180);
    expect(mirrorAngle(30)).toBe(150);
    expect(mirrorAngle(mirrorAngle(37))).toBe(37);
  });

  it('mirrors absolute path data', () => {
    expect(mirrorPathD('M10 20 C 30 0, 60 40, 90 20', 100)).toBe('M90 20C70 0 40 40 10 20');
    expect(mirrorPathD('M10 20 L 30 40 Z', 100)).toBe('M90 20L70 40Z');
    expect(mirrorPathD('M10 20 H 30 V 5', 100)).toBe('M90 20H70V5');
  });

  it('mirrors relative commands by negating dx', () => {
    expect(mirrorPathD('m10 20 l 5 5 h 4', 100)).toBe('m-10 20l-5 5h-4');
  });

  it('flips arc sweep and is its own inverse', () => {
    expect(mirrorPathD('M10 10 A 5 5 0 0 1 20 10', 100)).toBe('M90 10A5 5 0 0 0 80 10');
    const d = 'M12 7.5 C 30 4, 61 40, 92 21.25 L 3 3 Z';
    expect(mirrorPathD(mirrorPathD(d, 100), 100)).toBe('M12 7.5C30 4 61 40 92 21.25L3 3Z');
  });
});
