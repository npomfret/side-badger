import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { PolicyApi, type PolicyReply } from './policyApi';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale, type StringKey } from './strings';

export type PolicyRoute = 'privacy' | 'terms' | 'cookies';

/** The policy API's own URL for each page, as the noscript link must show it */
const SOURCE: Record<PolicyRoute, string> = {
  privacy: 'https://app.sidebadger.me/api/policies/privacy-policy/text',
  terms: 'https://app.sidebadger.me/api/policies/terms-of-service/text',
  cookies: 'https://app.sidebadger.me/api/policies/cookie-policy/text',
};

/**
 * A legal page whose policy text comes from the app API when it opens. `navigateTo` installs the API stub
 * first (the real API is never called) and waits only for the shell; each `expect…` says what the visitor sees.
 */
export class PolicyPage {
  private constructor(
    private readonly page: Page,
    readonly api: PolicyApi,
    private readonly locale: ShellLocale,
    private readonly route: PolicyRoute
  ) {}

  static async navigateTo(
    page: Page,
    locale: ShellLocale,
    route: PolicyRoute,
    reply: PolicyReply = { kind: 'ok' },
    options: { createdAt?: string | undefined } = { createdAt: '2026-11-18T22:56:13.851Z' }
  ): Promise<PolicyPage> {
    const api = await PolicyApi.install(page);
    api.textReply = reply;
    api.createdAt = options.createdAt;
    const policy = new PolicyPage(page, api, locale, route);
    await page.goto(pathFor(locale, route));
    await policy.verifyShell();
    return policy;
  }

  // ----- locators, built fresh on every use -----

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  private get h1(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The always-present polite live region: the loading and failure message */
  private get status(): Locator {
    return this.page.locator('.policy-state > p');
  }

  private get retryButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: this.string('policy.retry'), exact: true });
  }

  private get body(): Locator {
    return this.page.locator('.policy-content');
  }

  private get updated(): Locator {
    return this.page.locator('.policy-updated');
  }

  private get tableRegions(): Locator {
    return this.body.getByRole('region');
  }

  // ----- checks -----

  async verifyShell(): Promise<void> {
    await expect(this.h1).toHaveCount(1, { timeout: NAVIGATION_TIMEOUT });
    await expect(this.h1).toHaveText(this.string(`policy.${this.route}.title`));
  }

  /** The page is waiting for the API: busy body, loading message, nothing to read yet */
  async expectLoading(): Promise<void> {
    await expect(this.status).toHaveText(this.string('policy.loading'), { timeout: ELEMENT_TIMEOUT });
    await expect(this.body).toHaveAttribute('aria-busy', 'true');
    await expect(this.body).toBeHidden();
    await expect(this.retryButton).toBeHidden();
  }

  /** The policy is on screen with its structure intact and the loading and error messages gone */
  async expectLoaded(): Promise<void> {
    await expect(this.body).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.body).toHaveAttribute('aria-busy', 'false');
    await expect(this.body.getByRole('heading', { level: 3, name: 'Your data' })).toBeVisible();
    await expect(this.body.getByRole('heading', { level: 4, name: 'Who we share it with' })).toBeVisible();
    await expect(this.body.getByRole('listitem')).toHaveCount(2);
    await expect(this.body.getByRole('link', { name: 'contact' })).toHaveAttribute('href', 'mailto:privacy@example.com');
    await expect(this.body.getByRole('link', { name: 'full terms' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(this.status).toHaveText('');
    await expect(this.retryButton).toBeHidden();
  }

  /** `#` in the Markdown became an h2 (and `##`, `###` moved down with it): the page still has exactly one h1, the title */
  async expectSingleH1(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(this.body.getByRole('heading', { level: 1 })).toHaveCount(0);
    await expect(this.body.getByRole('heading', { level: 2, name: 'Policy of the sample' })).toBeVisible();
  }

  async expectPublicationDate(expected: string): Promise<void> {
    await expect(this.updated).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.updated).toHaveText(expected);
    await expect(this.updated.locator('time')).toHaveAttribute('datetime', '2026-11-18T22:56:13.851Z');
  }

  async expectNoPublicationDate(): Promise<void> {
    await expect(this.updated).toBeHidden();
  }

  /** The English text keeps `lang="en"` and left-to-right, whatever the page's own direction */
  async expectEnglishLtrBody(): Promise<void> {
    await expect(this.body).toHaveAttribute('lang', 'en');
    await expect(this.body).toHaveAttribute('dir', 'ltr');
    await expect(this.page.locator('html')).toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
  }

  async expectEnglishOnlyNotice(): Promise<void> {
    await expect(this.page.getByRole('note').filter({ hasText: this.string('policy.englishOnly') })).toBeVisible();
  }

  /** Failure: the translated message and Try again; no policy text at all, and the rest of the page is there */
  async expectFailure(): Promise<void> {
    await expect(this.status).toContainText(this.string('policy.error'), { timeout: ELEMENT_TIMEOUT });
    await expect(this.retryButton).toBeVisible();
    await expect(this.body).toBeHidden();
    await expect(this.body).toBeEmpty();
    await expect(this.body).toHaveAttribute('aria-busy', 'false');
    await expect(this.updated).toBeHidden();
    await expect(this.page.getByRole('banner')).toBeVisible();
    await expect(this.page.getByRole('contentinfo')).toBeVisible();
  }

  /** The failure message is in the page's own language and direction */
  async expectFailureLayoutMatchesDirection(): Promise<void> {
    const rtl = isRtl(this.locale);
    const [message, content] = await Promise.all([this.status.boundingBox(), this.page.locator('.legal-content').boundingBox()]);
    expect(message && content).toBeTruthy();
    const gapStart = rtl ? content!.x + content!.width - (message!.x + message!.width) : message!.x - content!.x;
    const gapEnd = rtl ? message!.x - content!.x : content!.x + content!.width - (message!.x + message!.width);
    expect(gapStart, 'the message starts at the reading edge').toBeLessThanOrEqual(gapEnd + 1);
  }

  async retry(): Promise<void> {
    await this.retryButton.click();
  }

  /** Move the page's clock past the 10 second limit (the request is never answered) */
  async passTimeout(): Promise<void> {
    await this.page.clock.fastForward(10_000);
  }

  async expectFocusOnStatus(): Promise<void> {
    await expect(this.status).toBeFocused();
  }

  /** Each table scrolls inside a named region the keyboard can reach, and the page itself does not scroll sideways */
  async expectTablesUsable(): Promise<void> {
    await expect(this.tableRegions).toHaveCount(1);
    const region = this.tableRegions.first();
    await expect(region).toHaveAttribute('tabindex', '0');
    await expect(region).toHaveAccessibleName('Who we share it with');
    await region.focus();
    await expect(region).toBeFocused();
    await this.page.keyboard.press('Tab');
    await expect(region).not.toBeFocused();
    await this.page.keyboard.press('Shift+Tab');
    await expect(region).toBeFocused();
    const overflow = await this.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0);
  }

  /** On a phone the wide table is clipped to its region, which can scroll */
  async expectTableScrollsOnPhone(): Promise<void> {
    const region = this.tableRegions.first();
    const [client, scroll] = await region.evaluate(el => [el.clientWidth, el.scrollWidth]);
    expect(scroll, 'the table is wider than its region').toBeGreaterThan(client);
    await region.evaluate(el => el.scrollTo({ left: 80 }));
    expect(await region.evaluate(el => Math.abs(el.scrollLeft))).toBeGreaterThan(0);
  }

  /** The hostile policy ran nothing and created nothing dangerous */
  async expectNothingExecuted(dialogs: string[]): Promise<void> {
    await expect(this.body.getByRole('heading', { name: 'Hostile policy' })).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    // Give a handler that would fire on load or error time to do it
    await expect
      .poll(() => this.page.evaluate(() => (window as unknown as { __xss?: string }).__xss), { timeout: 1000 })
      .toBeUndefined();
    expect(dialogs).toEqual([]);
    const dangerous = await this.body.evaluate(body => ({
      elements: body.querySelectorAll('script, style, iframe, img, svg, object, embed, form, link, meta').length,
      handlers: [body, ...body.querySelectorAll('*')].flatMap(el => el.getAttributeNames().filter(name => name.startsWith('on'))),
      bad: [...body.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href') ?? '')
        .filter(href => !/^(https?:|mailto:|\/|#)/i.test(href)),
    }));
    expect(dangerous).toEqual({ elements: 0, handlers: [], bad: [] });
    await expect(this.body.getByRole('link', { name: 'safe' })).toHaveAttribute('href', 'https://example.com/ok');
    // The block of raw HTML is shown as inert text
    await expect(this.body).toContainText('<script>window.__xss = "script"</script>');
  }

  /** Without JavaScript the page says so and links to the source text; it does not claim to be the policy */
  async expectNoScriptFallback(): Promise<void> {
    const note = this.page.getByRole('note').filter({ hasText: this.string('policy.noscript') });
    await expect(note).toBeVisible();
    await expect(note.getByRole('link', { name: this.string('policy.sourceLink') })).toHaveAttribute('href', SOURCE[this.route]);
    await expect(this.body).toBeHidden();
    expect(this.api.requests).toEqual([]);
  }

  /** The policy requests the page made, to prove what was fetched and from where */
  async expectRequestedSource(): Promise<void> {
    await expect.poll(() => this.api.requests.length).toBeGreaterThanOrEqual(1);
    expect(this.api.requests).toContain(SOURCE[this.route]);
    expect(this.api.requests.every(url => url.startsWith('https://app.sidebadger.me/api/policies/'))).toBe(true);
  }

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    // The content's fade-in blends text with the background while it runs, so axe's contrast result depends on when it samples
    await expect
      .poll(
        () =>
          this.page.evaluate(() =>
            document
              .getAnimations()
              .filter(a => a.playState === 'running' && a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity)
              .map(a => (a as CSSAnimation).animationName ?? 'animation')
          ),
        { message: 'finite animations still running', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const serious = results.violations
      .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
      .map(violation => ({ rule: violation.id, targets: violation.nodes.map(node => node.target.join(' ')) }));
    expect(serious, 'serious or critical accessibility violations').toEqual([]);
  }

  async expectRequestCount(count: number): Promise<void> {
    await expect.poll(() => this.api.requests.filter(url => url.endsWith('/text')).length).toBe(count);
  }
}
