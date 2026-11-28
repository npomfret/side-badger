import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { ReferenceApi, type ReferenceReply } from './referenceApi';
import { auditAnimationWait as auditWait } from './animations';
import { pathFor } from './strings';

export type { ReferenceReply } from './referenceApi';

/** Owns the reference's HTTP stub and user interactions. Live checks can omit the stub explicitly. */
export class ApiReferencePage {
  private constructor(private readonly page: Page, private readonly api: ReferenceApi | undefined) {}

  static async navigateTo(page: Page, reply: ReferenceReply = { kind: 'ok' }, live = false): Promise<ApiReferencePage> {
    const api = live ? undefined : await ReferenceApi.install(page);
    if (api) api.reply = reply;
    const reference = new ApiReferencePage(page, api);
    await page.goto(pathFor('en', 'developers/api/'));
    await auditWait('API reference shell loaded', async () => {
      await expect(page).toHaveURL(pathFor('en', 'developers/api/'));
      await expect(page.getByRole('heading', { level: 1, name: 'API reference', exact: true })).toBeVisible();
    });
    return reference;
  }

  private get reference() { return this.page.getByRole('region', { name: 'API reference', exact: true }); }
  private get body() { return this.reference.getByRole('region', { name: 'Reference contract', includeHidden: true }); }
  private get status() { return this.reference.getByRole('status', { name: 'Reference status', exact: true }); }
  private get retryButton() { return this.reference.getByRole('button', { name: 'Try again', exact: true, includeHidden: true }); }
  private get filter() { return this.reference.getByRole('searchbox', { name: 'Filter operations' }); }

  release(): void { this.api?.release(); }

  async expectLoading(): Promise<void> {
    await auditWait('reference announces loading', async () => {
      await expect(this.status).toHaveText('Loading the API reference…');
      await expect(this.body).toBeHidden();
      await expect(this.body).toHaveAttribute('aria-busy', 'true');
    });
  }

  async expectLoaded(title = 'Reference 17', operations = 2): Promise<void> {
    await auditWait('reference displays source operations', async () => {
      await expect(this.body).toBeVisible();
      await expect(this.body).toContainText(title);
      await expect(this.body.getByRole('group', { name: /^(GET|PUT|POST|DELETE|OPTIONS|HEAD|PATCH|TRACE) / })).toHaveCount(operations);
      await expect(this.body).toHaveAttribute('aria-busy', 'false');
      await expect(this.filter).toBeVisible();
      await expect(this.retryButton).toBeHidden();
    });
  }

  async expectFailure(): Promise<void> {
    await auditWait('reference announces failure and offers retry', async () => {
      await expect(this.status).toHaveText('The API reference is unavailable. Try again, or open the source contract.');
      await expect(this.retryButton).toBeVisible();
      await expect(this.body).toBeEmpty();
      await expect(this.body).toBeHidden();
      await expect(this.body).toHaveAttribute('aria-busy', 'false');
    });
  }

  async retry(reply: ReferenceReply): Promise<void> {
    if (!this.api) throw new Error('Retry fixtures require a stubbed source');
    this.api.reply = reply;
    await this.retryButton.click();
  }

  async expectFocusRecovered(): Promise<void> {
    await auditWait('retry restores focus to reference', () => expect(this.body).toBeFocused());
  }

  async search(query: string, summaries: readonly string[]): Promise<void> {
    await this.filter.fill(query);
    await auditWait('operation filter matches', async () => {
      await expect(this.body.getByRole('group', { name: /^(GET|PUT|POST|DELETE|OPTIONS|HEAD|PATCH|TRACE) / })).toHaveCount(summaries.length);
      for (const summary of summaries) {
        await expect(this.body.getByRole('group', { name: summary, exact: true })).toBeVisible();
      }
      if (!summaries.length) await expect(this.page.getByText('No matching operations.', { exact: true })).toBeVisible();
      else await expect(this.page.getByText('No matching operations.', { exact: true })).toBeHidden();
    });
  }

  async expandOperation(): Promise<void> {
    const operation = this.body.getByRole('group', { name: 'GET /examples List examples', exact: true });
    // Native summary is exposed as generic on this browser; its visible text is the semantic fallback.
    await operation.getByText('GET /examples List examples', { exact: true }).focus();
    await this.page.keyboard.press('Enter');
    await operation.getByText('responses', { exact: true }).click();
    await auditWait('keyboard opens operation and response schema', () => expect(operation.getByText('"type": "array"', { exact: false })).toBeVisible());
  }

  async expectSafe(): Promise<void> {
    await auditWait('hostile reference is inert text', async () => {
      await expect(this.body).toContainText('<img src=x onerror=alert(1)>');
      // Security inspection: forbidden elements/handlers have no usable accessible role or name.
      await expect(this.body.locator('img,script,iframe,svg,a')).toHaveCount(0);
      await expect(this.body.locator('[onclick],[onerror],[onload]')).toHaveCount(0);
      await expect(this.page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
  }

  async expectPreview(): Promise<void> {
    await auditWait('reference remains an English preview without Markdown', async () => {
      // Head metadata is not user-facing UI and has no accessible locators.
      await expect(this.page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(this.page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveCount(0);
      await expect(this.page.locator('link[rel="service-desc"]')).toHaveAttribute('href', 'https://app.sidebadger.me/api/docs');
      await expect(this.page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(this.page.getByRole('link', { name: 'OpenAPI source', exact: true })).toHaveAttribute('href', 'https://app.sidebadger.me/api/docs');
    });
  }

  async expectUsable(): Promise<void> {
    await auditWait('reference fits viewport', () => expect.poll(() => this.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0));
    const results = await new AxeBuilder({ page: this.page }).analyze();
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  }

  async reloadWith(document: unknown, title: string): Promise<void> {
    if (!this.api) throw new Error('Reload fixtures require a stubbed source');
    this.api.reply = { kind: 'ok', document };
    await this.page.reload();
    await this.expectLoaded(title);
  }

  async passTimeout(): Promise<void> { await this.page.clock.fastForward(10_000); }

  async capture(path: string): Promise<void> { await this.page.screenshot({ path, fullPage: false }); }

  expectRequestedSource(): void {
    expect(this.api?.observedRequests()).toEqual([{ cookie: undefined, url: 'https://app.sidebadger.me/api/docs' }]);
  }
}
