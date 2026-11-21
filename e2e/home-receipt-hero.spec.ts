import { test } from '@playwright/test';
import { HomePage } from './pages/homePage';

for (const engine of ['native', 'stages'] as const) {
  test.describe(`receipt hero ${engine}`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('timed scan reaches review once without scrolling, above the facts band', async ({ page }) => {
      const home = await HomePage.navigateTo(page, 'en', engine);
      await home.expectHeroScanPlaysOnce();
      await home.expectHeroFacts();
      await home.expectHeroFactsStartAboveTheFold();
      await home.expectNoHorizontalOverflow();
      await home.expectNoSeriousAccessibilityViolations();
      await home.expectHeroScanStaysDoneAfterReentry();
    });

    test('play again replays the whole pass', async ({ page }) => {
      const home = await HomePage.navigateTo(page, 'en', engine);
      await home.replayHeroScanAndExpectFullPass();
    });

    test('a second click during a replay restarts it', async ({ page }) => {
      const home = await HomePage.navigateTo(page, 'en', engine);
      await home.replayHeroScanTwiceAndExpectOneRestart();
    });

    test.describe('phone', () => {
      // The visual's top sits at 404 px on a 375 x 667 phone, so more than 25 % of it is in view at
      // load and the pass starts at once. (The wait for entry only applies when less is in view.)
      test.use({ viewport: { width: 375, height: 667 } });

      test('timed scan plays at load when the visual is in view', async ({ page }) => {
        const home = await HomePage.navigateTo(page, 'en', engine);
        await home.expectHeroScanPlaysOnce();
        await home.expectNoHorizontalOverflow();
        await home.expectHeroScanStaysDoneAfterReentry();
        // No axe here: mid-page, the next scene's scroll-linked fades are part-way, so contrast would
        // depend on scroll position (see SiteAudit). The rest tests below audit the phone hero.
      });
    });

    test.describe('small phone, long text', () => {
      // 320 x 568 (the smallest phone the site supports) in xx-long: the visual's top sits at 489 px
      // and it is 382 px tall, so 21 % of it is in view at load, under the 25 % that starts the pass.
      // In en the same phone shows 46 %, so the long pseudo-locale is what keeps it below the fold.
      test.use({ viewport: { width: 320, height: 568 } });

      test('timed scan waits for the visual to enter, then plays', async ({ page }) => {
        const home = await HomePage.navigateTo(page, 'xx-long', engine);
        await home.expectHeroScanWaitsThenEnter();
        await home.expectHeroScanPlaysOnce();
        await home.expectNoHorizontalOverflow();
      });
    });
  });
}

test.describe('replay control', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('has a tooltip matching its name, on focus and hover, dismissed by Escape', async ({ page }) => {
    const home = await HomePage.navigateTo(page, 'en');
    await home.expectHeroScanPlaysOnce();
    await home.expectReplayTooltip();
  });
});

for (const locale of ['en', 'ar', 'ja', 'xx-long'] as const) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test.describe(`receipt rest ${locale} ${viewport.width}`, () => {
      test.use({ reducedMotion: 'reduce', viewport });
      test('filled fields await checking, the facts show, no replay and no overflow', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale, 'static');
        await home.expectHeroScanRest();
        await home.expectHeroFacts();
        await home.expectNoReplayButton();
        await home.expectNoHorizontalOverflow();
        await home.expectNoSeriousAccessibilityViolations();
      });
    });
  }
}

test.describe('short viewport static engine', () => {
  test.use({ viewport: { width: 1280, height: 550 } });
  test('shows the filled review form without reduced motion, and no replay', async ({ page }) => {
    const home = await HomePage.navigateTo(page, 'en', 'static');
    await home.expectHeroScanRest();
    await home.expectNoReplayButton();
    await home.expectNoHorizontalOverflow();
  });
});
