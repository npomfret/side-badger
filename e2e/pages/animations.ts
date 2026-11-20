import { expect, test, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT } from './timeouts';

/** Audited boundary for animation assertions, retained with the test's result. */
export async function auditAnimationWait(operation: string, action: () => Promise<unknown>): Promise<void> {
  const started = performance.now();
  let outcome = 'failed';
  try {
    await action();
    outcome = 'passed';
  } finally {
    test.info().annotations.push({ type: 'animation-wait', description: JSON.stringify({
      operation, expected: operation, outcome, elapsedMs: Math.round(performance.now() - started), timeoutMs: ELEMENT_TIMEOUT,
    }) });
  }
}

/**
 * Wait until no finite animation or transition is running. A fade blends text with its background while
 * it runs, so an accessibility check (colour contrast) would depend on when it samples. Infinite ambient
 * loops and scroll-driven animations never finish, so they are left out.
 */
export async function expectAnimationsSettled(page: Page): Promise<void> {
  // Two frames first: a fade triggered by an IntersectionObserver (`.fade-up`) starts only after the
  // observer's first callback, so an empty list read before then would not mean the page is still.
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await auditAnimationWait('timed scenes have finished their pass', () => expect.poll(
    // Timers can be between stages, or pending their first observer/paint callback, with no CSS
    // animation running yet. Offscreen phone visuals deliberately remain pending until entry.
    () => page.locator('[data-play="once"]').evaluateAll(scenes => scenes.filter(scene => {
      if (document.documentElement.dataset.sceneEngine === 'static') return false;
      const state = (scene as HTMLElement).dataset.playState;
      if (state === 'done') return false;
      if (state === 'playing' || innerWidth >= 600) return true;
      const visual = scene.querySelector('[data-scene-entry]') ?? scene;
      const rect = visual.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
      return rect.height > 0 && visible / rect.height >= 0.25;
    }).length),
    { message: 'timed scenes still playing or ready to start', timeout: ELEMENT_TIMEOUT }
  ).toBe(0));
  await auditAnimationWait('finite animations have settled', () => expect
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
    .toEqual([]));
}
