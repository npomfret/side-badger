import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBuildLocales, localeConfig, locales } from '@/i18n';
import { offeredLocales } from '@/components/languageSwitcherLocales';
import { moneyFormatter } from '@/components/content/money';
import { previewPages } from '@/site/preview-pages';

afterEach(() => vi.unstubAllEnvs());

describe('language switcher locales', () => {
  it('offers only the locales a restricted page is built for', () => {
    vi.stubEnv('PREVIEW_UNPUBLISHED', '1');
    const page = previewPages[0];
    expect(page.locales).not.toBe('all');
    const offered = offeredLocales(page.path);
    const expected = (page.locales as readonly string[]).filter(l => getBuildLocales().includes(l as never));
    expect([...offered].sort()).toEqual([...expected].sort());
    expect(offered.size).toBeLessThan(getBuildLocales().length);
  });

  it('offers every built locale on a page with no registry id', () => {
    expect([...offeredLocales('/404/')].sort()).toEqual([...getBuildLocales()].sort());
  });

  it('offers every built locale on an all-locale page', () => {
    expect([...offeredLocales('/pricing/')].sort()).toEqual([...getBuildLocales()].sort());
  });
});

describe('money digits', () => {
  it.each(locales)('%s formats with Western digits', locale => {
    const text = moneyFormatter(localeConfig[locale].intlCode).minor(9000, 'GBP');
    expect(text).toMatch(/90/);
    expect(text).not.toMatch(/[٠-٩۰-۹০-৯०-९]/);
  });
});
