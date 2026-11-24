import { test } from '@playwright/test';
import { SitePage } from './pages/SitePage';
import { HomePage } from './pages/homePage';

// UTC dates straddle local midnight in New York, proving this follows the visitor's calendar.
const DATES = [
  { name: 'November 30', time: '2026-12-01T00:30:00Z', visible: false },
  { name: 'December 1', time: '2026-12-01T05:00:00Z', visible: true },
  { name: 'December 31', time: '2027-01-01T04:59:00Z', visible: true },
  { name: 'January 1', time: '2027-01-01T05:00:00Z', visible: false },
] as const;

test.use({ timezoneId: 'America/New_York' });

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 568 }]) {
  for (const locale of ['en', 'ar'] as const) {
    test.describe(`${locale} Christmas lights at ${viewport.width}px`, () => {
      test.use({ viewport });
      for (const date of DATES) {
        test(`${date.name}: lights are ${date.visible ? 'on' : 'off'}`, async ({ page }) => {
          await page.clock.setFixedTime(new Date(date.time));
          const home = await SitePage.navigateTo(page, locale, '');
          await home.expectChristmasLights(date.visible);
          await home.expectHeaderHeightToken();
          await home.expectContentClearsHeader();
          await home.expectNoHorizontalOverflow();
          if (date.visible && viewport.width === 320) await (await home.openMenu()).closeWithEscape();
          if (date.name === 'December 1') {
            await home.saveScreenshot(`test-results/christmas/${locale}-${viewport.width}.png`, 'header');
          }
        });
      }
    });
  }
}

test('pricing has no lights in December', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-15T12:00:00Z'));
  const pricing = await SitePage.navigateTo(page, 'en', 'pricing');
  await pricing.expectChristmasLights(false);
});

test.describe('December small-phone scenes', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  for (const locale of ['en', 'ar', 'xx-long', 'xx-ja'] as const) {
    for (const engine of ['native', 'stages'] as const) {
      test(`${locale} ${engine}: settle content fits below the lowered header`, async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-12-15T12:00:00Z'));
        const home = await HomePage.navigateTo(page, locale, engine);
        await home.expectSettleContentFitsStage();
      });
    }
  }
});

test.describe('December with reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 568 } });
  test('keeps the steady lights and accessible navigation', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-12-15T12:00:00Z'));
    const home = await SitePage.navigateTo(page, 'en', '');
    await home.expectChristmasLights(true);
    await (await home.openMenu()).closeWithEscape();
    await home.expectNoSeriousAccessibilityViolations();
  });
});
