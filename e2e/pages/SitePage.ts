import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ELEMENT_TIMEOUT, MODAL_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';

/** The registry's launch-counter page id for each route the shell tests visit */
export type ShellRoute = 'pricing' | 'privacy' | 'terms' | 'cookies' | '';

/**
 * Any built page of the site: the header, the mobile menu, the footer and the breadcrumbs are the
 * same everywhere, so one page object covers them. `navigateTo` is the only way in.
 */
export class SitePage {
  private constructor(
    protected readonly page: Page,
    protected readonly locale: ShellLocale,
    protected readonly route: ShellRoute
  ) {}

  static async navigateTo(page: Page, locale: ShellLocale, route: ShellRoute): Promise<SitePage> {
    const site = new SitePage(page, locale, route);
    await page.goto(pathFor(locale, route));
    await site.verifyLoaded();
    return site;
  }

  // ----- locators, built fresh on every use -----

  private get banner(): Locator {
    return this.page.getByRole('banner');
  }

  private get footer(): Locator {
    return this.page.getByRole('contentinfo');
  }

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  /** The main navigation. Only one is visible at a time: the header's, or the open menu's. */
  private get mainNav(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.mainNavigation') });
  }

  private get homeLink(): Locator {
    return this.banner.getByRole('link', { name: this.string('a11y.homeLink') });
  }

  private get launchLink(): Locator {
    return this.banner.getByRole('link', { name: this.string('header.launchApp') });
  }

  private get skipLink(): Locator {
    return this.page.getByRole('link', { name: this.string('a11y.skipToContent') });
  }

  private get menuButton(): Locator {
    return this.banner.getByRole('button', { name: this.string('nav.menu'), exact: true });
  }

  private get breadcrumb(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.breadcrumb'), exact: true });
  }

  private get languageSwitcher(): LanguageSwitcher {
    return new LanguageSwitcher(this.page, this.locale);
  }

  // ----- the page -----

  /** The user is already on this page (a menu closed, a dialog dismissed): verify it, no reload. */
  static async returnTo(page: Page, locale: ShellLocale, route: ShellRoute): Promise<SitePage> {
    const site = new SitePage(page, locale, route);
    await site.verifyLoaded();
    return site;
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(pathFor(this.locale, this.route), { timeout: NAVIGATION_TIMEOUT });
    await expect(this.page.locator('html'), 'text direction').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
    await expect(this.banner, 'the site header').toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.footer, 'the site footer').toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.homeLink, 'the logo link').toBeVisible();
  }

  // ----- header -----

  /** The header's links are exactly these, in order. Absent pages (unpublished) have no link. */
  async expectHeaderLinks(keys: readonly StringKey[]): Promise<void> {
    await expect(this.mainNav.getByRole('link'), 'header navigation links').toHaveText(
      keys.map(key => this.string(key))
    );
  }

  async expectNoHeaderLink(key: StringKey): Promise<void> {
    await expect(
      this.page.getByRole('link', { name: this.string(key), exact: true }).and(this.banner.getByRole('link')),
      `no link "${this.string(key)}" in the header`
    ).toHaveCount(0);
  }

  async expectCurrentHeaderLink(key: StringKey): Promise<void> {
    await expect(this.mainNav.getByRole('link', { name: this.string(key), exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
  }

  /** The launch link goes through the counter (D28): `/go/app/`, this page and `header`, nofollow. */
  async expectLaunchLink(): Promise<void> {
    const from = this.route === '' ? 'home' : this.route;
    await expect(this.launchLink).toBeVisible();
    await expect(this.launchLink).toHaveAttribute('href', `/go/app/?from=${from}&cta=header`);
    await expect(this.launchLink).toHaveAttribute('rel', 'nofollow');
  }

  /**
   * `--header-h` equals the header's bottom edge. The probe is a throwaway element whose height is
   * the token, so the check reads what the pinned scenes read.
   */
  async expectHeaderHeightToken(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const header = document.querySelector('header')!;
            const probe = document.createElement('div');
            probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--header-h);width:1px';
            document.body.appendChild(probe);
            const token = probe.getBoundingClientRect().height;
            probe.remove();
            return Math.abs(header.getBoundingClientRect().bottom - token) < 0.5;
          }),
        { message: '--header-h should equal the header bottom edge', timeout: ELEMENT_TIMEOUT }
      )
      .toBe(true);
  }

  /** Main starts at the header's bottom edge, so no content hides under it. */
  async expectContentClearsHeader(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const header = document.querySelector('header')!.getBoundingClientRect().bottom;
            const main = document.querySelector('main')!;
            return parseFloat(getComputedStyle(main).paddingTop) >= header - 0.5;
          }),
        { message: 'main should start below the header', timeout: ELEMENT_TIMEOUT }
      )
      .toBe(true);
  }

  /** Tab order from the top of the page on a wide screen: skip link, logo, links, switcher, launch. */
  async verifyDesktopKeyboardOrder(linkKeys: readonly StringKey[]): Promise<void> {
    const order: Locator[] = [
      this.skipLink,
      this.homeLink,
      ...linkKeys.map(key => this.mainNav.getByRole('link', { name: this.string(key), exact: true })),
      this.banner.getByRole('button', { name: new RegExp(`^${this.string('a11y.changeLanguage').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }),
      this.launchLink,
    ];
    await this.pressTabThrough(order);
  }

  /** Tab order on a phone: skip link, logo, switcher, launch, Menu. */
  async verifyPhoneKeyboardOrder(): Promise<void> {
    const order: Locator[] = [
      this.skipLink,
      this.homeLink,
      this.banner.getByRole('button', { name: new RegExp(`^${this.string('a11y.changeLanguage').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }),
      this.launchLink,
      this.menuButton,
    ];
    await this.pressTabThrough(order);
  }

  private async pressTabThrough(order: readonly Locator[]): Promise<void> {
    for (const [index, target] of order.entries()) {
      await this.page.keyboard.press('Tab');
      await expect(target, `Tab stop ${index + 1} of ${order.length}`).toBeFocused();
    }
  }

  // ----- language switcher -----

  async switchLanguageByKeyboard(): Promise<void> {
    const switcher = this.languageSwitcher;
    await switcher.verifyLoaded();
    await switcher.focusButton();
    await switcher.openWithArrowDown();
    await switcher.moveDownTo(1);
    await switcher.jumpToEnd();
    await switcher.jumpToStart();
    await switcher.expectOptionsAreLinks();
    await switcher.closeWithEscape();
  }

  async searchLanguages(): Promise<void> {
    const switcher = this.languageSwitcher;
    await switcher.openWithClick();
    await switcher.filterTo('arabic', 'xx-ar', 'xx-ja');
    await switcher.closeWithEscape();
  }

  async openLanguageSwitcherForChecks(): Promise<void> {
    const switcher = this.languageSwitcher;
    await switcher.openWithClick();
    await switcher.expectCurrentOption();
  }

  // ----- mobile menu -----

  /** Below the breakpoint, the Menu button is shown and the header links are not. */
  async expectPhoneHeader(): Promise<void> {
    await expect(this.menuButton, 'Menu button on a phone').toBeVisible();
    await expect(this.mainNav, 'the menu is closed').toBeHidden();
  }

  async expectDesktopHeader(): Promise<void> {
    await expect(this.menuButton, 'no Menu button on a wide screen').toBeHidden();
    await expect(this.mainNav).toBeVisible();
  }

  async openMenu(): Promise<OpenMenu> {
    await this.expectPhoneHeader();
    await this.menuButton.click();
    const menu = new OpenMenu(this.page, this.locale, this.route);
    await menu.verifyLoaded();
    return menu;
  }

  // ----- footer -----

  /** One h2 per registry group, in order, and no other heading in the footer. */
  async expectFooterGroups(headingKeys: readonly StringKey[]): Promise<void> {
    await expect(this.footer.getByRole('heading'), 'footer headings').toHaveText(
      headingKeys.map(key => this.string(key))
    );
    await expect(this.footer.getByRole('heading', { level: 2 }), 'every footer heading is an h2').toHaveCount(
      headingKeys.length
    );
  }

  async expectFooterLinks(groupKey: StringKey, linkKeys: readonly StringKey[]): Promise<void> {
    const group = this.footer.getByRole('list', { name: this.string(groupKey), exact: true });
    await expect(group.getByRole('link'), `footer links under "${this.string(groupKey)}"`).toHaveText(
      linkKeys.map(key => this.string(key))
    );
  }

  async expectFooterLegal(): Promise<void> {
    await expect(this.footer, 'the tagline').toContainText(this.string('footer.tagline'));
    // The year is filled in at build time; the test runs against a fresh build
    const copyright = this.string('footer.copyright').replace('{year}', String(new Date().getFullYear()));
    await expect(this.footer.getByText(copyright, { exact: true }), 'the copyright line').toBeVisible();
  }

  // ----- breadcrumbs -----

  /** Depth-one pages (pricing, the policies) and the homepage have no breadcrumb. */
  async expectNoBreadcrumb(): Promise<void> {
    await expect(this.breadcrumb).toHaveCount(0);
  }

  // ----- whole-page checks -----

  /**
   * No part of the shell is wider than the viewport. The page's own scroll width counts, and so
   * does any visible element of the header, footer and breadcrumbs.
   */
  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            const offenders: string[] = [];
            if (document.documentElement.scrollWidth > width) offenders.push('<html> scrolls sideways');
            for (const el of document.querySelectorAll<HTMLElement>('header *, footer *, .breadcrumbs *')) {
              const style = getComputedStyle(el);
              if (style.visibility === 'hidden' || style.display === 'none') continue;
              if (el.closest('.sr-only, .skip-link')) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                offenders.push(`${el.tagName.toLowerCase()}.${el.className} [${Math.round(rect.left)}..${Math.round(rect.right)}] of ${width}`);
              }
            }
            return offenders;
          }),
        { message: 'nothing in the shell should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  /** axe reports no serious or critical violations on the page as it now stands. */
  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const serious = results.violations
      .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
      .map(violation => ({
        rule: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map(node => node.target.join(' ')),
      }));
    // axe returns its findings in one analysis; there is no element to poll
    expect(serious, 'serious or critical accessibility violations').toEqual([]);
  }

  async saveScreenshot(path: string, area: 'header' | 'menu' | 'footer'): Promise<void> {
    if (area === 'footer') {
      await this.footer.scrollIntoViewIfNeeded();
      await expect(this.footer).toBeInViewport();
      await this.page.screenshot({ path });
      return;
    }
    await this.page.screenshot({ path, clip: await this.clipFor(area) });
  }

  private async clipFor(area: 'header' | 'menu'): Promise<{ x: number; y: number; width: number; height: number }> {
    const viewport = this.page.viewportSize()!;
    // The header plus, when the menu is open, the room it needs
    return { x: 0, y: 0, width: viewport.width, height: area === 'menu' ? Math.min(viewport.height, 420) : 120 };
  }
}

/** The mobile menu, open. */
export class OpenMenu {
  constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale,
    private readonly route: ShellRoute
  ) {}

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  private get menuButton(): Locator {
    return this.page.getByRole('banner').getByRole('button', { name: this.string('nav.menu'), exact: true });
  }

  private get closeButton(): Locator {
    return this.page.getByRole('button', { name: this.string('nav.closeMenu'), exact: true });
  }

  private get links(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.mainNavigation') }).getByRole('link');
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.closeButton, 'Close menu button in the open menu').toBeVisible({ timeout: MODAL_TIMEOUT });
  }

  /** The menu holds the same links as the desktop header. */
  async expectLinks(keys: readonly StringKey[]): Promise<void> {
    await expect(this.links, 'menu links').toHaveText(keys.map(key => this.string(key)));
  }

  async expectCurrentLink(key: StringKey): Promise<void> {
    await expect(
      this.page
        .getByRole('navigation', { name: this.string('a11y.mainNavigation') })
        .getByRole('link', { name: this.string(key), exact: true })
    ).toHaveAttribute('aria-current', 'page');
  }

  private sitePage(): Promise<SitePage> {
    // The user is still on the same page: re-verify it without reloading
    return SitePage.returnTo(this.page, this.locale, this.route);
  }

  async closeWithEscape(): Promise<SitePage> {
    await expect(this.closeButton).toBeVisible();
    await this.page.keyboard.press('Escape');
    await expect(this.closeButton, 'Escape should close the menu').toBeHidden({ timeout: MODAL_TIMEOUT });
    await expect(this.menuButton, 'focus should return to the Menu button').toBeFocused();
    return this.sitePage();
  }

  async closeWithButton(): Promise<SitePage> {
    await expect(this.closeButton).toBeVisible();
    await this.closeButton.click();
    await expect(this.closeButton, 'the Close menu button should close the menu').toBeHidden({ timeout: MODAL_TIMEOUT });
    await expect(this.menuButton, 'focus should return to the Menu button').toBeFocused();
    return this.sitePage();
  }

  /** A click on the page outside the panel closes it (light dismiss). */
  async closeByClickingOutside(): Promise<SitePage> {
    await expect(this.closeButton).toBeVisible();
    const viewport = this.page.viewportSize()!;
    await this.page.mouse.click(viewport.width / 2, viewport.height - 10);
    await expect(this.closeButton, 'a click outside should close the menu').toBeHidden({ timeout: MODAL_TIMEOUT });
    return this.sitePage();
  }

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const serious = results.violations
      .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
      .map(violation => ({ rule: violation.id, targets: violation.nodes.map(node => node.target.join(' ')) }));
    // axe returns its findings in one analysis; there is no element to poll
    expect(serious, 'serious or critical violations with the menu open').toEqual([]);
  }

  async saveScreenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, clip: { x: 0, y: 0, width: this.page.viewportSize()!.width, height: 420 } });
  }
}
