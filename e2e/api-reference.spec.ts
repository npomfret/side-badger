import { test } from '@playwright/test';
import { ApiReferencePage } from './pages/apiReferencePage';
import { referenceDocument } from '../src/__tests__/fixtures/reference-document';

for (const width of [375, 1280]) {
  test.describe(`API reference at ${width}px`, () => {
    test.use({ viewport: { width, height: 812 } });
    test('loads the source, filters operations and expands response schemas accessibly', async ({ page }) => {
      const reference = await ApiReferencePage.navigateTo(page);
      await reference.expectLoaded();
      await reference.expectPreview();
      reference.expectRequestedSource();
      await reference.search('create', ['POST /examples Create example']);
      await reference.search('nothing matches here', []);
      await reference.search('', ['GET /examples List examples', 'POST /examples Create example']);
      await reference.expandOperation();
      await reference.expectUsable();
    });
  });
}

test('announces loading while the source is pending', async ({ page }) => {
  const reference = await ApiReferencePage.navigateTo(page, { kind: 'hold' });
  await reference.expectLoading();
  reference.release();
  await reference.expectLoaded();
});

for (const reply of [{ kind: 'status', status: 503 }, { kind: 'malformed' }, { kind: 'network' }, { kind: 'ok', document: {} }] as const) {
  test(`recovers from ${reply.kind} with a fresh retry`, async ({ page }) => {
    const reference = await ApiReferencePage.navigateTo(page, reply);
    await reference.expectFailure();
    await reference.expectUsable();
    await reference.retry({ kind: 'ok' });
    await reference.expectLoaded();
    await reference.expectFocusRecovered();
  });
}

test('times out a hanging request and retries', async ({ page }) => {
  await page.clock.install();
  const reference = await ApiReferencePage.navigateTo(page, { kind: 'hold' });
  await reference.expectLoading();
  await reference.passTimeout();
  await reference.expectFailure();
  await reference.retry({ kind: 'ok' });
  await reference.expectLoaded();
  reference.release();
});

test('upstream updates appear on reload without rebuilding', async ({ page }) => {
  const reference = await ApiReferencePage.navigateTo(page);
  await reference.expectLoaded();
  await reference.reloadWith(referenceDocument(31, { title: 'Updated reference' }), 'Updated reference');
});

test('renders hostile upstream strings literally', async ({ page }) => {
  const reference = await ApiReferencePage.navigateTo(page, { kind: 'ok', document: referenceDocument(9, {
    title: '<img src=x onerror=alert(1)>', description: '<script>alert(1)</script> [bad](javascript:alert(1))',
  }) });
  await reference.expectLoaded('<img src=x onerror=alert(1)>');
  await reference.expectSafe();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('retains the shell and source link', async ({ page }) => {
    const reference = await ApiReferencePage.navigateTo(page);
    await reference.expectPreview();
  });
});
