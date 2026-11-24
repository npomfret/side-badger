import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';
import { auditAnimationWait, expectAnimationsSettled } from './animations';
import { INTL } from './layoutsFixtures';
import { setBrowserTextSize } from './textSize';

/**
 * Runs in the page before its scripts: logs every stage a timed (`data-play="once"`) scene is set to.
 * A timed stage lasts well under a second, so sampling the live attribute could miss one on a slow
 * runner; the log keeps the whole sequence for the page object to assert once the pass is over.
 */
function recordTimedStages(): void {
  const log: string[] = [];
  (window as unknown as { __timedStages: string[] }).__timedStages = log;
  new MutationObserver(records => {
    for (const record of records) {
      const scene = record.target as HTMLElement;
      const stage = scene.dataset.stage ?? '';
      // Only changes count: the controller sets stage 0 both while pending and when the pass starts
      if (scene.dataset.play === 'once' && stage !== record.oldValue) log.push(stage);
    }
  }).observe(document, { subtree: true, attributeFilter: ['data-stage'], attributeOldValue: true });
}

/** The taxi fare, ¥4,200, in the locale's own digits like the home scenes' formatter (`format.ts`) */
function heroTaxiFare(locale: ShellLocale): string {
  return new Intl.NumberFormat(INTL[locale], { style: 'currency', currency: 'JPY' }).format(4200);
}

/** The taxi receipt's date (12 April, no year) as the hero's receipt and form show it */
function heroReceiptDate(locale: ShellLocale): string {
  return new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(2001, 3, 12));
}

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
 * check names what the visitor should read. `navigateTo` (or `navigateToWithTextSize`, which
 * sets the browser text size first) is the only way in. P41 reruns the spec
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
    await page.addInitScript(recordTimedStages);
    await page.goto(pathFor(locale, '') + (engine === 'stages' ? '?scenes=stages' : ''));
    await home.verifyLoaded();
    return home;
  }

  /**
   * Open the homepage with a larger browser text size (the reader's default font size setting, in
   * px; Chromium's `Page.setFontSizes`, as Playwright has no option for it). The site sizes text and
   * the phone visual in rem, so this moves the layout by far more than font metrics differ between
   * operating systems.
   */
  static async navigateToWithTextSize(page: Page, locale: ShellLocale, engine: SceneEngine, textSizePx: number): Promise<HomePage> {
    await setBrowserTextSize(page, textSizePx);
    return HomePage.navigateTo(page, locale, engine);
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
    // Departs from rule 2 (an attribute, not something a person sees): the stages engine marks the
    // page ready once every scene has its first stage, and only then may stage changes transition.
    // Checks that run before it (axe, overflow) would otherwise race the first stage assignment.
    // A visible "scenes ready" cue does not exist and should not, so this stays.
    if (this.engine === 'stages') {
      await expect(this.page.locator('html'), 'the stages engine has assigned the first stages').toHaveAttribute(
        'data-scene-ready',
        ''
      );
    }
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
    await expect
      .poll(
        () =>
          this.main.getByRole('region').evaluateAll(regions =>
            regions.map(region => document.getElementById(region.getAttribute('aria-labelledby') ?? '')?.textContent?.trim())
          ),
        { message: 'region names in page order', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual(REGION_TITLE_KEYS.map(key => this.string(key)));
  }

  async expectJsonLdApplication(): Promise<void> {
    // Departs from rule 2: JSON-LD is for search engines, so nothing a person sees leads to it
    await expect
      .poll(
        () =>
          this.page
            .locator('script[type="application/ld+json"]')
            .evaluateAll(scripts => scripts.map(script => script.textContent ?? '').join('\n')),
        { message: 'the homepage carries a SoftwareApplication block', timeout: ELEMENT_TIMEOUT }
      )
      .toContain('SoftwareApplication');
  }

  async expectNoBannedPhrases(): Promise<void> {
    // Pseudo-locale text is accented, so only the English page can show these; check every page the same way
    for (const phrase of BANNED_PHRASES) {
      await expect(this.page.locator('body'), `the page never says "${phrase}"`).not.toContainText(phrase, {
        ignoreCase: true,
      });
    }
  }

  // ----- links -----

  /** Every link in the page body goes somewhere on this site; launch links count a click and say nofollow */
  async expectLinksStayOnTheSite(): Promise<void> {
    await expect(this.registerLinks, 'the hero and the final sign-up button').toHaveCount(2);
    const summary = async () => {
      const links = await this.mainLinks.evaluateAll(anchors =>
        anchors.map(anchor => ({ href: anchor.getAttribute('href') ?? '', rel: anchor.getAttribute('rel') ?? '' }))
      );
      const launch = links.filter(link => link.href.startsWith('/go/'));
      const param = (href: string, name: string) => new URL(href, 'http://x').searchParams.get(name);
      return {
        'the page has more than 8 body links': links.length > 8,
        'links that leave the site (the app is reached through /go/)': links
          .filter(link => !(link.href.startsWith('/') || link.href.startsWith('#')))
          .map(link => link.href),
        'launch links without nofollow': launch.filter(link => !link.rel.includes('nofollow')).map(link => link.href),
        'launch links that do not name their page': launch.filter(link => param(link.href, 'from') === null).map(link => link.href),
        'positions of the sign-up buttons': launch
          .filter(link => link.href.startsWith('/go/register/'))
          .map(link => param(link.href, 'cta')),
      };
    };
    await expect
      .poll(summary, { message: 'body links stay on the site; sign-up is exactly the hero and the final button', timeout: ELEMENT_TIMEOUT })
      .toEqual({
        'the page has more than 8 body links': true,
        'links that leave the site (the app is reached through /go/)': [],
        'launch links without nofollow': [],
        'launch links that do not name their page': [],
        'positions of the sign-up buttons': ['hero', 'final'],
      });
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
    await expect
      .poll(
        () =>
          this.page.evaluate(() =>
            (window as unknown as { __focusLog: Array<{ href: string; ring: boolean }> }).__focusLog
              .filter(entry => !entry.ring)
              .map(entry => entry.href)
          ),
        { message: 'links focused without a visible focus ring', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  // ----- motion -----

  protected heroScan(): Locator {
    // Rule 2: this is a noninteractive illustration, with no form/control role or single visible
    // name. Its test id scopes the receipt, mock fields and check markers without CSS selectors.
    return this.region('home.hero.title').getByTestId('hero-scan');
  }

  private async expectHeroStage(stage: number): Promise<void> {
    // As with scene-ready, stage is the scene controller's documented animation contract;
    // there is intentionally no visible debug label. Also check rendered content below.
    await auditAnimationWait(`hero reaches stage ${stage}`, () =>
      expect(this.region('home.hero.title')).toHaveAttribute('data-stage', String(stage)));
  }

  private async expectScanFields(shown: boolean): Promise<void> {
    await auditAnimationWait(`receipt fields are ${shown ? 'visible' : 'hidden'}`, () => expect.poll(
      () => this.heroScan().getByTestId('scan-field').evaluateAll(fields =>
        fields.map(field => field.checkVisibility({ opacityProperty: true, visibilityProperty: true }))),
      { message: 'rendered receipt fields', timeout: ELEMENT_TIMEOUT }
    ).toEqual([shown, shown, shown]));
  }

  private cameraView(): Locator {
    // Rule 2: the camera view is decoration (aria-hidden; the form carries the receipt's text), so
    // it has no role or name to find it by. Its test id is the only handle.
    return this.heroScan().getByTestId('scan-camera');
  }

  private scanLine(): Locator {
    // Rule 2: as the camera view, which holds it; the line is a shape with no text
    return this.heroScan().getByTestId('scan-line');
  }

  /** Painted or not: opacity 0 and visibility hidden count as not shown, with their ancestors */
  private async expectRendered(locator: Locator, operation: string, shown = true): Promise<void> {
    await auditAnimationWait(operation, () => expect.poll(
      () => locator.evaluate(element => element.checkVisibility({ opacityProperty: true, visibilityProperty: true })),
      { message: operation, timeout: ELEMENT_TIMEOUT }
    ).toBe(shown));
  }

  /** The stages the hero's timed pass has been through, from the page's log (`recordTimedStages`) */
  private async expectHeroStageLog(expected: string[], operation: string): Promise<void> {
    await auditAnimationWait(operation, () => expect.poll(
      () => this.page.evaluate(() => [...(window as unknown as { __timedStages: string[] }).__timedStages]),
      { message: operation, timeout: ELEMENT_TIMEOUT }
    ).toEqual(expected));
  }

  async expectHeroScanPlaysOnce(): Promise<void> {
    await this.expectHeroStageLog(['0', '1', '2', '3'], 'hero passes viewfinder, scan, fields, review in order');
    await this.expectHeroScanRest();
  }

  /**
   * Leaving and coming back must not replay the pass: the log would gain a second '0'. This scrolls
   * through the pinned scenes and back, so run page-wide checks (axe) before it: on the stages
   * engine a scene's stage can change after the scroll has settled and fade its text mid-audit.
   */
  async expectHeroScanStaysDoneAfterReentry(): Promise<void> {
    await this.settleRegion.scrollIntoViewIfNeeded();
    await this.heroScan().scrollIntoViewIfNeeded();
    // Two frames and a still page: an entry observer that would restart the pass has had its callback.
    await expectAnimationsSettled(this.page);
    await auditAnimationWait('hero stays done after re-entry', () =>
      expect(this.region('home.hero.title')).toHaveAttribute('data-play-state', 'done'));
    await this.expectHeroStageLog(['0', '1', '2', '3'], 'hero did not replay after re-entry');
  }

  private replayButton(): Locator {
    return this.heroScan().getByRole('button', { name: this.string('home.hero.replay'), exact: true });
  }

  /** The replay button's tooltip: hidden from assistive tech (the button's name says the same) */
  private replayTooltip(): Locator {
    return this.heroScan().getByText(this.string('home.hero.replay'), { exact: true });
  }

  /** The hero's card of what you get, a list named by `home.hero.factsLabel` */
  private heroFacts(): Locator {
    return this.region('home.hero.title').getByRole('list', { name: this.string('home.hero.factsLabel'), exact: true });
  }

  /** The hero's line of what it leaves out ("No creepy tracking"), a list named by `home.hero.goodToKnowLabel` */
  private heroWithout(): Locator {
    return this.region('home.hero.title').getByRole('list', { name: this.string('home.hero.goodToKnowLabel'), exact: true });
  }

  /** At rest, "Play again" plays the whole pass once more, from the viewfinder to the review */
  async replayHeroScanAndExpectFullPass(): Promise<void> {
    await this.expectHeroStageLog(['0', '1', '2', '3'], 'the first pass has finished');
    await this.expectRendered(this.cameraView(), 'no camera view at rest', false);
    await auditAnimationWait('replay button is shown at rest', () => expect(this.replayButton()).toBeVisible());
    await this.replayButton().click();
    // Stages 0 and 1 (0 to 2250 ms of the pass) show the camera; the scan line sweeps in stage 1
    await this.expectRendered(this.cameraView(), 'the camera view is back for the replay');
    await this.expectHeroStageLog(['0', '1', '2', '3', '0', '1'], 'the replay reaches scanning');
    await this.expectRendered(this.scanLine(), 'the scan line sweeps while scanning');
    await this.expectHeroStageLog(['0', '1', '2', '3', '0', '1', '2', '3'], 'replay passes viewfinder, scan, fields, review again');
    await this.expectHeroScanRest();
  }

  /** A click while a replay runs starts over: the cancelled pass never reaches its later stages */
  async replayHeroScanTwiceAndExpectOneRestart(): Promise<void> {
    await this.expectHeroStageLog(['0', '1', '2', '3'], 'the first pass has finished');
    await auditAnimationWait('replay button is shown at rest', () => expect(this.replayButton()).toBeVisible());
    await this.replayButton().click();
    // Stage 1 lasts 1575 ms (15 % to 50 % of 4.5 s), ample time for the second click
    await this.expectHeroStageLog(['0', '1', '2', '3', '0', '1'], 'the replay reaches scanning');
    await this.replayButton().click();
    // Were the first replay not cancelled, its stages 2 and 3 would land in the middle of the restart
    await this.expectHeroStageLog(['0', '1', '2', '3', '0', '1', '0', '1', '2', '3'], 'the second click restarts the pass once');
    await this.expectHeroScanRest();
  }

  /** The tooltip matches the accessible name, opens on keyboard focus and hover, and Escape hides it */
  async expectReplayTooltip(): Promise<void> {
    await auditAnimationWait('replay button is shown at rest', () => expect(this.replayButton()).toBeVisible());
    await auditAnimationWait('tooltip starts hidden', () => expect(this.replayTooltip()).toBeHidden());
    // Tab from the link before it, so the focus is keyboard focus
    await this.region('home.hero.title').getByRole('link', { name: this.string('home.hero.ctaSecondary'), exact: true }).focus();
    await this.page.keyboard.press('Tab');
    await auditAnimationWait('Tab reaches the replay button', () => expect(this.replayButton()).toBeFocused());
    await auditAnimationWait('tooltip opens on keyboard focus', () => expect(this.replayTooltip()).toBeVisible());
    await this.page.keyboard.press('Escape');
    await auditAnimationWait('Escape hides the tooltip', () => expect(this.replayTooltip()).toBeHidden());
    await auditAnimationWait('the button keeps focus', () => expect(this.replayButton()).toBeFocused());
    // Moving focus away ends the dismissal; then the pointer opens it
    await this.h1.click();
    await auditAnimationWait('tooltip closes when focus leaves', () => expect(this.replayTooltip()).toBeHidden());
    await this.replayButton().hover();
    await auditAnimationWait('tooltip opens on hover', () => expect(this.replayTooltip()).toBeVisible());
    // WCAG 1.4.13: the pointer can move onto the tooltip and it stays open
    await this.replayTooltip().hover();
    await auditAnimationWait('tooltip stays open while hovered', () => expect(this.replayTooltip()).toBeVisible());
    await this.h1.hover();
    await auditAnimationWait('tooltip closes when the pointer leaves', () => expect(this.replayTooltip()).toBeHidden());
  }

  /** The static engine (reduced motion, short windows) has nothing to replay: no button */
  async expectNoReplayButton(): Promise<void> {
    await auditAnimationWait('no replay button in the static engine', () => expect(this.replayButton()).toHaveCount(0));
  }

  /** The hero's two lists, in order: three things you get, then four you don't */
  async expectHeroFacts(): Promise<void> {
    await auditAnimationWait('the hero lists what you get', () => expect(this.heroFacts().getByRole('listitem')).toHaveText([
      this.string('home.hero.fact.scanning'),
      this.string('home.hero.fact.conversion'),
      this.string('home.hero.fact.assistants'),
    ]));
    await auditAnimationWait('the hero lists what you don\'t get', () => expect(this.heroWithout().getByRole('listitem')).toHaveText([
      this.string('home.hero.without.creepyTracking'),
      this.string('home.hero.without.sellingData'),
      this.string('home.hero.without.appDownload'),
      this.string('home.hero.without.formFilling'),
    ]));
  }

  /** On a desktop window the facts band starts above the fold, under the copy and the phone */
  async expectHeroFactsStartAboveTheFold(): Promise<void> {
    await auditAnimationWait('facts band starts in the first viewport', () => expect(this.heroFacts()).toBeInViewport());
  }

  /** With the hero's visual out of view at load: nothing plays until it scrolls into view */
  async expectHeroScanWaitsThenEnter(): Promise<void> {
    // Two frames and a still page first: the entry observer has had its first report
    await expectAnimationsSettled(this.page);
    await auditAnimationWait('phone hero waits for visual entry', () =>
      expect(this.region('home.hero.title')).toHaveAttribute('data-play-state', 'pending'));
    await this.expectHeroStageLog(['0'], 'the hero is set to stage 0 and goes no further before entry');
    await this.expectRendered(this.cameraView(), 'the camera view waits at stage 0');
    await this.expectScanFields(false);
    // A sliver (10 %) of the visual in view is under the 25 % entry threshold: still nothing plays.
    // The instant scroll sidesteps the page's smooth scrolling so the sliver is exact.
    await this.heroScan().evaluate(visual => {
      const box = visual.getBoundingClientRect();
      scrollTo({ top: scrollY + box.top + box.height * 0.1 - innerHeight, behavior: 'instant' as ScrollBehavior });
    });
    await auditAnimationWait('a sliver of the phone visual is in view', () => expect(this.heroScan()).toBeInViewport());
    await auditAnimationWait('under a quarter of the phone visual is in view', () =>
      expect(this.heroScan()).not.toBeInViewport({ ratio: 0.25 }));
    await expectAnimationsSettled(this.page);
    await auditAnimationWait('phone hero still waits with a sliver in view', () =>
      expect(this.region('home.hero.title')).toHaveAttribute('data-play-state', 'pending'));
    await this.expectHeroStageLog(['0'], 'the hero goes no further than stage 0 with a sliver in view');
    await this.heroScan().scrollIntoViewIfNeeded();
    await auditAnimationWait('phone visual enters viewport', () => expect(this.heroScan()).toBeInViewport({ ratio: 0.25 }));
  }

  async expectHeroScanRest(): Promise<void> {
    await this.expectHeroStage(3);
    await expectAnimationsSettled(this.page);
    await this.expectRendered(this.cameraView(), 'no camera view at rest', false);
    await this.expectRendered(this.scanLine(), 'no scan line at rest', false);
    await this.expectScanFields(true);
    await this.expectRendered(this.heroScan().getByText(this.string('home.hero.scanReview'), { exact: true }), 'review cue is visible');
    await auditAnimationWait('fields match the taxi receipt', () => expect(this.heroScan().getByTestId('scan-field')).toHaveText([
      this.string('home.chaos.receiptTaxi'), heroTaxiFare(this.locale), heroReceiptDate(this.locale),
    ]));
    await auditAnimationWait('all scanned fields carry check markers', () => expect.poll(
      () => this.heroScan().getByTestId('scan-check').evaluateAll(markers =>
        markers.map(marker => marker.checkVisibility({ opacityProperty: true }))),
      { timeout: ELEMENT_TIMEOUT }
    ).toEqual([true, true, true]));
  }

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
    await expect(this.settleRegion, 'the settle scene is on screen before the flick').toBeInViewport();
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

  /** Readable copy and the scene's link must not be cut off by its pinned clipping boundary. */
  async expectSettleContentFitsStage(): Promise<void> {
    await this.settleRegion.scrollIntoViewIfNeeded();
    // The stage is the scene primitive's clipping boundary, not a user-facing control. Measuring
    // it is necessary: Playwright's visibility check does not detect partially clipped text.
    await auditAnimationWait('the settle heading, illustration and link fit their stage', () => expect.poll(
      () => this.settleRegion.evaluate(scene => {
        const stage = scene.querySelector('.scene__stage');
        if (!stage) return ['no settle stage'];
        const bounds = stage.getBoundingClientRect();
        return Array.from(stage.children).flatMap(child => {
          const rect = child.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return [`${child.className} has no visible content`];
          return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
            ? [`${child.className}: ${Math.round(rect.top - bounds.top)}..${Math.round(rect.bottom - bounds.top)} of ${Math.round(bounds.height)}`]
            : [];
        });
      }),
      { message: 'settle content clipped by the pinned stage', timeout: ELEMENT_TIMEOUT }
    ).toEqual([]));
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

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    await expectAnimationsSettled(this.page);
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
