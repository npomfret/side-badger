import { test } from '@playwright/test';
import { SitePage } from './pages/SitePage';
import { SHELL_LOCALES } from './pages/strings';

/**
 * The site shell (restructure step 5): header, mobile menu, footer, breadcrumbs, language switcher
 * keyboard behaviour, accessibility and overflow, in English and the four pseudo-locales
 * (`xx-long`, `xx-ar`, `xx-ja`, `xx-hi`), at 1280x800 and 375x812. Screenshots go to
 * test-results/shell/ for review.
 */
const SHOTS = 'test-results/shell';

for (const locale of SHELL_LOCALES) {
  test.describe(`${locale} at 1280x800`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('header shows the published links, the launch link and an accurate --header-h', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.expectDesktopHeader();
      await site.expectHeaderLinks(['nav.features', 'nav.useCases', 'nav.howItWorks', 'nav.pricing']);
      await site.expectCurrentHeaderLink('nav.pricing');
      await site.expectLaunchLink();
      await site.expectHeaderHeightToken();
      await site.expectContentClearsHeader();
      await site.saveScreenshot(`${SHOTS}/${locale}-1280-header.png`, 'header');
    });

    test('every header control is reachable by keyboard in order', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.verifyDesktopKeyboardOrder(['nav.features', 'nav.useCases', 'nav.howItWorks', 'nav.pricing']);
    });

    test('the language switcher opens and moves with the arrow keys and closes on Escape', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.switchLanguageByKeyboard();
    });

    test('the language switcher search filters the languages', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.searchLanguages();
    });

    test('the footer groups come from the registry under h2 headings', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.expectFooterGroups(['footer.product', 'footer.useCases', 'footer.legal']);
      await site.expectFooterLinkTargets('footer.product', [
        'how-it-works',
        'features',
        'features/split-expenses',
        'features/settle-up',
        'features/multiple-currencies',
        'pricing',
      ]);
      await site.expectFooterLinkTargets('footer.useCases', [
        'use-cases',
        'use-cases/group-trips',
        'use-cases/housemates',
        'use-cases/events-and-celebrations',
      ]);
      await site.expectFooterLinks('footer.legal', ['footer.privacy', 'footer.terms', 'footer.cookies']);
      await site.expectFooterLegal();
      await site.saveScreenshot(`${SHOTS}/${locale}-1280-footer.png`, 'footer');
    });

    test('a page one level below Home has no breadcrumb', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.expectNoBreadcrumb();
    });

    test('nothing in the shell overflows, and axe finds nothing serious', async ({ page }) => {
      for (const route of ['', 'pricing', 'privacy'] as const) {
        const site = await SitePage.navigateTo(page, locale, route);
        await site.expectNoHorizontalOverflow();
        await site.expectNoSeriousAccessibilityViolations();
      }
    });

    test('axe finds nothing serious with the language dropdown open', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.openLanguageSwitcherForChecks();
      await site.expectNoSeriousAccessibilityViolations();
    });
  });

  test.describe(`${locale} at 375x812`, () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: false });

    test('header keeps the logo, switcher, launch link and Menu button, with an accurate --header-h', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.expectPhoneHeader();
      await site.expectLaunchLink();
      await site.expectHeaderHeightToken();
      await site.expectContentClearsHeader();
      await site.expectNoHorizontalOverflow();
      await site.saveScreenshot(`${SHOTS}/${locale}-375-header.png`, 'header');
    });

    test('every header control is reachable by keyboard in order', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.verifyPhoneKeyboardOrder();
    });

    test('the menu opens from its button, holds the same links, and closes three ways', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');

      let menu = await site.openMenu();
      await menu.expectLinks(['nav.features', 'nav.useCases', 'nav.howItWorks', 'nav.pricing']);
      await menu.expectCurrentLink('nav.pricing');
      await menu.saveScreenshot(`${SHOTS}/${locale}-375-menu.png`);
      const afterEscape = await menu.closeWithEscape();

      menu = await afterEscape.openMenu();
      const afterButton = await menu.closeWithButton();

      menu = await afterButton.openMenu();
      await menu.closeByClickingOutside();
    });

    test('axe finds nothing serious with the menu open', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      const menu = await site.openMenu();
      await menu.expectNoSeriousAccessibilityViolations();
    });

    test('the footer stacks and nothing overflows', async ({ page }) => {
      const site = await SitePage.navigateTo(page, locale, 'pricing');
      await site.expectFooterGroups(['footer.product', 'footer.useCases', 'footer.legal']);
      await site.expectNoHorizontalOverflow();
      await site.saveScreenshot(`${SHOTS}/${locale}-375-footer.png`, 'footer');
    });

    test('axe finds nothing serious on the phone layout', async ({ page }) => {
      for (const route of ['', 'pricing'] as const) {
        const site = await SitePage.navigateTo(page, locale, route);
        await site.expectNoSeriousAccessibilityViolations();
      }
    });
  });
}
