import { test } from '@playwright/test';
import { requirePage } from '../src/site/pages';
import { LocalizedPage } from './pages/localizedPage';
import { SiteAudit } from './pages/siteAudit';
import { LOCALIZED_LOCALES } from './pages/strings';

/**
 * The site in real locales (P41, W4b), as visitors of each language see it: a representative set
 * (Latin `de`, `fr`, `pl`, `pcm`; CJK `ja`, `zh`; Indic `hi`; RTL `ar`, `ur`) at 375x812 and
 * 1280x800. Every layout is covered: the homepage, pricing, a policy, how-it-works, both hubs, a
 * feature and a use case. The server builds with PREVIEW_UNPUBLISHED=1 (see playwright.config.ts).
 */
const VIEWPORTS = [
  { name: '375', size: { width: 375, height: 812 }, phone: true },
  { name: '1280', size: { width: 1280, height: 800 }, phone: false },
] as const;

const PAGES = [
  'home',
  'pricing',
  'privacy',
  'how-it-works',
  'features',
  'feature/settle-up',
  'use-cases',
  'use-case/housemates',
].map(id => requirePage(id));

/** Keyboard runs on one short page and one long content page per locale and viewport */
const KEYBOARD_PAGES = ['pricing', 'feature/settle-up'].map(id => requirePage(id));

for (const locale of LOCALIZED_LOCALES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      for (const def of PAGES) {
        test(`${def.id}: lang, dir, one h1, shell in ${locale}, launch links, no overflow, axe`, async ({ page }) => {
          const localized = await LocalizedPage.navigateTo(page, locale, def);
          await localized.expectLangAndDir();
          await localized.expectShellInLocale(viewport.phone);
          await localized.expectLaunchLinksCarryLocale();

          const site = await SiteAudit.navigateTo(page, locale, def);
          await site.expectOneH1();
          await site.expectBreadcrumbMatchesRegistry();
          await site.expectNoHorizontalOverflow();
          await site.expectNoSeriousAccessibilityViolations();
        });
      }

      for (const def of KEYBOARD_PAGES) {
        test(`${def.id}: the keyboard reaches every control with a visible focus ring`, async ({ page }) => {
          const site = await SiteAudit.navigateTo(page, locale, def);
          await site.expectKeyboardReachesEverything();
        });
      }

      test('the language switcher lists and links every real locale', async ({ page }) => {
        const localized = await LocalizedPage.navigateTo(page, locale, requirePage('feature/settle-up'));
        await localized.expectSwitcherListsRealLocales();
      });
    });
  }
}
