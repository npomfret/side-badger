import { test } from '@playwright/test';
import { HomePage } from './pages/homePage';
import { SHELL_LOCALES } from './pages/strings';

/**
 * The homepage (homepage plan, Verification): one h1, the nine scenes in order, links that stay on
 * the site, keyboard reach, both motion engines (native and the `?scenes=stages` fallback) and
 * reduced motion, no overflow and axe. Checked in English and the four pseudo-locales at 1440x900
 * and 390x844. P41 reruns it in the real locales.
 */
const VIEWPORTS = [
  { name: '1440', size: { width: 1440, height: 900 } },
  { name: '390', size: { width: 390, height: 844 } },
] as const;

for (const locale of SHELL_LOCALES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      test('has one h1, the nine scenes in order and the SoftwareApplication JSON-LD', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale);
        await home.expectOneH1();
        await home.expectScenesInOrder();
        await home.expectJsonLdApplication();
        await home.expectNoBannedPhrases();
      });

      test('every link stays on the site and the keyboard reaches all of them', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale);
        await home.expectLinksStayOnTheSite();
        await home.expectKeyboardReachesEveryLink();
      });

      test('nothing overflows and axe finds nothing serious', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale);
        await home.expectNoHorizontalOverflow();
        await home.expectNoSeriousAccessibilityViolations();
      });

      test('the native engine loads no confetti until the settle scene plays', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale);
        await home.expectNoConfettiAtLoad();
        await home.flickThroughSettleAndExpectConfetti();
      });

      test('the stages fallback has the same structure, links and no overflow', async ({ page }) => {
        const home = await HomePage.navigateTo(page, locale, 'stages');
        await home.expectOneH1();
        await home.expectScenesInOrder();
        await home.expectLinksStayOnTheSite();
        await home.expectNoHorizontalOverflow();
        await home.expectNoSeriousAccessibilityViolations();
        await home.expectNoConfettiAtLoad();
        await home.flickThroughSettleAndExpectConfetti();
      });

      test.describe('with reduced motion', () => {
        test.use({ reducedMotion: 'reduce' });

        test('is the static page: same scenes and links, nothing pinned, no confetti', async ({ page }) => {
          const home = await HomePage.navigateTo(page, locale, 'static');
          await home.expectOneH1();
          await home.expectScenesInOrder();
          await home.expectEverySceneReadable();
          await home.expectLinksStayOnTheSite();
          await home.expectNoHorizontalOverflow();
          await home.expectKeyboardReachesEveryLink();
          // axe runs after the keyboard walk, with the page scrolled, so the fixed header is
          // checked over content scrolled beneath it
          await home.expectNoSeriousAccessibilityViolations();
          await home.expectNoConfettiAtLoad();
        });
      });
    });
  }
}
