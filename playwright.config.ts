import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks for the site (restructure step 5). The server is a build of this checkout with
 * the preview pages and the four pseudo-locales (`xx-long`, `xx-ar`, `xx-ja`, `xx-hi`) turned on,
 * served by `astro preview`. Retries stay off: a flaky test is a failing test.
 *
 * E2E_PORT picks the port (default 18520). I18N_MODE defaults to `english-first`, the mode of the
 * `redesign` branch.
 */
const port = Number(process.env.E2E_PORT ?? 18520);
const mode = process.env.I18N_MODE ?? 'english-first';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results/playwright',
  // Shard individual cases while the single worker still runs them serially.
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['junit', { outputFile: 'test-results/playwright.xml' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command:
      `I18N_MODE=${mode} PREVIEW_UNPUBLISHED=1 PREVIEW_PSEUDO=1 npm run build && ` +
      // Playwright owns this process; bypass Astro 7's agent auto-backgrounding.
      `npx astro preview --ignore-lock --port ${port}`,
    stdout: 'pipe',
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
