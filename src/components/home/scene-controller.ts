/**
 * The homepage scene controller (homepage plan, "Animation technology" and "Prototype findings").
 *
 * It adds no scroll listeners and no permanent animation loop. It:
 *   - picks the motion engine: `native` (CSS view timelines), `stages` (the fallback for Firefox
 *     release, Safari before 26 and Chromium before 115, or when forced with `?scenes=stages`)
 *     or `static` (reduced motion, or a viewport shorter than 560 px: nothing is pinned);
 *   - on the stages engine, appends hidden stage regions to each pinned scene and sets
 *     `data-stage` on the scene from the highest region crossing the middle of the viewport
 *     (entry scenes get their last stage once they scroll into view, or out of it for
 *     `data-stage-on="exit"`);
 *   - sets `data-near` (within one viewport) and `data-active` on scenes, which start ambient
 *     loops, and stops each loop 5 s after the scene activates (WCAG 2.2.2);
 *   - brings the matching world into view when keyboard focus lands inside a pinned
 *     `[data-scene-track]` (a mouse click on a visible panel does not move the page);
 *   - loads canvas-confetti on first use, never under reduced motion.
 *
 * Under reduced motion it does nothing beyond focus handling: every scene rests at its
 * `data-static-stage`, which the server already rendered.
 *
 * Markup contract (see ScrollScene.astro and scenes.css):
 *   section.scene[data-scene][data-stages][data-static-stage][data-pin][data-pin-phone]
 *     > .scene__runway > .scene__stage                           stage regions go in the runway
 *   [data-scene-track][data-track-range="a,b"] > [data-panel]   the pinned horizontal track
 *   [data-confetti]                                              fires confetti when clicked
 *   [data-confetti-at="N"] on a scene                            fires once at N % of its range
 *   document event `home:confetti` ({ detail: { x, y } } in 0..1)  fires from a scene's own code
 */
type Engine = 'native' | 'stages' | 'static';

const root = document.documentElement;
const flatQuery = matchMedia('(prefers-reduced-motion: reduce), (max-height: 559px)');
const phoneQuery = matchMedia('(max-width: 599px)');

const supportsTimelines = () =>
  CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: contain 0% contain 100%');
const forcedStages = () => /[?&]scenes=stages(&|$)/.test(location.search);

function pickEngine(): Engine {
  if (flatQuery.matches) return 'static';
  return supportsTimelines() && !forcedStages() ? 'native' : 'stages';
}

const scenes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.scene[data-scene]')];
const isPinned = (scene: HTMLElement) =>
  (phoneQuery.matches ? scene.dataset.pinPhone : scene.dataset.pin) === 'pinned';
const boundaries = (scene: HTMLElement) =>
  (scene.dataset.stages ?? '').split(',').filter(Boolean).map(Number);
const lastStage = (scene: HTMLElement) => boundaries(scene).length || 1;
/** The runway: the scrolled box that carries the view timeline and the stage regions */
const runwayOf = (scene: HTMLElement) => scene.querySelector<HTMLElement>(':scope > .scene__runway') ?? scene;
const sceneOf = (el: Element) => el.closest<HTMLElement>('.scene[data-scene]')!;

/** What setup() created, so teardown() can undo it */
let cleanups: Array<() => void> = [];

function region(scene: HTMLElement, from: number, to: number): HTMLElement {
  const el = document.createElement('i');
  el.className = 'scene-region';
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--s', String(from / 100));
  el.style.setProperty('--e', String(to / 100));
  runwayOf(scene).append(el);
  cleanups.push(() => el.remove());
  return el;
}

function observe(
  options: IntersectionObserverInit,
  callback: IntersectionObserverCallback
): IntersectionObserver {
  const io = new IntersectionObserver(callback, options);
  cleanups.push(() => io.disconnect());
  return io;
}

/** Stages engine: data-stage from regions (pinned scenes) or from entering the viewport (entry scenes). */
function setUpStages() {
  const hits = new Map<HTMLElement, Set<number>>();
  const mid = observe({ rootMargin: '-50% 0px -50% 0px' }, entries => {
    const touched = new Set<HTMLElement>();
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const scene = sceneOf(el);
      const set = hits.get(scene) ?? new Set<number>();
      hits.set(scene, set);
      const index = Number(el.dataset.stageIndex);
      if (entry.isIntersecting) set.add(index);
      else set.delete(index);
      touched.add(scene);
    }
    for (const scene of touched) {
      const set = hits.get(scene)!;
      const stage = set.size
        ? Math.max(...set)
        : runwayOf(scene).getBoundingClientRect().top < 0
          ? lastStage(scene)
          : 0;
      scene.dataset.stage = String(stage);
    }
  });
  // The first callback assigns every entry scene: done if in view or already passed, else 0. Until
  // then each keeps its server-rendered resting stage, so nothing in view blinks out on load.
  const entered = observe({ rootMargin: '0px 0px -30% 0px' }, entries => {
    for (const entry of entries) {
      const scene = entry.target as HTMLElement;
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        scene.dataset.stage = String(lastStage(scene));
        entered.unobserve(scene);
      } else {
        scene.dataset.stage = '0';
      }
    }
  });

  // Exit scenes (the hero) rest at stage 0 and reach their last stage as they scroll out
  const exited = observe({ rootMargin: '-60% 0px 0px 0px' }, entries => {
    for (const entry of entries) {
      const scene = entry.target as HTMLElement;
      const gone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      scene.dataset.stage = gone ? String(lastStage(scene)) : '0';
    }
  });

  for (const scene of scenes()) {
    if (isPinned(scene)) {
      const edges = [0, ...boundaries(scene), 100];
      for (let i = 0; i < edges.length - 1; i++) {
        const el = region(scene, edges[i], edges[i + 1]);
        el.dataset.stageIndex = String(i);
        mid.observe(el);
      }
    } else {
      (scene.dataset.stageOn === 'exit' ? exited : entered).observe(scene);
    }
  }
  // Transitions start only once the first stages are assigned, so a reload mid-page does not replay
  requestAnimationFrame(() => requestAnimationFrame(() => (root.dataset.sceneReady = '')));
}

/** data-near and data-active, and the 5 s limit on ambient loops. */
function setUpActivity() {
  const timers = new Map<HTMLElement, number>();
  const near = observe({ rootMargin: '100% 0px' }, entries => {
    for (const entry of entries) {
      (entry.target as HTMLElement).toggleAttribute('data-near', entry.isIntersecting);
    }
  });
  const active = observe({}, entries => {
    for (const entry of entries) {
      const scene = entry.target as HTMLElement;
      clearTimeout(timers.get(scene));
      scene.removeAttribute('data-ambient-done');
      scene.toggleAttribute('data-active', entry.isIntersecting);
      if (entry.isIntersecting) {
        timers.set(scene, window.setTimeout(() => scene.setAttribute('data-ambient-done', ''), 5000));
      }
    }
  });
  for (const scene of scenes()) {
    near.observe(scene);
    active.observe(scene);
  }
  cleanups.push(() => timers.forEach(timer => clearTimeout(timer)));
}

/** Scenes with data-confetti-at fire once when that point of their range is mid-viewport. */
function setUpConfettiTriggers() {
  const fireOnce = observe({ rootMargin: '-50% 0px -50% 0px' }, entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      fireOnce.unobserve(entry.target);
      const box = entry.boundingClientRect;
      fireConfetti(0.5, Math.min(0.9, Math.max(0.1, (box.top + box.height / 2) / innerHeight)));
    }
  });
  for (const scene of scenes()) {
    const at = Number(scene.dataset.confettiAt);
    if (!scene.dataset.confettiAt || Number.isNaN(at)) continue;
    fireOnce.observe(isPinned(scene) ? region(scene, at, 100) : scene);
  }
}

const importConfetti = () => import('canvas-confetti').then(module => module.default);
let confettiPromise: ReturnType<typeof importConfetti> | undefined;
function fireConfetti(x = 0.5, y = 0.6) {
  if (flatQuery.matches) return;
  confettiPromise ??= importConfetti();
  void confettiPromise.then(confetti =>
    confetti({ particleCount: 90, spread: 70, origin: { x, y }, disableForReducedMotion: true })
  );
}

/** Keyboard focus inside the pinned horizontal track scrolls the page to that panel's point. */
function onFocusIn(event: FocusEvent) {
  const target = event.target as Element | null;
  const track = target?.closest<HTMLElement>('[data-scene-track]');
  const scene = track?.closest<HTMLElement>('.scene[data-scene]');
  if (!track || !scene || root.dataset.sceneEngine !== 'native' || !isPinned(scene)) return;
  if (!target!.matches(':focus-visible')) return;
  const panels = [...track.querySelectorAll<HTMLElement>('[data-panel]')];
  const index = panels.findIndex(panel => panel.contains(target));
  if (index < 0 || panels.length < 2) return;
  const [from, to] = (track.dataset.trackRange ?? '0,100').split(',').map(Number);
  const fraction = (from + ((to - from) * index) / (panels.length - 1)) / 100;
  const runway = runwayOf(scene);
  const stage = runway.querySelector<HTMLElement>('.scene__stage')!;
  const header = parseFloat(getComputedStyle(stage).insetBlockStart) || 0;
  const pinnedFor = runway.offsetHeight - stage.offsetHeight;
  const top = scrollY + runway.getBoundingClientRect().top - header + fraction * pinnedFor;
  if (Math.abs(top - scrollY) > 2) scrollTo({ top, behavior: 'instant' as ScrollBehavior });
}

function setUp() {
  cleanups.forEach(cleanup => cleanup());
  cleanups = [];
  const engine = pickEngine();
  root.dataset.sceneEngine = engine;

  if (engine === 'static') {
    delete root.dataset.sceneReady;
    for (const scene of scenes()) {
      scene.dataset.stage = scene.dataset.staticStage ?? String(lastStage(scene));
      scene.removeAttribute('data-active');
      scene.removeAttribute('data-near');
    }
    return;
  }
  if (engine === 'stages') setUpStages();
  setUpActivity();
  setUpConfettiTriggers();
}

export function initScenes() {
  setUp();
  flatQuery.addEventListener('change', setUp);
  phoneQuery.addEventListener('change', setUp);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('visibilitychange', () => root.toggleAttribute('data-hidden', document.hidden));
  document.addEventListener('home:confetti', event => {
    const { x, y } = (event as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
    fireConfetti(x, y);
  });
  document.addEventListener('click', event => {
    const el = (event.target as Element | null)?.closest<HTMLElement>('[data-confetti]');
    if (!el) return;
    const box = el.getBoundingClientRect();
    fireConfetti((box.x + box.width / 2) / innerWidth, (box.top + box.height / 2) / innerHeight);
  });
}
