import type { Page } from '@playwright/test';

/**
 * Sets the browser's default text size, as a visitor's "larger text" setting does. The site sizes
 * text and its rem breakpoints from it. Call before navigating.
 */
export async function setBrowserTextSize(page: Page, textSizePx: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: textSizePx, fixed: Math.round((textSizePx * 13) / 16) } });
}
