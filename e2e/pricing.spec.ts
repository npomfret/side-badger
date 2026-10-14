import { test } from '@playwright/test';
import { PricingPage } from './pages/pricingPage';
import { SHELL_LOCALES } from './pages/strings';

/**
 * The pricing page (restructure 6.4): one free offer, the limits table with the 999,999.99 cap,
 * the trust stamp, the notice commitment and a FAQ that the `FAQPage` JSON-LD mirrors. Checked in
 * English and the four pseudo-locales at 1280x800 and 375x812, with axe, contrast, the keyboard,
 * overflow and no confetti chunk at load. Screenshots go to test-results/pricing/.
 */
const SHOTS = 'test-results/pricing';
const VIEWPORTS = [
  { name: '1280', size: { width: 1280, height: 800 } },
  { name: '375', size: { width: 375, height: 812 } },
] as const;

for (const locale of SHELL_LOCALES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      test('shows the promise, one offer, the limits table and the outline', async ({ page }) => {
        const pricing = await PricingPage.navigateTo(page, locale);
        await pricing.expectHero();
        await pricing.expectOutline();
        await pricing.expectOffer();
        await pricing.expectLimitsTable();
        await pricing.expectTrustAndNotice();
        await pricing.expectOneRegisterLink();
        await pricing.expectNoHardCodedEnglishLabels();
        await pricing.saveScreenshot(`${SHOTS}/${locale}-${viewport.name}.png`);
      });

      test('the FAQ is visible and the FAQPage JSON-LD matches it', async ({ page }) => {
        const pricing = await PricingPage.navigateTo(page, locale);
        await pricing.expectFaq();
        await pricing.expectFaqJsonLdMatchesVisibleFaq();
      });

      test('nothing overflows, axe finds nothing serious and every text has 4.5:1 contrast', async ({ page }) => {
        const pricing = await PricingPage.navigateTo(page, locale);
        await pricing.expectNoHorizontalOverflow();
        await pricing.expectNoSeriousAccessibilityViolations();
        await pricing.expectTextContrastAtLeast(4.5);
      });

      test('the keyboard reaches the register, privacy and terms links', async ({ page }) => {
        const pricing = await PricingPage.navigateTo(page, locale);
        await pricing.expectKeyboardReachesBodyLinks();
      });

      test('confetti is not loaded with the page, and loads on the first click', async ({ page }) => {
        const pricing = await PricingPage.navigateTo(page, locale);
        await pricing.expectNoConfettiLoaded();
        await pricing.clickRegisterLinkAndExpectConfettiLoads();
      });
    });
  }
}

test.describe('English copy', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('makes no claim the policies contradict', async ({ page }) => {
    const pricing = await PricingPage.navigateTo(page, 'en');
    await pricing.expectNoBannedClaims();
  });

  test('"Will it always be free?" quotes the terms\' notice commitment', async ({ page }) => {
    const pricing = await PricingPage.navigateTo(page, 'en');
    await pricing.expectNoticeCommitmentQuoted();
  });
});
