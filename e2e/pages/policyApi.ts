import { expect, type Page, type Route } from '@playwright/test';
import { ELEMENT_TIMEOUT } from './timeouts';

/** The production API origin the policy pages read from. Tests never reach it: every request is answered here. */
const API = 'https://app.sidebadger.me/api/policies/**';

export type PolicyReply =
  | { kind: 'ok'; markdown?: string }
  | { kind: 'status'; status: number }
  | { kind: 'empty' }
  | { kind: 'malformed'; contentType: string; body: string }
  | { kind: 'hang' }
  | { kind: 'hold' };

/** The sample policy's top heading (`#` in the Markdown, an h2 on the page) */
export const SAMPLE_HEADING = 'Policy of the sample';

/**
 * The stubbed policy text has arrived and is on the page. Shell and audit checks on a legal page
 * (overflow, axe) must run against the policy's content, not the loading state.
 */
export async function expectStubPolicyShown(page: Page): Promise<void> {
  await expect(page.getByRole('main').getByRole('heading', { name: SAMPLE_HEADING }), 'the stubbed policy text').toBeVisible({
    timeout: ELEMENT_TIMEOUT,
  });
}

/** Wide enough to scroll on a phone, with a heading before it and a link after */
export const SAMPLE_MARKDOWN = [
  `# ${SAMPLE_HEADING}`,
  '',
  '**Last revised: 18 November 2026.** We keep this *short*.',
  '',
  '## Your data',
  '',
  '- First point',
  '- Second point with a [contact](mailto:privacy@example.com)',
  '',
  '### Who we share it with',
  '',
  '| Provider | Purpose | Country | Retention | Legal basis | Notes |',
  '|---|---|---|---|---|---|',
  '| Example Hosting Limited | Running the service for every group | United Kingdom | While the account exists | Contract | Plenty of words so this row is wide |',
  '| Another Processor Incorporated | Sending sign-in emails | United States | Thirty days | Legitimate interests | More words to make it wide enough |',
  '',
  'Read the [full terms](https://example.com/terms).',
].join('\n');

/** Every way the payload could try to run script or load something */
export const XSS_MARKDOWN = [
  '## Hostile policy',
  '',
  '<script>window.__xss = "script"</script>',
  '',
  'Inline <img src=x onerror="window.__xss=\'img\'"> and <b onclick="window.__xss=\'b\'">bold</b>.',
  '',
  '[click](javascript:window.__xss=\'link\') and [data](data:text/html;base64,PHNjcmlwdD53aW5kb3cuX194c3M9J2RhdGEnPC9zY3JpcHQ+)',
  '',
  '<iframe src="javascript:window.__xss=\'iframe\'"></iframe>',
  '',
  '| head <img src=x onerror="window.__xss=\'cell\'"> |',
  '|---|',
  '| <svg onload="window.__xss=\'svg\'"> |',
  '',
  '[safe](https://example.com/ok)',
].join('\n');

/**
 * Stands in for the app's policy API. `/text` follows the current reply, `/current` the metadata reply, and either
 * can be changed between requests (a failure first, then a retry). A held reply waits for `release()`.
 */
export class PolicyApi {
  textReply: PolicyReply = { kind: 'ok' };
  /** `undefined`: the metadata request fails */
  createdAt: string | undefined = '2026-11-18T22:56:13.851Z';
  readonly requests: string[] = [];
  private released: (() => void)[] = [];

  /** Answer every policy request on the page. Call before navigating. */
  static async install(page: Page): Promise<PolicyApi> {
    const api = new PolicyApi();
    await page.route(API, route => api.answer(route));
    return api;
  }

  release(): void {
    this.released.splice(0).forEach(resolve => resolve());
  }

  private async answer(route: Route): Promise<void> {
    const url = route.request().url();
    this.requests.push(url);
    const cors = { 'access-control-allow-origin': '*' };
    if (url.endsWith('/current')) {
      if (!this.createdAt) return route.fulfill({ status: 500, headers: cors, body: 'down' });
      return route.fulfill({
        headers: { ...cors, 'content-type': 'application/x-serialized-json; charset=utf-8' },
        body: JSON.stringify({ id: 'x', policyName: 'X', currentVersionHash: 'h', text: 'ignored', createdAt: this.createdAt }),
      });
    }
    const reply = this.textReply;
    const text = { ...cors, 'content-type': 'text/plain; charset=utf-8' };
    switch (reply.kind) {
      case 'ok':
        return route.fulfill({ headers: text, body: reply.markdown ?? SAMPLE_MARKDOWN });
      case 'status':
        return route.fulfill({ status: reply.status, headers: text, body: 'Internal Server Error' });
      case 'empty':
        return route.fulfill({ headers: text, body: '  \n' });
      case 'malformed':
        return route.fulfill({ headers: { ...cors, 'content-type': reply.contentType }, body: reply.body });
      case 'hold':
        await new Promise<void>(resolve => this.released.push(resolve));
        return route.fulfill({ headers: text, body: SAMPLE_MARKDOWN });
      case 'hang':
        // Never answered: the page's own timeout has to end the wait. The test closes with the page.
        return new Promise<void>(() => {});
    }
  }
}

/** Pages other than the policy specs also open a policy page (shell, locale and accessibility audits): answer it quietly. */
export async function stubPolicyApi(page: Page): Promise<void> {
  await PolicyApi.install(page);
}
