import { describe, expect, it } from 'vitest';
import { playTimedStages } from '@/components/home/scene-controller';

/** In-memory scheduler: no browser globals or elapsed wall time are needed to play a scene. */
function scheduler() {
  const pending: Array<{ ms: number; callback: () => void; cancelled: boolean }> = [];
  return {
    after(ms: number, callback: () => void) {
      const task = { ms, callback, cancelled: false };
      pending.push(task);
      return () => { task.cancelled = true; };
    },
    advanceTo(ms: number) {
      pending.filter(task => task.ms <= ms && !task.cancelled).forEach(task => {
        task.cancelled = true;
        task.callback();
      });
    },
    deliverLate() { pending.forEach(task => task.callback()); },
  };
}

describe('timed scene stages', () => {
  it('holds the receipt, scans, lands fields and rests once by three seconds', () => {
    const clock = scheduler();
    const seen: number[] = [];
    playTimedStages([13, 50, 90], 3000, clock.after, stage => seen.push(stage));
    clock.advanceTo(389);
    expect(seen).toEqual([0]);
    clock.advanceTo(390);
    expect(seen).toEqual([0, 1]);
    clock.advanceTo(1500);
    expect(seen).toEqual([0, 1, 2]);
    clock.advanceTo(2700);
    expect(seen).toEqual([0, 1, 2, 3]);
    clock.advanceTo(9000);
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('cancels pending stages and ignores already queued callbacks after a motion change', () => {
    const clock = scheduler();
    const seen: number[] = [];
    const cancel = playTimedStages([13, 50, 90], 3000, clock.after, stage => seen.push(stage));
    clock.advanceTo(390);
    cancel();
    clock.advanceTo(3000);
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
