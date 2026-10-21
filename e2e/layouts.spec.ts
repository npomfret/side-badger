import { test } from '@playwright/test';
import { ContentPage } from './pages/layoutsPage';
import type { LayoutKind } from './pages/layoutsFixtures';
import { SHELL_LOCALES } from './pages/strings';

/**
 * The six content layouts (restructure 5.6, and the guide and comparison layouts of release 2), shown by their
 * preview pages, in English and the four pseudo-locales (`xx-long`, `xx-ar`, `xx-ja`, `xx-hi`) at
 * 1280x800 and 375x812: sections, calls to action, breadcrumbs, FAQ, the computed worked examples,
 * the links between guides and product pages, overflow and axe.
 * Full-page screenshots go to test-results/layouts/ for review.
 */
const SHOTS = 'test-results/layouts';
const KINDS: readonly LayoutKind[] = ['feature', 'use-case', 'hub', 'how-it-works', 'guide', 'compare'];
const PRODUCT_KINDS = ['feature', 'use-case', 'how-it-works'] as const;
const VIEWPORTS = [
  { name: '1280', size: { width: 1280, height: 800 } },
  { name: '375', size: { width: 375, height: 812 } },
] as const;

for (const locale of SHELL_LOCALES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      for (const kind of KINDS) {
        test(`${kind} layout: sections, calls to action and breadcrumb`, async ({ page }) => {
          const content = await ContentPage.navigateTo(page, locale, kind);
          await content.expectSections();
          await content.expectLaunchLinks();
          await content.expectBreadcrumb();
          await content.expectFaq();
          await content.saveScreenshot(`${SHOTS}/${locale}-${kind}-${viewport.name}.png`);
        });

        test(`${kind} layout: nothing overflows and axe finds nothing serious`, async ({ page }) => {
          const content = await ContentPage.navigateTo(page, locale, kind);
          await content.expectNoHorizontalOverflow();
          await content.expectNoSeriousAccessibilityViolations();
        });
      }

      test('feature layout: the worked example shows both currency views with the rate labelled', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'feature');
        await content.expectWorkedExample();
      });

      test('use-case layout: the worked example turns six payments into two', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'use-case');
        await content.expectWorkedExample();
      });

      test('how-it-works layout: the worked example is computed', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'how-it-works');
        await content.expectWorkedExample();
      });

      test('guide layout: the worked example is computed from exact amounts', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'guide');
        await content.expectWorkedExample();
      });

      test('compare layout: the as-of date is on the page, and the table cites a source for every row', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'compare');
        await content.expectAsOfDate();
        await content.expectComparisonTable();
      });

      test('guide layout: it links to the product pages that its registry entry names', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'guide');
        await content.expectRelatedProductPages();
      });

      for (const kind of PRODUCT_KINDS) {
        test(`${kind} layout: it lists the guide that names it`, async ({ page }) => {
          const content = await ContentPage.navigateTo(page, locale, kind);
          await content.expectRelatedGuides();
        });
      }

      test('hub layout: the cards are the hub\'s child pages', async ({ page }) => {
        const content = await ContentPage.navigateTo(page, locale, 'hub');
        await content.expectHubCards();
      });
    });
  }
}

test.describe('English worked example, stated literally', () => {
  test('the use-case example settles Amira, Ben, Carlos and Dana with two payments', async ({ page }) => {
    const content = await ContentPage.navigateTo(page, 'en', 'use-case');
    await content.expectTransferLines('Who pays whom', ['Dana pays Amira £60.00', 'Ben pays Carlos £20.00']);
    await content.expectTransferLines('Paying each person back directly', [
      'Ben pays Amira £20.00',
      'Carlos pays Amira £10.00',
      'Dana pays Amira £30.00',
      'Dana pays Ben £10.00',
      'Ben pays Carlos £10.00',
      'Dana pays Carlos £20.00',
    ]);
  });
});

test.describe('English guide example, stated literally', () => {
  test('the villa guide settles Ines, Joel, Kit and Lena with three payments, all to Ines', async ({ page }) => {
    const content = await ContentPage.navigateTo(page, 'en', 'guide');
    await content.expectTransferLines('Who pays whom', ['Joel pays Ines £190.00', 'Lena pays Ines £180.00', 'Kit pays Ines £120.00']);
    await content.expectTransferLines('Paying each person back directly', [
      'Joel pays Ines £220.00',
      'Kit pays Ines £120.00',
      'Lena pays Ines £150.00',
      'Lena pays Joel £30.00',
    ]);
  });
});
