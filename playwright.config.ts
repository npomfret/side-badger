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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      `I18N_MODE=${mode} PREVIEW_UNPUBLISHED=1 PREVIEW_PSEUDO=1 npm run build && ` +
      `npx astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
