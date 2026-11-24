import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ELEMENT_TIMEOUT, MODAL_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';
import { expectStubPolicyShown, stubPolicyApi } from './policyApi';
import { auditAnimationWait, expectAnimationsSettled } from './animations';
import { setBrowserTextSize } from './textSize';

/** The registry's launch-counter page id for each route the shell tests visit */
export type ShellRoute = 'pricing' | 'privacy' | 'terms' | 'cookies' | '';

/**
 * Any built page of the site: the header, the mobile menu, the footer and the breadcrumbs are the
 * same everywhere, so one page object covers them. `navigateTo` is the only way in.
 */
/**
 * Lists the visible elements matching `selector` whose box crosses `edges`: the viewport, or the box
 * of the element matching `edges` (an empty list means everything fits). Text kept for screen
 * readers is clipped to nothing, whatever its own box says, so it is skipped, as is anything inside
 * an element matching `skip`. Runs in the page.
 */
function elementsOutside(page: Page, check: { selector: string; edges: string; skip: string }): Promise<string[]> {
  return page.evaluate(({ selector, edges, skip }) => {
    const boundsEl = edges === 'viewport' ? null : document.querySelector(edges);
    if (edges !== 'viewport' && !boundsEl) return [`no ${edges} to measure against`];
    const bounds = boundsEl ? boundsEl.getBoundingClientRect() : { left: 0, right: document.documentElement.clientWidth };
    const clippedAway = (el: Element): boolean => {
      for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).clip !== 'auto') return true;
      }
      return false;
    };
    const offenders: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.closest(skip) || clippedAway(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
        offenders.push(`${el.tagName.toLowerCase()}.${el.className} [${Math.round(rect.left)}..${Math.round(rect.right)}] of [${Math.round(bounds.left)}..${Math.round(bounds.right)}]`);
      }
    }
    return offenders;
  }, check);
}

export class SitePage {
  private constructor(
    protected readonly page: Page,
    protected readonly locale: ShellLocale,
    protected readonly route: ShellRoute
  ) {}

  static async navigateTo(page: Page, locale: ShellLocale, route: ShellRoute): Promise<SitePage> {
    const site = new SitePage(page, locale, route);
    await stubPolicyApi(page); // the policy pages load their text from the app API
    await page.goto(pathFor(locale, route));
    await site.verifyLoaded();
    return site;
  }

  /** As `navigateTo`, with the browser's text size set first (a visitor's "larger text" setting). */
  static async navigateToWithTextSize(page: Page, locale: ShellLocale, route: ShellRoute, textSizePx: number): Promise<SitePage> {
    await setBrowserTextSize(page, textSizePx);
    return SitePage.navigateTo(page, locale, route);
  }

  // ----- locators, built fresh on every use -----

  private get christmasLights(): Locator {
    // Decorative, aria-hidden art has no perceivable role or name; keep this lookup in the driver.
    return this.page.locator('.christmas-lights');
  }

  async expectChristmasLights(visible: boolean): Promise<void> {
    await auditAnimationWait(`Christmas lights are ${visible ? 'visible' : 'hidden'}`, () =>
      visible ? expect(this.christmasLights).toBeVisible() : expect(this.christmasLights).toBeHidden());
    if (!visible) return;
    await auditAnimationWait('the lights span the page above the header', () => expect.poll(async () => {
      const lights = await this.christmasLights.boundingBox();
      const header = await this.banner.boundingBox();
      const viewport = this.page.viewportSize();
      return !!lights && !!header && !!viewport && lights.x === 0 && lights.y === 0 &&
        lights.width === viewport.width && lights.height > 0 && lights.y + lights.height <= header.y;
    }, { timeout: ELEMENT_TIMEOUT }).toBe(true));
  }

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

  /** The Sign in link's name: its text, then the visually hidden "External link" */
  private get launchLinkName(): string {
    return `${this.string('header.signIn')} ${this.string('a11y.externalLink')}`;
  }

  private get launchLink(): Locator {
    return this.banner.getByRole('link', { name: this.string('header.signIn') });
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

  /**
   * The Sign in link's tooltip (Tooltip.astro), shown on phones where the link shows only its icon.
   * Departs from rule 2: the tooltip is aria-hidden (the link's name already says it) and the same
   * text is inside the link, visually hidden, so no role or text finds it alone. The anchor and
   * text carry data-tooltip and data-tooltip-text, which the site's own tooltip script uses.
   */
  private get launchTooltip(): Locator {
    return this.banner
      .locator('[data-tooltip]')
      .filter({ has: this.page.getByRole('link', { name: this.string('header.signIn') }) })
      .locator('[data-tooltip-text]');
  }

  /** As for launchTooltip, the tooltip is aria-hidden to avoid repeating the button's name. */
  private get menuTooltip(): Locator {
    return this.banner.locator('[data-tooltip]')
      .filter({ has: this.page.getByRole('button', { name: this.string('nav.menu'), exact: true }) })
      .locator('[data-tooltip-text]');
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
    if (this.route === 'privacy' || this.route === 'terms' || this.route === 'cookies') await expectStubPolicyShown(this.page);
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

  /**
   * The page's h1 starts on the site's one content column: the same inline-start edge as the
   * footer's content (both `.container`). Any page that re-implements the column fails here.
   */
  async expectHeadingOnContentColumn(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const rtl = document.documentElement.dir === 'rtl';
            const column = document.querySelector('footer .container');
            const heading = document.querySelector('main h1');
            if (!column) return 'no footer .container on the page';
            if (!heading) return 'no h1 in main';
            const box = column.getBoundingClientRect();
            const style = getComputedStyle(column);
            const columnStart = rtl ? box.right - parseFloat(style.paddingRight) : box.left + parseFloat(style.paddingLeft);
            const h1 = heading.getBoundingClientRect();
            const offset = Math.round(Math.abs((rtl ? h1.right : h1.left) - columnStart));
            return offset <= 1 ? 'on the column' : `the h1 starts ${offset}px off the column`;
          }),
        { message: 'the h1 starts on the content column', timeout: ELEMENT_TIMEOUT }
      )
      .toBe('on the column');
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

  /** Open the page with a regional variant already chosen (stored as a visitor's earlier choice) */
  static async navigateWithStoredLanguage(page: Page, locale: ShellLocale, route: ShellRoute, stored: string): Promise<SitePage> {
    await page.addInitScript(choice => localStorage.setItem('preferred-locale', choice), stored);
    return SitePage.navigateTo(page, locale, route);
  }

  /**
   * Phones: the header's icon-only controls (Sign in, the language flag) show their names as
   * tooltips on hover and on keyboard focus, and Escape closes them.
   */
  async expectHeaderTooltipsOnHoverAndFocus(): Promise<void> {
    await expect(this.launchTooltip, 'the Sign in tooltip before hovering').toBeHidden();
    await this.launchLink.hover();
    await expect(this.launchTooltip, 'the Sign in tooltip on hover').toBeVisible();
    await expect(this.launchTooltip).toHaveText(this.string('header.signIn'));
    await this.page.getByRole('main').hover();
    await expect(this.launchTooltip, 'the Sign in tooltip once the pointer leaves').toBeHidden();
    await this.homeLink.focus();
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await expect(this.launchLink, 'Tab reaches Sign in after the language button').toBeFocused();
    await expect(this.launchTooltip, 'the Sign in tooltip on keyboard focus').toBeVisible();
    await this.page.keyboard.press('Escape');
    await expect(this.launchTooltip, 'Escape closes the Sign in tooltip').toBeHidden();
    await this.languageSwitcher.expectTooltipOnHoverAndFocus();
    await this.expectMenuTooltipOnHoverAndFocus();
  }

  async expectMenuTooltipOnHoverAndFocus(): Promise<void> {
    await this.page.getByRole('main').hover();
    await this.homeLink.focus();
    await auditAnimationWait('Menu tooltip starts hidden', () => expect(this.menuTooltip).toBeHidden());
    await this.menuButton.hover();
    await auditAnimationWait('Menu tooltip opens on hover', () => expect(this.menuTooltip).toBeVisible());
    await auditAnimationWait('Menu tooltip matches its accessible name', () => expect(this.menuTooltip).toHaveText(this.string('nav.menu')));
    await this.page.keyboard.press('Escape');
    await auditAnimationWait('Escape closes the Menu tooltip', () => expect(this.menuTooltip).toBeHidden());
    await this.page.getByRole('main').hover();
    await this.menuButton.focus();
    await auditAnimationWait('Menu tooltip opens on keyboard focus', () => expect(this.menuTooltip).toBeVisible());
    await this.menuButton.press('Enter');
    await auditAnimationWait('the native menu opens', () => expect(this.mainNav).toBeVisible());
    await auditAnimationWait('Menu tooltip stays hidden while the menu is open', () => expect(this.menuTooltip).toBeHidden());
    await this.page.keyboard.press('Escape');
    await auditAnimationWait('Escape closes the native menu', () => expect(this.mainNav).toBeHidden());
  }

  async expectNoMenuTooltipWithVisibleLabel(): Promise<void> {
    await this.menuButton.hover();
    await auditAnimationWait('Menu tooltip stays hidden where its text shows on hover', () => expect(this.menuTooltip).toBeHidden());
    await this.page.getByRole('main').hover();
    await this.menuButton.focus();
    await auditAnimationWait('Menu tooltip stays hidden where its text shows on focus', () => expect(this.menuTooltip).toBeHidden());
  }

  /** Desktop: the header's controls show their text, so no tooltip repeats it */
  async expectNoHeaderTooltips(): Promise<void> {
    await this.launchLink.hover();
    await expect(this.launchTooltip, 'no Sign in tooltip where the text shows').toBeHidden();
    await this.launchLink.focus();
    await expect(this.launchTooltip, 'no Sign in tooltip on focus where the text shows').toBeHidden();
    await this.languageSwitcher.expectNoTooltip();
  }

  /** The language button's tooltip stays closed while its menu is open */
  async expectLanguageTooltipClosedWhileMenuOpen(): Promise<void> {
    await this.languageSwitcher.expectTooltipClosedWhileOpen();
  }

  /** The language button's tooltip (phones) names the language shown, `name` exactly */
  async expectLanguageTooltip(name: string): Promise<void> {
    await this.languageSwitcher.expectTooltipOnHoverAndFocus(name);
  }

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

  /**
   * With large text on a narrow phone the bar keeps the logo, the language button and the Menu
   * button, every visible part of it inside the bar, and drops its Sign in link (the menu holds it).
   */
  async expectCompactHeaderFits(): Promise<void> {
    await this.expectPhoneHeader();
    await expect(this.homeLink, 'the logo link').toBeVisible();
    await this.languageSwitcher.expectButtonVisible();
    // The bar's link and the closed menu's are both in the page, out of the accessibility tree
    await expect(this.banner.getByRole('link', { name: this.launchLinkName, exact: true, includeHidden: true }), 'Sign in links in the header').toHaveCount(2);
    await expect(this.banner.getByRole('link', { name: this.launchLinkName, exact: true }), 'the bar drops its Sign in link').toHaveCount(0);
    await expect
      .poll(
        () => elementsOutside(this.page, { selector: 'header *', edges: 'header', skip: '.skip-link, [popover], [data-tooltip-text], .language-dropdown' }),
        { message: 'every visible part of the header should sit inside the bar', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
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

  /** The links under a footer group go to exactly these routes, in order (content pages carry localized titles). */
  async expectFooterLinkTargets(groupKey: StringKey, routes: readonly string[]): Promise<void> {
    const group = this.footer.getByRole('list', { name: this.string(groupKey), exact: true });
    await expect
      .poll(() => group.getByRole('link').evaluateAll(links => links.map(a => a.getAttribute('href'))), {
        message: `footer link targets under "${this.string(groupKey)}"`,
      })
      .toEqual(routes.map(route => pathFor(this.locale, route)));
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
          Promise.all([
            this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
            elementsOutside(this.page, { selector: 'header *, footer *, .breadcrumbs *', edges: 'viewport', skip: '.skip-link' }),
          ]).then(([scrolls, offenders]) => (scrolls ? ['<html> scrolls sideways', ...offenders] : offenders)),
        { message: 'nothing in the shell should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  /** axe reports no serious or critical violations on the page as it now stands. */
  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    await expectAnimationsSettled(this.page);
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

  /**
   * The menu's labelled Sign in link, standing in for the bar's. Only for a bar that has dropped its
   * own (`SitePage.expectCompactHeaderFits`): that one is then out of the accessibility tree, so the
   * name finds the menu's alone.
   */
  async expectSignInLinkReplacesTheBars(): Promise<void> {
    // Its name is "Sign in" followed by the visually hidden "External link"
    const name = `${this.string('header.signIn')} ${this.string('a11y.externalLink')}`;
    await expect(this.page.getByRole('link', { name, exact: true }), 'Sign in in the open menu').toBeVisible();
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
    await expectAnimationsSettled(this.page);
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
