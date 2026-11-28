import type { Page, Route } from '@playwright/test';
import { referenceDocument } from '../../src/__tests__/fixtures/reference-document';

export type ReferenceReply =
  | { readonly kind: 'ok'; readonly document?: unknown }
  | { readonly kind: 'status'; readonly status: number }
  | { readonly kind: 'hold' }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'network' };

/** One network stub for focused reference checks and the shared whole-site audits. */
export class ReferenceApi {
  reply: ReferenceReply = { kind: 'ok' };
  private readonly held = Promise.withResolvers<void>();
  private readonly requests: { cookie: string | undefined; url: string }[] = [];

  static async install(page: Page): Promise<ReferenceApi> {
    const api = new ReferenceApi();
    await page.route('https://app.sidebadger.me/api/docs', route => api.respond(route));
    return api;
  }

  release(): void { this.held.resolve(); }

  observedRequests(): readonly { cookie: string | undefined; url: string }[] {
    return this.requests.map(request => ({ ...request }));
  }

  private async respond(route: Route): Promise<void> {
    this.requests.push({ cookie: route.request().headers()['cookie'], url: route.request().url() });
    const reply = this.reply;
    const headers = { 'access-control-allow-origin': '*' };
    if (reply.kind === 'network') { await route.abort('failed'); return; }
    if (reply.kind === 'hold') await this.held.promise;
    if (reply.kind === 'status') { await route.fulfill({ status: reply.status, headers, body: 'Unavailable' }); return; }
    if (reply.kind === 'malformed') { await route.fulfill({ headers, contentType: 'application/json', body: 'not JSON' }); return; }
    const document = reply.kind === 'ok' ? reply.document ?? referenceDocument(17, { path: '/examples' }) : referenceDocument(17, { path: '/examples' });
    await route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(document) });
  }
}
