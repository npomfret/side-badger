import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { allPages, type PageDef } from '../../src/site/pages';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, SHELL_LOCALES, text, type ShellLocale, type StringKey } from './strings';

/** Every registry page (published, unpublished and preview-only) that exists in a locale */
export function pagesIn(locale: ShellLocale): readonly PageDef[] {
  return allPages().filter(page => page.locales === 'all' || (page.locales as readonly string[]).includes(locale));
}

export { SHELL_LOCALES };

const FOOTER_GROUPS: ReadonlyArray<{ group: 'product' | 'useCases' | 'legal'; heading: StringKey }> = [
  { group: 'product', heading: 'footer.product' },
  { group: 'useCases', heading: 'footer.useCases' },
  { group: 'legal', heading: 'footer.legal' },
];

interface FocusEntry {
  label: string;
  inMain: boolean;
  ring: boolean;
}

/**
 * Any page of the site, whatever its layout: the whole-page checks of P38 (one h1, overflow, axe,
 * keyboard, links, launch links, navigation and footer). `navigateTo` is the only way in.
 */
export class SiteAudit {
  private constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale,
    private readonly def: PageDef
  ) {}

  static async navigateTo(page: Page, locale: ShellLocale, def: PageDef): Promise<SiteAudit> {
    const audit = new SiteAudit(page, locale, def);
    await page.goto(audit.localized(def));
    await audit.verifyLoaded();
    return audit;
  }

  /** The localized URL of a registry page */
  private localized(def: PageDef): string {
    return pathFor(this.locale, def.path === '/' ? '' : def.path);
  }

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  // ----- locators, built fresh on every use -----

  private get h1(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  private get banner(): Locator {
    return this.page.getByRole('banner');
  }

  private get footer(): Locator {
    return this.page.getByRole('contentinfo');
  }

  private get mainNav(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.mainNavigation') });
  }

  private get menuButton(): Locator {
    return this.banner.getByRole('button', { name: this.string('nav.menu'), exact: true });
  }

  private get breadcrumb(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.breadcrumb'), exact: true });
  }

  private get internalLinks(): Locator {
    return this.page.locator('a[href^="/"], a[href^="#"]');
  }

  // ----- the page -----

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(this.localized(this.def), { timeout: NAVIGATION_TIMEOUT });
    await expect(this.page.locator('html'), 'text direction').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
    await expect(this.banner, `the site header of ${this.localized(this.def)}`).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.footer, 'the site footer').toBeVisible({ timeout: ELEMENT_TIMEOUT });
  }

  async expectOneH1(): Promise<void> {
    await expect(this.h1, `exactly one h1 on ${this.localized(this.def)}`).toHaveCount(1);
    await expect(this.h1, 'the h1 has text').not.toHaveText('');
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            const offenders: string[] = [];
            if (document.documentElement.scrollWidth > width) offenders.push('<html> scrolls sideways');
            for (const el of document.querySelectorAll<HTMLElement>('body *')) {
              if (el.closest('.sr-only, .skip-link')) continue;
              if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              // Content inside a scroll container of its own may extend past it; only the page counts
              let clipped = false;
              for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                const overflowX = getComputedStyle(parent).overflowX;
                if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden' || overflowX === 'clip') {
                  clipped = true;
                  break;
                }
              }
              if (clipped) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                offenders.push(
                  `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} [${Math.round(rect.left)}..${Math.round(rect.right)}] of ${width}`
                );
              }
            }
            return offenders.slice(0, 8);
          }),
        { message: 'nothing should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  /** axe reports no serious or critical violations on the page as it now stands */
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

  /** Scroll to the foot of the page; the header's state changes once the page has scrolled */
  async scrollToFoot(): Promise<void> {
    await this.footer.scrollIntoViewIfNeeded();
    await expect(this.footer, 'the footer is on screen').toBeInViewport();
    await expect
      .poll(() => this.page.evaluate(() => window.scrollY), { message: 'the page has scrolled' })
      .toBeGreaterThan(0);
  }

  // ----- keyboard -----

  /**
   * Tab from the top of the page through everything: every visible link and control takes focus
   * and shows a ring, and the page body is reached.
   */
  async expectKeyboardReachesEverything(): Promise<void> {
    const expected = await this.page.evaluate(() => {
      const selector =
        'a[href], button:not([disabled]), summary, input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
      const label = (el: Element) =>
        `${el.tagName.toLowerCase()} ${(el.getAttribute('href') ?? el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}`;
      return Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter(el => el.checkVisibility({ checkVisibilityCSS: true }) && el.tabIndex >= 0 && !el.closest('[inert]'))
        .map(label);
    });
    expect(expected.length, 'the page has focusable controls').toBeGreaterThan(3);
    const bodyControls = await this.page.evaluate(
      () => Array.from(document.querySelectorAll<HTMLElement>('main a[href], main button, main summary')).filter(el => el.checkVisibility({ checkVisibilityCSS: true })).length
    );

    await this.page.evaluate(() => {
      const w = window as unknown as { __log: FocusEntry[] };
      w.__log = [];
      document.addEventListener('focusin', event => {
        const el = event.target as HTMLElement;
        const style = getComputedStyle(el);
        const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
        const shadow = style.boxShadow !== 'none';
        w.__log.push({
          label: `${el.tagName.toLowerCase()} ${(el.getAttribute('href') ?? el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}`,
          inMain: !!el.closest('main'),
          ring: el.matches(':focus-visible') && (outline || shadow),
        });
      });
    });

    // One Tab per control, plus two spare; each waits for focus to move
    for (let i = 0; i < expected.length + 2; i++) {
      await this.page.evaluate(() => {
        (window as unknown as { __prev: Element | null }).__prev = document.activeElement;
      });
      await this.page.keyboard.press('Tab');
      await this.page.waitForFunction(
        () => document.activeElement !== (window as unknown as { __prev: Element | null }).__prev,
        undefined,
        { timeout: ELEMENT_TIMEOUT }
      );
    }

    const read = () => this.page.evaluate(() => (window as unknown as { __log: FocusEntry[] }).__log);
    await expect
      .poll(
        async () => {
          const seen = new Set((await read()).map(entry => entry.label));
          return expected.filter(label => !seen.has(label));
        },
        { message: 'controls Tab never reached', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
    await expect
      .poll(async () => (await read()).filter(entry => !entry.ring).map(entry => entry.label), {
        message: 'controls focused without a visible focus ring',
        timeout: ELEMENT_TIMEOUT,
      })
      .toEqual([]);
    // A page whose body is plain text (the policies) has nothing in it to focus
    if (bodyControls > 0) {
      await expect
        .poll(async () => (await read()).some(entry => entry.inMain), { message: 'Tab reaches the page body' })
        .toBe(true);
    }
  }

  // ----- links -----

  /**
   * Every internal link resolves (200, no redirect) and every in-page anchor has a target.
   * `/go/` links are the launch counter, which only nginx serves, so they are checked separately.
   */
  async expectInternalLinksResolve(): Promise<void> {
    await expect.poll(() => this.internalLinks.count(), { message: 'the page has internal links' }).toBeGreaterThan(3);
    const hrefs = await this.internalLinks.evaluateAll(anchors => anchors.map(a => a.getAttribute('href') ?? ''));
    const targets = [
      ...new Set(hrefs.filter(href => !href.startsWith('/go/')).map(href => href.split('#')[0])),
    ].filter(Boolean);
    const broken: string[] = [];
    for (const target of targets) {
      const response = await this.page.request.get(target, { maxRedirects: 0 });
      if (response.status() !== 200) broken.push(`${target} -> ${response.status()}`);
    }
    expect(broken, 'internal links that do not return 200').toEqual([]);

    const hashes = [...new Set(hrefs.map(href => href.slice(href.indexOf('#'))).filter(hash => hash.length > 1 && hash.startsWith('#')))];
    const missing = await this.page.evaluate(
      list => list.filter(hash => !document.getElementById(decodeURIComponent(hash.slice(1)))),
      hashes
    );
    expect(missing, 'anchors with no target on the page').toEqual([]);
  }

  /** Links to the app go through the /go/ counter, with nofollow, never straight to the app */
  async expectLaunchLinksGoThroughCounter(): Promise<void> {
    const links = await this.page
      .locator('a[href]')
      .evaluateAll(anchors => anchors.map(a => ({ href: a.getAttribute('href') ?? '', rel: a.getAttribute('rel') ?? '' })));
    const launch = links.filter(link => link.href.startsWith('/go/'));
    expect(launch.length, 'the header carries a launch link').toBeGreaterThan(0);
    expect(
      {
        direct: links.filter(link => /^https?:\/\/(app|staging)\.sidebadger\.me/.test(link.href)).map(l => l.href),
        malformed: launch.filter(link => !/^\/go\/(app|register)\/\?/.test(link.href)).map(l => l.href),
        noNofollow: launch.filter(link => !link.rel.includes('nofollow')).map(l => l.href),
        unnamed: launch.filter(link => !new URL(link.href, 'http://x').searchParams.get('from')).map(l => l.href),
      },
      'links to the app'
    ).toEqual({ direct: [], malformed: [], noNofollow: [], unnamed: [] });
  }

  // ----- navigation and footer: the published structure -----

  /** The header (or, on a phone, the open menu) links exactly to the published pages, in order */
  async expectNavigationExposesPublishedStructure(phone: boolean): Promise<void> {
    const expected = pagesIn(this.locale)
      .filter(page => page.published && page.nav)
      .sort((a, b) => a.nav!.order - b.nav!.order)
      .map(page => this.localized(page));
    if (phone) {
      await expect(this.mainNav, 'the menu is closed on a phone').toBeHidden();
      await this.menuButton.click();
    }
    await expect(this.mainNav, 'the main navigation').toBeVisible();
    await expect
      .poll(() => this.mainNav.getByRole('link').evaluateAll(links => links.map(a => a.getAttribute('href'))), {
        message: 'header links are the published pages with a nav entry',
        timeout: ELEMENT_TIMEOUT,
      })
      .toEqual(expected);
    if (phone) {
      await this.page.keyboard.press('Escape');
      await expect(this.mainNav, 'Escape closes the menu').toBeHidden();
    }
  }

  async expectFooterExposesPublishedStructure(): Promise<void> {
    const published = pagesIn(this.locale).filter(page => page.published && page.footer);
    const groups = FOOTER_GROUPS.map(({ group, heading }) => ({
      heading: this.string(heading),
      links: published
        .filter(page => page.footer!.group === group)
        .sort((a, b) => a.footer!.order - b.footer!.order)
        .map(page => this.localized(page)),
    })).filter(group => group.links.length > 0);

    await expect(this.footer.getByRole('heading'), 'footer headings').toHaveText(groups.map(group => group.heading));
    for (const group of groups) {
      await expect
        .poll(
          () =>
            this.footer
              .getByRole('list', { name: group.heading, exact: true })
              .getByRole('link')
              .evaluateAll(links => links.map(a => a.getAttribute('href'))),
          { message: `footer links under "${group.heading}"`, timeout: ELEMENT_TIMEOUT }
        )
        .toEqual(group.links);
    }
  }

  /** A page with a parent shows a breadcrumb that links to it; a top-level page has none */
  async expectBreadcrumbMatchesRegistry(): Promise<void> {
    const parent = this.def.parent ? allPages().find(page => page.id === this.def.parent) : undefined;
    if (!parent) {
      await expect(this.breadcrumb, 'no breadcrumb on a top-level page').toHaveCount(0);
      return;
    }
    await expect(this.breadcrumb, 'the breadcrumb').toBeVisible();
    await expect(
      this.breadcrumb.locator(`a[href="${this.localized(parent)}"]`),
      'the breadcrumb links to the parent page'
    ).toHaveCount(1);
  }
}
