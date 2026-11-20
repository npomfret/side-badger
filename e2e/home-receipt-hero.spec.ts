import { test } from '@playwright/test';
import { HomePage } from './pages/homePage';

for (const engine of ['native', 'stages'] as const) {
  test.describe(`receipt hero ${engine}`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('timed scan reaches review once without scrolling', async ({ page }) => {
      const home = await HomePage.navigateTo(page, 'en', engine);
      await home.expectHeroScanPlaysOnce();
      await home.expectNoHorizontalOverflow();
      await home.expectNoSeriousAccessibilityViolations();
    });

    test.describe('phone entry', () => {
      // The visual's top sits at 591 px on a 375-wide phone: at 667 px tall it is under 25 % visible at load.
      test.use({ viewport: { width: 375, height: 667 } });
      test('timed scan waits for the visual to enter', async ({ page }) => {
        const home = await HomePage.navigateTo(page, 'en', engine);
        await home.enterHeroScan();
        await home.expectHeroScanPlaysOnce();
        await home.expectNoHorizontalOverflow();
        // No axe here: mid-page, the next scene's scroll-linked fades are part-way, so contrast would
        // depend on scroll position (see SiteAudit). The rest tests below audit the phone hero.
      });
    });
  });
}

for (const locale of ['en', 'ar', 'ja', 'xx-long'] as const) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test.describe(`receipt rest ${locale} ${viewport.width}`, () => {
      test.use({ reducedMotion: 'reduce', viewport });
      test('filled fields await checking with Google disclosure and no overflow', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale, 'static');
        await home.expectHeroScanRest();
        await home.expectNoHorizontalOverflow();
        await home.expectNoSeriousAccessibilityViolations();
      });
    });
  }
}

test.describe('short viewport static engine', () => {
  test.use({ viewport: { width: 1280, height: 550 } });
  test('shows the filled review form without reduced motion', async ({ page }) => {
    const home = await HomePage.navigateTo(page, 'en', 'static');
    await home.expectHeroScanRest();
    await home.expectNoHorizontalOverflow();
  });
});
