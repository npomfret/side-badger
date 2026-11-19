import { test } from '@playwright/test';
import { XSS_MARKDOWN } from './pages/policyApi';
import { PolicyPage, type PolicyRoute } from './pages/policyPage';

/**
 * The legal pages load their policy from the app API in the browser. The API is always stubbed (never the
 * real one): success, a slow reply, a 500, a reply that never comes, empty and malformed bodies, a retry that
 * works, a hostile policy, and metadata that fails. English, a localized shell and an RTL locale, desktop and phone.
 * The real API is checked separately (see tasks/load-policies-from-api.md).
 */
const ROUTES: PolicyRoute[] = ['privacy', 'terms', 'cookies'];

test.describe('English at 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const route of ROUTES) {
    test(`${route}: loads the policy from the app API, with one h1, the publication date and usable tables`, async ({ page }) => {
      const policy = await PolicyPage.navigateTo(page, 'en', route);
      await policy.expectLoaded();
      await policy.expectSingleH1();
      await policy.expectPublicationDate('Last updated November 18, 2026');
      await policy.expectEnglishLtrBody();
      await policy.expectTablesUsable();
      await policy.expectRequestedSource();
      await policy.expectNoSeriousAccessibilityViolations();
    });
  }

  test('a slow reply shows the busy loading state, then the policy', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'hold' });
    await policy.expectLoading();
    policy.api.release();
    await policy.expectLoaded();
  });

  test('a 500 shows the message and Try again, with no policy text; the shell stays up', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'terms', { kind: 'status', status: 500 });
    await policy.expectFailure();
    await policy.expectNoSeriousAccessibilityViolations();
  });

  test('Try again recovers: the failure clears and the policy loads', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'cookies', { kind: 'status', status: 503 });
    await policy.expectFailure();
    policy.api.textReply = { kind: 'ok' };
    await policy.retry();
    await policy.expectLoaded();
    await policy.expectPublicationDate('Last updated November 18, 2026');
    await policy.expectRequestCount(2);
  });

  test('Try again moves focus to the status message and a second failure shows it again', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'status', status: 500 });
    await policy.expectFailure();
    await policy.retry();
    await policy.expectFocusOnStatus();
    await policy.expectFailure();
    await policy.expectRequestCount(2);
  });

  test('a reply that never comes ends at 10 seconds with the failure state', async ({ page }) => {
    await page.clock.install();
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'hang' });
    await policy.expectLoading();
    await page.clock.fastForward(9_000);
    await policy.expectLoading();
    await policy.passTimeout();
    await policy.expectFailure();
  });

  test('a timeout then a working retry loads the policy', async ({ page }) => {
    await page.clock.install();
    const policy = await PolicyPage.navigateTo(page, 'en', 'terms', { kind: 'hang' });
    await policy.expectLoading();
    await policy.passTimeout();
    await policy.expectFailure();
    policy.api.textReply = { kind: 'ok' };
    await policy.retry();
    await policy.expectLoaded();
  });

  test('an empty body is a failure', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'empty' });
    await policy.expectFailure();
  });

  for (const [name, contentType, body] of [
    ['JSON', 'application/json', '{"error":"policy not found"}'],
    ['an HTML error page', 'text/html; charset=utf-8', '<html><body><h1>Bad gateway</h1></body></html>'],
    ['a body with NUL bytes', 'text/plain', 'looks fine\u0000but is not'],
  ] as const) {
    test(`a malformed reply (${name}) is a failure`, async ({ page }) => {
      const policy = await PolicyPage.navigateTo(page, 'en', 'cookies', { kind: 'malformed', contentType, body });
      await policy.expectFailure();
    });
  }

  test('text without metadata shows the policy and no date', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'ok' }, { createdAt: undefined });
    await policy.expectLoaded();
    await policy.expectNoPublicationDate();
  });

  test('a hostile policy runs nothing and renders no dangerous element, attribute or link', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy', { kind: 'ok', markdown: XSS_MARKDOWN });
    await policy.expectNothingExecuted(dialogs);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ROUTES) {
    test(`${route}: explains and links to the source text`, async ({ page }) => {
      const policy = await PolicyPage.navigateTo(page, 'en', route);
      await policy.expectNoScriptFallback();
    });
  }
});

test.describe('English at 375x812', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('a wide table scrolls inside a keyboard-reachable region without moving the page', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'privacy');
    await policy.expectLoaded();
    await policy.expectTableScrollsOnPhone();
    await policy.expectTablesUsable();
  });

  test('the failure state fits the phone', async ({ page }) => {
    const policy = await PolicyPage.navigateTo(page, 'en', 'terms', { kind: 'status', status: 500 });
    await policy.expectFailure();
    await policy.expectNoSeriousAccessibilityViolations();
  });
});

for (const locale of ['de', 'ar'] as const) {
  for (const viewport of [
    { name: '1280', size: { width: 1280, height: 800 } },
    { name: '375', size: { width: 375, height: 812 } },
  ]) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      test('keeps the English policy marked lang=en and ltr under the translated shell and notice', async ({ page }) => {
        const policy = await PolicyPage.navigateTo(page, locale, 'terms');
        await policy.expectLoaded();
        await policy.expectEnglishLtrBody();
        await policy.expectEnglishOnlyNotice();
        await policy.expectTablesUsable();
        await policy.expectNoSeriousAccessibilityViolations();
      });

      test('shows the translated loading, failure and retry, in the page direction', async ({ page }) => {
        const policy = await PolicyPage.navigateTo(page, locale, 'privacy', { kind: 'hold' });
        await policy.expectLoading();
        policy.api.release();
        await policy.expectLoaded();
        const failing = await PolicyPage.navigateTo(page, locale, 'cookies', { kind: 'status', status: 500 });
        await failing.expectFailure();
        await failing.expectFailureLayoutMatchesDirection();
        await failing.expectNoSeriousAccessibilityViolations();
        failing.api.textReply = { kind: 'ok' };
        await failing.retry();
        await failing.expectLoaded();
      });
    });
  }
}
