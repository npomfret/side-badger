import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';

const LIMIT_IDS = [
  'people',
  'records',
  'amount',
  'currencies',
  'receipts',
  'attachments',
  'lists',
  'polls',
  'scans',
  'protection',
] as const;

/** Phrases the pricing page must never show (site plan D2, D3) */
const BANNED_PHRASES = [
  'free forever',
  '100% free',
  'zero tracking',
  'no tracking',
  'privacy first',
  'no catch',
  'coming soon',
  'free until it isn',
  'pro plan',
];

/**
 * The pricing page. The expected text is the English key (pseudoized for the pseudo-locales), so
 * every check names what the visitor should read. `navigateTo` is the only way in; it starts
 * recording requests first, so a confetti chunk that loads with the page is caught.
 */
export class PricingPage {
  private readonly requested: string[] = [];

  private constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale
  ) {
    page.on('request', request => this.requested.push(request.url()));
  }

  static async navigateTo(page: Page, locale: ShellLocale): Promise<PricingPage> {
    const pricing = new PricingPage(page, locale);
    await page.goto(pathFor(locale, 'pricing'));
    await pricing.verifyLoaded();
    return pricing;
  }

  // ----- locators, built fresh on every use -----

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  private section(headingKey: StringKey): Locator {
    return this.main.getByRole('region', { name: this.string(headingKey), exact: true });
  }

  private get h1(): Locator {
    return this.main.getByRole('heading', { level: 1 });
  }

  private get registerLink(): Locator {
    return this.main.getByRole('link', { name: this.string('pricing.free.cta') });
  }

  private get privacyLink(): Locator {
    return this.section('pricing.trust.title').getByRole('link', { name: this.string('home.trust.privacyLink') });
  }

  private get termsLink(): Locator {
    return this.section('pricing.stay.title').getByRole('link', { name: this.string('pricing.stay.link') });
  }

  private get limitsTable(): Locator {
    return this.section('pricing.limits.title').getByRole('table', { name: this.string('pricing.limits.caption') });
  }

  private get faqSection(): Locator {
    return this.section('pricing.faq.title');
  }

  // ----- the page -----

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(pathFor(this.locale, 'pricing'), { timeout: NAVIGATION_TIMEOUT });
    await expect(this.page.locator('html'), 'text direction').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
    await expect(this.h1, 'the one h1').toHaveText(this.string('pricing.hero.title'), { timeout: ELEMENT_TIMEOUT });
  }

  async expectHero(): Promise<void> {
    await expect(this.main.getByText(this.string('pricing.hero.subtitle'), { exact: true })).toBeVisible();
    await expect(this.main.getByText(this.string('pricing.hero.aside'), { exact: true })).toBeVisible();
  }

  /** The outline from the brief: What you get, Limits, trust stamp, Will it stay free?, Questions. */
  async expectOutline(): Promise<void> {
    await expect(this.main.getByRole('heading', { level: 2 }), 'the page\'s h2 headings').toHaveText([
      this.string('pricing.get.title'),
      this.string('pricing.limits.title'),
      this.string('pricing.trust.title'),
      this.string('pricing.stay.title'),
      this.string('pricing.faq.title'),
    ]);
  }

  /** One free offer with its six features and no Pro card. */
  async expectOffer(): Promise<void> {
    const offer = this.section('pricing.get.title');
    await expect(offer.getByText(this.string('pricing.free.price'), { exact: true })).toBeVisible();
    await expect(offer.getByText(this.string('pricing.free.description'), { exact: true })).toBeVisible();
    await expect(offer.getByRole('listitem'), 'the offer\'s features').toHaveText([
      this.string('pricing.free.feature1'),
      this.string('pricing.free.feature2'),
      this.string('pricing.free.feature3'),
      this.string('pricing.free.feature4'),
      this.string('pricing.free.feature5'),
      this.string('pricing.free.feature6'),
    ]);
    await expect(this.main.locator('button'), 'no disabled "Pro" button').toHaveCount(0);
  }

  /** The limits table lists every limit, with the 999,999.99 cap, in the brief's order. */
  async expectLimitsTable(): Promise<void> {
    await expect(this.limitsTable.getByRole('columnheader'), 'table headings').toHaveText([
      this.string('pricing.limits.head.limit'),
      this.string('pricing.limits.head.value'),
    ]);
    const rows = this.limitsTable.getByRole('row');
    await expect(rows, 'the heading row plus one row per limit').toHaveCount(LIMIT_IDS.length + 1);
    await expect(this.limitsTable.getByRole('rowheader'), 'limit names').toHaveText(
      LIMIT_IDS.map(id => this.string(`pricing.limits.${id}.label` as StringKey))
    );
    await expect(this.limitsTable.getByRole('cell'), 'limit values').toHaveText(
      LIMIT_IDS.map(id => this.string(`pricing.limits.${id}.value` as StringKey))
    );
    await expect(this.limitsTable, 'the per-expense cap').toContainText('999,999.99');
  }

  async expectTrustAndNotice(): Promise<void> {
    await expect(this.section('pricing.trust.title')).toContainText(this.string('pricing.trust.body'));
    await expect(this.privacyLink).toHaveAttribute('href', pathFor(this.locale, 'privacy'));
    await expect(this.section('pricing.stay.title')).toContainText(this.string('pricing.stay.body'));
    await expect(this.termsLink).toHaveAttribute('href', pathFor(this.locale, 'terms'));
  }

  /** "Will it always be free?" quotes the terms' notice commitment, word for word. */
  async expectNoticeCommitmentQuoted(): Promise<void> {
    const answer = this.faqSection.locator('.faq-entry', {
      has: this.page.getByRole('heading', { level: 3, name: this.string('pricing.faq.q2.question'), exact: true }),
    });
    await expect(answer).toContainText(
      'We reserve the right to introduce fees, subscriptions, or different service models in the future. ' +
        'If we do, we will provide you with reasonable notice of any changes.'
    );
  }

  async expectNoBannedClaims(): Promise<void> {
    const body = (await this.main.innerText()).toLowerCase();
    const found = BANNED_PHRASES.filter(phrase => body.includes(phrase));
    // The page is static: one read is the page
    expect(found, 'phrases the pricing page must not use').toEqual([]);
  }

  /** The Pricing nav label is the page's own, and the old hard-coded aria-label is gone. */
  async expectNoHardCodedEnglishLabels(): Promise<void> {
    await expect(this.page.locator('[aria-label="Pricing plans"]'), 'the old English aria-label').toHaveCount(0);
  }

  // ----- calls to action -----

  /** One register link in the page body, through the launch counter, labelled `plan-free`. */
  async expectOneRegisterLink(): Promise<void> {
    await expect(this.main.locator('a[href^="/go/"]'), 'launch links in the page body').toHaveCount(1);
    await expect(this.registerLink).toHaveAttribute('href', '/go/register/?from=pricing&cta=plan-free');
    await expect(this.registerLink).toHaveAttribute('rel', 'nofollow');
  }

  // ----- confetti (D25) -----

  private get confettiRequests(): string[] {
    return this.requested.filter(url => /confetti/i.test(url));
  }

  /** The page loaded without the confetti chunk. */
  async expectNoConfettiLoaded(): Promise<void> {
    // Give the page's own scripts time to run, then look at what was asked for
    await this.page.waitForLoadState('networkidle');
    expect(this.confettiRequests, 'confetti requests before any click').toEqual([]);
  }

  /** The first click on the call to action loads the confetti chunk. The counter page is stubbed. */
  async clickRegisterLinkAndExpectConfettiLoads(): Promise<void> {
    await this.page.route('**/go/register/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }));
    const chunk = this.page.waitForRequest(request => /confetti/i.test(request.url()), { timeout: ELEMENT_TIMEOUT });
    await this.registerLink.click();
    expect((await chunk).url(), 'the lazily loaded confetti chunk').toMatch(/confetti/i);
  }

  // ----- FAQ and JSON-LD -----

  async expectFaq(): Promise<void> {
    const questions = [1, 2, 3, 4, 5, 6].map(n => this.string(`pricing.faq.q${n}.question` as StringKey));
    await expect(this.faqSection.getByRole('heading', { level: 3 }), 'FAQ questions').toHaveText(questions);
  }

  /** The `FAQPage` JSON-LD holds exactly the visible questions and answers. */
  async expectFaqJsonLdMatchesVisibleFaq(): Promise<void> {
    const visible = await this.faqSection.locator('.faq-entry').evaluateAll(entries =>
      entries.map(entry => ({
        q: entry.querySelector('h3')!.textContent!.trim(),
        a: entry.querySelector('p')!.textContent!.trim(),
      }))
    );
    const faqPages = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap(script => {
        const data = JSON.parse(script.textContent ?? '{}');
        const nodes: Array<Record<string, unknown>> = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        return nodes.filter(node => node['@type'] === 'FAQPage');
      })
    );
    expect(faqPages, 'exactly one FAQPage node').toHaveLength(1);
    const entities = faqPages[0].mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
    expect(
      entities.map(entity => ({ q: entity.name, a: entity.acceptedAnswer.text })),
      'FAQPage JSON-LD against the visible FAQ'
    ).toEqual(visible);
  }

  // ----- keyboard -----

  /** From the top of the page, Tab reaches the register link, then the privacy and terms links, in order. */
  async expectKeyboardReachesBodyLinks(): Promise<void> {
    const order: Locator[] = [this.registerLink, this.privacyLink, this.termsLink];
    let stops = 0;
    for (const [index, target] of order.entries()) {
      // The header's controls come first; step until the target has focus
      for (; stops < 40; stops++) {
        await this.page.keyboard.press('Tab');
        if (await target.evaluate(el => el === document.activeElement)) break;
      }
      await expect(target, `body link ${index + 1} of ${order.length} reachable by Tab`).toBeFocused();
      await expect(target, 'focused link is on screen').toBeInViewport();
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
              if (el.closest('.sr-only')) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                offenders.push(`${el.tagName.toLowerCase()}.${el.className} [${Math.round(rect.left)}..${Math.round(rect.right)}] of ${width}`);
              }
            }
            return offenders;
          }),
        { message: 'nothing on the page should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
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

  /**
   * Every text element in the page body has a contrast ratio of at least 4.5:1 (computed here, not
   * only by axe: it composites the element's colour and each translucent background in turn).
   */
  async expectTextContrastAtLeast(minimum: number): Promise<void> {
    const failures = await this.page.evaluate(min => {
      type Rgba = [number, number, number, number];
      const parse = (css: string): Rgba => {
        const m = css.match(/rgba?\(([^)]+)\)/);
        if (!m) return [0, 0, 0, 0];
        const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return [r, g, b, a];
      };
      const over = (top: Rgba, below: Rgba): Rgba => {
        const a = top[3] + below[3] * (1 - top[3]);
        if (a === 0) return [0, 0, 0, 0];
        const mix = (i: number) => (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / a;
        return [mix(0), mix(1), mix(2), a];
      };
      const lum = ([r, g, b]: Rgba) => {
        const f = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: Rgba, b: Rgba) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const out: string[] = [];
      const page: Rgba = parse(getComputedStyle(document.body).backgroundColor);
      const base: Rgba = page[3] === 0 ? [240, 253, 244, 1] : page;
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      const seen = new Set<Element>();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || seen.has(el) || !node.textContent!.trim()) continue;
        seen.add(el);
        if (el.closest('.sr-only')) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        // Background: composite every ancestor's translucent colour over the page colour
        const chain: Rgba[] = [];
        for (let a: Element | null = el; a; a = a.parentElement) chain.push(parse(getComputedStyle(a).backgroundColor));
        let background: Rgba = base;
        for (const layer of chain.reverse()) background = over(layer, background);
        const fg = over(parse(style.color), background);
        const value = ratio(fg, background);
        if (value < min) out.push(`${el.tagName.toLowerCase()}.${el.className}: ${value.toFixed(2)}:1 "${node.textContent!.trim().slice(0, 40)}"`);
      }
      return out;
    }, minimum);
    expect(failures, `text below ${minimum}:1 contrast`).toEqual([]);
  }

  async saveScreenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true });
  }
}
