import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, type ShellLocale } from './strings';

/** Request kinds a page makes when it talks to a server of its own, rather than loading its assets */
const TALKING_TYPES = ['fetch', 'xhr', 'websocket', 'eventsource', 'ping'];

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What every calculator page shares (release 2): the calculator's region, the result region under
 * it, the call to the app and the share link under the result, the record of the page's requests
 * (so a calculation that reached a server would be caught) and the page-wide checks. A calculator's
 * own page object adds its fields and its result. The words are the English page's, written out.
 */
export abstract class ToolPage {
  private readonly requested: { url: string; type: string }[] = [];
  private requestsAtLoad = 0;

  /**
   * @param path the page's path, such as `/split-bill-calculator/`
   * @param calculatorName the heading above the calculator, which names its region
   */
  protected constructor(
    protected readonly page: Page,
    private readonly path: string,
    private readonly calculatorName: string
  ) {
    page.on('request', request => this.requested.push({ url: request.url(), type: request.resourceType() }));
  }

  /** Called by the entry point once the page has loaded: requests after this are the page's own doing */
  protected markLoaded(): void {
    this.requestsAtLoad = this.requested.length;
  }

  /** The address is this page (with or without a fragment), its heading is `h1` and the calculator shows */
  protected async expectOnPage(h1: string): Promise<void> {
    await expect(this.page, `the ${h1} page`).toHaveURL(new RegExp(`${escaped(this.path)}(#.*)?$`), {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(this.calculator).toBeVisible();
  }

  // ----- locators, built fresh on every use -----

  protected get calculator(): Locator {
    return this.page.getByRole('main').getByRole('region', { name: this.calculatorName, exact: true });
  }

  protected get result(): Locator {
    return this.calculator.getByRole('region', { name: 'Result', exact: true });
  }

  protected get summary(): Locator {
    return this.result.getByRole('status');
  }

  protected get copyLinkButton(): Locator {
    return this.result.getByRole('button', { name: 'Copy link', exact: true });
  }

  protected get startGroupLink(): Locator {
    return this.result.getByRole('link', { name: 'Start a group' });
  }

  protected get linkField(): Locator {
    return this.result.getByRole('textbox', { name: 'Link to this calculation', exact: true });
  }

  // ----- sanity checks: a failure names the step that went wrong, and what the page showed -----

  protected async stillOnTheCalculator(step: string): Promise<void> {
    try {
      await expect(this.calculator).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    } catch {
      throw new Error(`${step}: the calculator is not showing. The page is ${this.page.url()}, titled "${await this.page.title()}".`);
    }
  }

  /** Assert `check`; if it fails, say what the named part of the page showed instead */
  protected async expectShowing(what: string, check: () => Promise<void>, shown: () => Promise<unknown>): Promise<void> {
    try {
      await check();
    } catch (error) {
      const seen = await shown().catch(() => '(could not be read)');
      throw new Error(`${what} did not show as expected. It shows: ${JSON.stringify(seen)}.\n${(error as Error).message}`);
    }
  }

  // ----- the result -----

  async expectSummary(summary: string): Promise<void> {
    await this.expectShowing('The summary', () => expect(this.summary).toHaveText(summary), () => this.summary.allInnerTexts());
  }

  /** The link to the app under the result goes through the launch counter, counted as `tool-result` */
  async expectStartGroupLink(): Promise<void> {
    const slug = this.path.replaceAll('/', '');
    await expect(this.startGroupLink).toBeVisible();
    await expect(this.startGroupLink).toHaveAttribute('href', new RegExp(`^/go/register/\\?from=${escaped(slug)}&cta=tool-result`));
  }

  // ----- the share link -----

  /**
   * Press Copy link and return what the clipboard then holds, as a visitor pasting it would see.
   * Needs the clipboard permissions the spec grants.
   */
  async copyLink(): Promise<string> {
    await this.stillOnTheCalculator('copyLink');
    await expect(this.copyLinkButton).toBeEnabled();
    await expect(this.linkField, 'the fallback link field before copying').toBeHidden();
    await this.copyLinkButton.click();
    await expect(this.result.getByText('Link copied. Anyone with it can see these figures.')).toBeVisible();
    let link = '';
    await expect
      .poll(async () => (link = await this.page.evaluate(() => navigator.clipboard.readText())), {
        message: 'the clipboard holds a link to this calculation',
        timeout: ELEMENT_TIMEOUT,
      })
      .toMatch(new RegExp(`${escaped(this.path)}#c=[A-Za-z0-9_-]+$`));
    await expect(this.linkField).toBeHidden();
    return link;
  }

  /** With no clipboard, the link is shown to copy by hand, selected, and the page says why */
  async copyLinkByHand(): Promise<string> {
    await this.stillOnTheCalculator('copyLinkByHand');
    await expect(this.linkField, 'the link field before copying').toBeHidden();
    await this.copyLinkButton.click();
    await expect(this.result.getByText("Couldn't copy automatically. Copy the link below.")).toBeVisible();
    await expect(this.linkField).toBeVisible();
    await expect(this.linkField).toBeFocused();
    let link = '';
    await expect
      .poll(async () => (link = await this.linkField.inputValue()), { message: 'the link field holds a link', timeout: ELEMENT_TIMEOUT })
      .toMatch(new RegExp(`${escaped(this.path)}#c=[A-Za-z0-9_-]+$`));
    return link;
  }

  // ----- privacy -----

  /** Nothing was requested from another origin, and nothing made a request of its own after the page loaded */
  async expectNothingLeftTheBrowser(): Promise<void> {
    const origin = new URL(this.page.url()).origin;
    const elsewhere = this.requested.filter(request => new URL(request.url).origin !== origin).map(request => request.url);
    const talking = this.requested.slice(this.requestsAtLoad).filter(request => TALKING_TYPES.includes(request.type));
    // Requests are recorded as they happen; there is no element to poll
    expect({ elsewhere, talking: talking.map(request => `${request.type} ${request.url}`) }, 'requests the page made').toEqual({
      elsewhere: [],
      talking: [],
    });
  }

  /** The address carries the share link's fragment, and no figures in its path or query */
  async expectAddressHoldsLink(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${escaped(this.path)}#c=[A-Za-z0-9_-]+$`));
  }

  async expectAddressWithoutLink(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${escaped(this.path)}(#(?!c=).*)?$`));
  }

  // ----- the page as a whole -----

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    await this.stillOnTheCalculator('expectNoSeriousAccessibilityViolations');
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
}

/**
 * A calculator in the preview pseudo-locales (`xx-long`, `xx-ar`), to check that long text and
 * right-to-left text lay out. The pseudo-locales have no fixed words to write out, so a subclass
 * takes the button names from the generated text of the English source.
 */
export abstract class ToolLayoutPage {
  protected constructor(
    protected readonly page: Page,
    protected readonly locale: ShellLocale,
    protected readonly path: string
  ) {}

  /** The page is the calculator in this locale, in this direction, and its script has started */
  protected async expectOnPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/${this.locale}${escaped(this.path)}$`), { timeout: NAVIGATION_TIMEOUT });
    await expect(this.page.locator('html')).toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
  }

  protected address(): string {
    return pathFor(this.locale, this.path);
  }

  /** No element sticks out past the page's width (the page must not scroll sideways) */
  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            const offenders: string[] = [];
            if (document.documentElement.scrollWidth > width) offenders.push('<html> scrolls sideways');
            for (const el of document.querySelectorAll<HTMLElement>('main *')) {
              if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                offenders.push(`${el.tagName.toLowerCase()}.${el.className} spans ${Math.round(rect.left)}..${Math.round(rect.right)} of ${width}`);
              }
            }
            return offenders.slice(0, 5);
          }),
        { message: 'elements wider than the page', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }
}
