import { expect, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT } from './timeouts';

/**
 * Wait until no finite animation or transition is running. A fade blends text with its background while
 * it runs, so an accessibility check (colour contrast) would depend on when it samples. Infinite ambient
 * loops and scroll-driven animations never finish, so they are left out.
 */
export async function expectAnimationsSettled(page: Page): Promise<void> {
  // Two frames first: a fade triggered by an IntersectionObserver (`.fade-up`) starts only after the
  // observer's first callback, so an empty list read before then would not mean the page is still.
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .filter(a => a.playState === 'running' && a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity)
            .map(a => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'animation')
        ),
      { message: 'finite animations still running', timeout: ELEMENT_TIMEOUT }
    )
    .toEqual([]);
}
