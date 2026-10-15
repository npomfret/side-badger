import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';

/** How the page animates: its own choice, the forced fallback, or none at all */
export type SceneEngine = 'native' | 'stages' | 'static';

/** The scene headings in page order: the h1, then one h2 per scene (the last scene has two) */
const SCENE_TITLE_KEYS: StringKey[] = [
  'home.group.title',
  'home.expenses.title',
  'home.currency.title',
  'home.tangle.title',
  'home.settle.title',
  'home.worlds.title',
  'home.trust.title',
  'home.pricing.title',
  'home.cta.title',
];

/** The nine scene sections (regions named by their heading), in page order */
const REGION_TITLE_KEYS: StringKey[] = [
  'home.hero.title',
  'home.group.title',
  'home.expenses.title',
  'home.currency.title',
  'home.tangle.title',
  'home.settle.title',
  'home.worlds.title',
  'home.trust.title',
  'home.pricing.title',
];

/** Phrases the homepage must never show (site plan approved substitutions, "Instead of" column) */
const BANNED_PHRASES = [
  'free forever',
  'unlimited',
  'zero tracking',
  'no tracking',
  'privacy first',
  'your data stays yours',
  'no catch',
  'single tap',
  'one tap',
  'fewest',
  'minimise',
  'real-time',
  'live rates',
  'any currency',
];

/**
 * The homepage. Expected text is the English key (pseudoized for the pseudo-locales), so every
 * check names what the visitor should read. `navigateTo` is the only way in. P41 reruns the spec
 * in real locales by extending the locale type and `strings.ts`.
 */
export class HomePage {
  private readonly requested: string[] = [];

  private constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale,
    private readonly engine: SceneEngine
  ) {
    page.on('request', request => this.requested.push(request.url()));
  }

  /**
   * Open the homepage. `engine` says which motion engine the page must settle on: `native` (the
   * default), `stages` (opened with `?scenes=stages`, the fallback) or `static` (the caller turned
   * reduced motion on).
   */
  static async navigateTo(page: Page, locale: ShellLocale, engine: SceneEngine = 'native'): Promise<HomePage> {
    const home = new HomePage(page, locale, engine);
    await page.goto(pathFor(locale, '') + (engine === 'stages' ? '?scenes=stages' : ''));
    await home.verifyLoaded();
    return home;
  }

  // ----- locators, built fresh on every use -----

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  private get h1(): Locator {
    return this.main.getByRole('heading', { level: 1 });
  }

  private region(titleKey: StringKey): Locator {
    return this.main.getByRole('region', { name: this.string(titleKey), exact: true });
  }

  private get registerLinks(): Locator {
    return this.main.getByRole('link', { name: this.string('home.hero.ctaPrimary') });
  }

  private get mainLinks(): Locator {
    return this.main.getByRole('link');
  }

  private get settleRegion(): Locator {
    return this.region('home.settle.title');
  }

  // ----- the page -----

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(new RegExp(`${pathFor(this.locale, '')}(\\?scenes=stages)?$`), {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(this.page.locator('html'), 'text direction').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
    await expect(this.h1, 'the hero heading').toHaveText(this.string('home.hero.title'), { timeout: ELEMENT_TIMEOUT });
    // The head script sets the engine before first paint; the controller confirms it
    await expect(this.page.locator('html'), `the ${this.engine} motion engine`).toHaveAttribute(
      'data-scene-engine',
      this.engine
    );
  }

  // ----- structure -----

  async expectOneH1(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 }), 'exactly one h1 on the page').toHaveCount(1);
    await expect(this.h1, 'the h1 is the hero heading').toHaveText(this.string('home.hero.title'));
  }

  async expectScenesInOrder(): Promise<void> {
    await expect(this.main.getByRole('heading', { level: 2 }), 'one h2 per scene, in order, two in the last').toHaveText(
      SCENE_TITLE_KEYS.map(key => this.string(key))
    );
    for (const key of REGION_TITLE_KEYS) {
      await expect(this.region(key), `the "${this.string(key)}" scene`).toHaveCount(1);
    }
    // evaluateAll reads the regions in document order; the names are checked whole, not by position
    const names = await this.main.getByRole('region').evaluateAll(regions =>
      regions.map(region => document.getElementById(region.getAttribute('aria-labelledby') ?? '')?.textContent?.trim())
    );
    expect(names, 'region names in page order').toEqual(REGION_TITLE_KEYS.map(key => this.string(key)));
  }

  async expectJsonLdApplication(): Promise<void> {
    const types = await this.page
      .locator('script[type="application/ld+json"]')
      .evaluateAll(scripts => scripts.map(script => script.textContent ?? ''));
    expect(types.join('\n'), 'the homepage carries a SoftwareApplication block').toContain('SoftwareApplication');
  }

  async expectNoBannedPhrases(): Promise<void> {
    const body = (await this.page.locator('body').innerText()).toLowerCase();
    // Pseudo-locale text is accented, so only the English page can show these; check every page the same way
    for (const phrase of BANNED_PHRASES) {
      expect(body, `the page never says "${phrase}"`).not.toContain(phrase);
    }
  }

  // ----- links -----

  /** Every link in the page body goes somewhere on this site; launch links count a click and say nofollow */
  async expectLinksStayOnTheSite(): Promise<void> {
    await expect(this.registerLinks, 'the hero and the final sign-up button').toHaveCount(2);
    const links = await this.mainLinks.evaluateAll(anchors =>
      anchors.map(anchor => ({
        href: anchor.getAttribute('href') ?? '',
        rel: anchor.getAttribute('rel') ?? '',
        name: (anchor.textContent ?? '').trim(),
      }))
    );
    expect(links.length, 'the page has links in its body').toBeGreaterThan(8);
    const offenders = links.filter(link => !(link.href.startsWith('/') || link.href.startsWith('#')));
    expect(offenders, 'links that leave the site (the app is reached through /go/)').toEqual([]);
    const launch = links.filter(link => link.href.startsWith('/go/'));
    expect(
      launch.filter(link => !link.rel.includes('nofollow')),
      'launch links without nofollow'
    ).toEqual([]);
    expect(
      launch.map(link => new URL(link.href, 'http://x').searchParams.get('from')),
      'every launch link names its page'
    ).not.toContain(null);
    const positions = launch.map(link => new URL(link.href, 'http://x').searchParams.get('cta'));
    expect(positions, 'the hero button counts its own position').toContain('hero');
    expect(positions, 'the final button counts its own position').toContain('final');
    expect(
      launch.filter(link => link.href.startsWith('/go/register/')).map(link => new URL(link.href, 'http://x').searchParams.get('cta')),
      'sign-up buttons are exactly the hero and the final one'
    ).toEqual(['hero', 'final']);
  }

  /**
   * Tab from the heading through the page body: every link in it takes focus once, in document
   * order, with a visible focus ring, and the page scrolls it into view.
   */
  async expectKeyboardReachesEveryLink(): Promise<void> {
    await expect(this.h1, 'the page heading').toBeVisible();
    const expected = await this.mainLinks.evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href')));
    const stops = await this.main.evaluate(main =>
      main.querySelectorAll('a[href], button, summary, [tabindex]:not([tabindex="-1"])').length
    );
    await this.page.evaluate(() => {
      const log: Array<{ href: string; ring: boolean }> = [];
      (window as unknown as { __focusLog: typeof log }).__focusLog = log;
      document.addEventListener('focusin', event => {
        const link = (event.target as HTMLElement).closest('main a[href]') as HTMLElement | null;
        if (!link) return;
        const style = getComputedStyle(link);
        log.push({
          href: link.getAttribute('href') ?? '',
          ring: link.matches(':focus-visible') && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        });
      });
    });
    await this.h1.click();
    for (let i = 0; i < stops + 2; i++) {
      await this.page.keyboard.press('Tab');
      // Focus scrolls the page smoothly: wait for the focused body element to be on screen before moving on
      await expect
        .poll(
          () =>
            this.page.evaluate(() => {
              const el = document.activeElement;
              if (!el || !el.closest('main')) return 'outside the page body';
              const rect = el.getBoundingClientRect();
              return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
                ? 'on screen'
                : `off screen: ${(el.getAttribute('href') ?? el.textContent ?? '').trim().slice(0, 40)}`;
            }),
          { message: 'the focused element comes into view', timeout: 3 * ELEMENT_TIMEOUT }
        )
        .not.toMatch(/^off screen/);
    }
    await expect
      .poll(() => this.page.evaluate(() => (window as unknown as { __focusLog: Array<{ href: string }> }).__focusLog.map(e => e.href)), {
        message: 'Tab reaches every body link once, in document order',
        timeout: ELEMENT_TIMEOUT,
      })
      .toEqual(expected);
    const log = await this.page.evaluate(
      () => (window as unknown as { __focusLog: Array<{ href: string; ring: boolean }> }).__focusLog
    );
    expect(
      log.filter(entry => !entry.ring).map(entry => entry.href),
      'links focused without a visible focus ring'
    ).toEqual([]);
  }

  // ----- motion -----

  /** Nothing loads canvas-confetti until something celebrates */
  async expectNoConfettiAtLoad(): Promise<void> {
    expect(this.requested.filter(url => /confetti/.test(url)), 'confetti requests at load').toEqual([]);
  }

  /** A fast scroll past the settle scene still celebrates, and the confetti chunk loads on demand */
  async flickThroughSettleAndExpectConfetti(): Promise<void> {
    await expect(this.settleRegion, 'the settle scene').toBeAttached();
    // Start with the scene's top at the top of the viewport, then jump to 30 % of a viewport above its
    // bottom in one wheel event: far past the confetti point, with the scene still on screen
    await this.settleRegion.evaluate(scene => scene.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect.poll(() => this.settleRegion.evaluate(scene => Math.round(scene.getBoundingClientRect().top)), { message: 'the settle scene starts at the top of the viewport, below the header' }).toBeLessThanOrEqual(120);
    expect(this.requested.filter(url => /confetti/.test(url)), 'confetti before the scene finishes').toEqual([]);
    const sceneHeight = await this.settleRegion.evaluate(scene => scene.getBoundingClientRect().height);
    const viewportHeight = this.page.viewportSize()?.height ?? 800;
    await this.page.mouse.wheel(0, sceneHeight - 0.3 * viewportHeight);
    await expect
      .poll(() => this.requested.filter(url => /confetti/.test(url)).length, {
        message: 'confetti loads once the settle scene has played',
        timeout: ELEMENT_TIMEOUT,
      })
      .toBeGreaterThan(0);
  }

  /** Reduced motion and the fallback keep every scene's content: nothing is hidden at rest */
  async expectEverySceneReadable(): Promise<void> {
    for (const key of REGION_TITLE_KEYS) {
      await expect(this.region(key).getByRole('heading', { name: this.string(key), exact: true }), `the heading of "${this.string(key)}"`).toBeVisible();
    }
  }

  // ----- whole-page checks -----

  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            const offenders: string[] = [];
            if (document.documentElement.scrollWidth > width) offenders.push('<html> scrolls sideways');
            for (const el of document.querySelectorAll<HTMLElement>('main *')) {
              if (el.closest('.sr-only, [data-scene-track], .worlds__viewport, .worlds__track')) continue;
              // Scene props wait off to the side until their animation brings them in (the page clips them)
              let animated = false;
              for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
                const style = getComputedStyle(node);
                if (node.hasAttribute('data-anim') || style.translate !== 'none' || style.transform !== 'none') animated = true;
              }
              if (animated) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                if (getComputedStyle(el).position === 'fixed') continue;
                if (el.closest('svg, [aria-hidden="true"]')) continue;
                offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
              }
            }
            return offenders.slice(0, 5);
          }),
        { message: 'nothing on the page should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  /** The page has stopped transitioning (the fallback eases scenes into place on load) */
  private async waitForTransitionsToEnd(): Promise<void> {
    await expect
      .poll(() => this.page.evaluate(() => document.getAnimations().filter(a => a instanceof CSSTransition && a.playState === 'running').length), {
        message: 'CSS transitions have finished',
        timeout: ELEMENT_TIMEOUT,
      })
      .toBe(0);
  }

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    await this.waitForTransitionsToEnd();
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const serious = results.violations
      .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
      .map(violation => ({
        rule: violation.id,
        targets: violation.nodes.map(node => node.target.join(' ')),
      }));
    // axe returns its findings in one analysis; there is no element to poll
    expect(serious, 'serious or critical accessibility violations').toEqual([]);
  }
}
