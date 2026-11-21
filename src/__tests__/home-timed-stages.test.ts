import { describe, expect, it } from 'vitest';
import { playTimedStages, timedScene, type PlayState } from '@/components/home/scene-controller';

/** In-memory scheduler: no browser globals or elapsed wall time are needed to play a scene. */
function scheduler() {
  let now = 0;
  const pending: Array<{ at: number; callback: () => void; cancelled: boolean }> = [];
  return {
    after(ms: number, callback: () => void) {
      const task = { at: now + ms, callback, cancelled: false };
      pending.push(task);
      return () => { task.cancelled = true; };
    },
    advanceTo(ms: number) {
      now = ms;
      pending.filter(task => task.at <= ms && !task.cancelled).forEach(task => {
        task.cancelled = true;
        task.callback();
      });
    },
    deliverLate() { pending.forEach(task => task.callback()); },
  };
}

/** In-memory paint: `afterPaint` callbacks run when the test says the reset has painted. */
function painter() {
  const pending: Array<{ callback: () => void; cancelled: boolean }> = [];
  return {
    afterPaint(callback: () => void) {
      const task = { callback, cancelled: false };
      pending.push(task);
      return () => { task.cancelled = true; };
    },
    paint() {
      pending.splice(0).filter(task => !task.cancelled).forEach(task => task.callback());
    },
  };
}

/** The hero's pass: 4.5 s with stage boundaries at 15, 50 and 80 % */
const HERO = { edges: [15, 50, 80], duration: 4500 } as const;

function heroScene() {
  const clock = scheduler();
  const paint = painter();
  const seen: Array<[number, PlayState]> = [];
  const scene = timedScene(HERO.edges, HERO.duration, clock.after, paint.afterPaint, (stage, state) => seen.push([stage, state]));
  return { clock, paint, seen, scene };
}

describe('timed scene stages', () => {
  it('holds the viewfinder, scans, lands fields and rests once by 3.6 seconds', () => {
    const clock = scheduler();
    const seen: number[] = [];
    playTimedStages(HERO.edges, HERO.duration, clock.after, stage => seen.push(stage));
    clock.advanceTo(674);
    expect(seen).toEqual([0]);
    clock.advanceTo(675);
    expect(seen).toEqual([0, 1]);
    clock.advanceTo(2250);
    expect(seen).toEqual([0, 1, 2]);
    clock.advanceTo(3599);
    expect(seen).toEqual([0, 1, 2]);
    clock.advanceTo(3600);
    expect(seen).toEqual([0, 1, 2, 3]);
    clock.advanceTo(9000);
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('cancels pending stages and ignores already queued callbacks after a motion change', () => {
    const clock = scheduler();
    const seen: number[] = [];
    const cancel = playTimedStages(HERO.edges, HERO.duration, clock.after, stage => seen.push(stage));
    clock.advanceTo(675);
    cancel();
    clock.advanceTo(4500);
    clock.deliverLate();
    expect(seen).toEqual([0, 1]);
  });

  it('keeps independent scene passes independent', () => {
    const clock = scheduler();
    const first: number[] = [];
    const second: number[] = [];
    const cancel = playTimedStages([50], 1000, clock.after, stage => first.push(stage));
    playTimedStages([50], 2000, clock.after, stage => second.push(stage));
    cancel();
    clock.advanceTo(1000);
    expect(first).toEqual([0]);
    expect(second).toEqual([0, 1]);
  });
});

describe('timed scene playback and replay', () => {
  it('plays through playing to done', () => {
    const { clock, seen, scene } = heroScene();
    scene.play();
    clock.advanceTo(4500);
    expect(seen).toEqual([[0, 'playing'], [1, 'playing'], [2, 'playing'], [3, 'done']]);
  });

  it('replays from rest: resets to pending, then plays only after the reset has painted', () => {
    const { clock, paint, seen, scene } = heroScene();
    scene.play();
    clock.advanceTo(4500);
    seen.length = 0;

    scene.replay();
    expect(seen).toEqual([[0, 'pending']]);
    clock.advanceTo(9000);
    expect(seen, 'nothing plays before the reset paints').toEqual([[0, 'pending']]);

    paint.paint();
    clock.advanceTo(9000 + 4500);
    expect(seen).toEqual([[0, 'pending'], [0, 'playing'], [1, 'playing'], [2, 'playing'], [3, 'done']]);
  });

  it('a replay mid-pass cancels the running pass: its later stages never arrive', () => {
    const { clock, paint, seen, scene } = heroScene();
    scene.play();
    clock.advanceTo(2250);
    expect(seen.at(-1)).toEqual([2, 'playing']);

    scene.replay();
    paint.paint();
    clock.advanceTo(2250 + 675);
    clock.advanceTo(3600);
    expect(seen.slice(3), 'the first pass would have reached stage 3 at 3600 ms').toEqual([
      [0, 'pending'], [0, 'playing'], [1, 'playing'],
    ]);
    clock.advanceTo(2250 + 4500);
    expect(seen.slice(3)).toEqual([[0, 'pending'], [0, 'playing'], [1, 'playing'], [2, 'playing'], [3, 'done']]);
  });

  it('a second replay before the reset paints cancels the first: one pass plays', () => {
    const { clock, paint, seen, scene } = heroScene();
    scene.replay();
    scene.replay();
    paint.paint();
    clock.advanceTo(4500);
    expect(seen).toEqual([[0, 'pending'], [0, 'pending'], [0, 'playing'], [1, 'playing'], [2, 'playing'], [3, 'done']]);
  });

  it('cancel stops a pass and a pending reset', () => {
    const { clock, paint, seen, scene } = heroScene();
    scene.play();
    clock.advanceTo(675);
    scene.cancel();
    scene.replay();
    scene.cancel();
    paint.paint();
    clock.advanceTo(9000);
    clock.deliverLate();
    expect(seen).toEqual([[0, 'playing'], [1, 'playing'], [0, 'pending']]);
  });
});
