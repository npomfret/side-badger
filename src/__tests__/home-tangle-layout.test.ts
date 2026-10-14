import { describe, expect, it } from 'vitest';
import {
    BOARDS,
    NODE_RADIUS,
    buildTangle,
    dashedDasharray,
    iouBow,
    nodePosition,
    quadLength,
    quadPoint,
    type BoardName,
    type Thread,
} from '@/components/home/tangle/layout';
import { MEMBERS } from '@/components/home/data/example-group';
import { mirrorAngle, mirrorPathD, mirrorX } from '@/components/home/format';

const boards: BoardName[] = ['desktop', 'phone'];
const all = (g: ReturnType<typeof buildTangle>): Thread[] => [...g.ious, ...g.debts, ...g.payments];

/** Length by a fine polyline, independent of the production integrator */
function polylineLength(t: Thread): number {
    let sum = 0;
    let prev = t.start;
    for (let i = 1; i <= 20000; i++) {
        const p = quadPoint(t.start, t.control, t.end, i / 20000);
        sum += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
    }
    return sum;
}

describe('tangle node positions', () => {
    it('places the pentagon on the plan coordinates', () => {
        const desktop = BOARDS.desktop;
        const spots = MEMBERS.map((_, i) => nodePosition(desktop, i).map(Math.round));
        expect(spots).toEqual([
            [400, 80],
            [581, 211],
            [512, 424],
            [288, 424],
            [219, 211],
        ]);
        expect(desktop.width).toBe(800);
        expect(desktop.height).toBe(520);
        expect(BOARDS.phone.width).toBe(360);
        expect(BOARDS.phone.height).toBe(440);
        expect(nodePosition(BOARDS.phone, 0)).toEqual([180, 100]);
    });
});

describe('tangle thread counts and bows', () => {
    it('builds 19 IOU threads, 10 debts and 3 payments', () => {
        for (const name of boards) {
            const g = buildTangle(name);
            expect([g.ious.length, g.debts.length, g.payments.length]).toEqual([19, 10, 3]);
        }
    });

    it('bows IOUs by 8 + 6 x the expense, debts by 14 and payments by 18', () => {
        const g = buildTangle('desktop');
        for (const t of g.ious) expect(t.bow).toBe(iouBow(t.expenseId!));
        expect(new Set(g.ious.map((t) => t.bow))).toEqual(new Set([14, 20, 26, 32, 38]));
        expect(new Set(g.debts.map((t) => t.bow))).toEqual(new Set([14]));
        expect(new Set(g.payments.map((t) => t.bow))).toEqual(new Set([18]));
    });

    it('peaks at the stated bow, on opposite sides for opposite directions', () => {
        const g = buildTangle('desktop');
        for (const t of g.debts) {
            const mid = quadPoint(t.start, t.control, t.end, 0.5);
            const chord: [number, number] = [(t.start[0] + t.end[0]) / 2, (t.start[1] + t.end[1]) / 2];
            expect(Math.hypot(mid[0] - chord[0], mid[1] - chord[1])).toBeCloseTo(14, 4);
        }
        // Expense 1 (Ava paid) and expense 3 (Mei paid) run between Ava and Mei in opposite directions.
        // Measure which side of the fixed Ava -> Mei chord each curve bows to.
        const ava = g.nodes.ava;
        const mei = g.nodes.mei;
        const side = (t: Thread): number => {
            const mid = quadPoint(t.start, t.control, t.end, 0.5);
            return Math.sign((mei.x - ava.x) * (mid[1] - ava.y) - (mei.y - ava.y) * (mid[0] - ava.x));
        };
        const toAva = g.ious.find((t) => t.expenseId === 1 && t.from === 'mei')!;
        const toMei = g.ious.find((t) => t.expenseId === 3 && t.from === 'ava')!;
        expect(side(toAva)).not.toBe(0);
        expect(side(toAva)).toBe(-side(toMei));
    });
});

describe('tangle edge shortening', () => {
    it.each(boards)('stops every edge %s exactly 34 from each node centre', (name) => {
        const g = buildTangle(name);
        expect(NODE_RADIUS).toBe(34);
        for (const t of all(g)) {
            const a = g.nodes[t.from];
            const b = g.nodes[t.to];
            expect(Math.hypot(t.start[0] - a.x, t.start[1] - a.y)).toBeCloseTo(34, 1);
            expect(Math.hypot(t.end[0] - b.x, t.end[1] - b.y)).toBeCloseTo(34, 1);
        }
    });
});

describe('tangle path lengths', () => {
    it.each(boards)('matches a fine polyline and rounds up to 0.01 (%s)', (name) => {
        for (const t of all(buildTangle(name))) {
            const exact = polylineLength(t);
            expect(t.length).toBeGreaterThanOrEqual(exact - 1e-6);
            expect(t.length - exact).toBeLessThan(0.0101);
            expect(quadLength(t.start, t.control, t.end)).toBeCloseTo(exact, 3);
        }
    });

    it('uses the real length in a solid thread dash array', () => {
        for (const t of [...buildTangle('desktop').ious, ...buildTangle('desktop').payments]) {
            expect(t.dasharray).toBe(`${t.length} ${t.length}`);
        }
    });
});

describe('dashed debt threads', () => {
    /** The visible length of a dash pattern between pattern positions from and to */
    function visible(dasharray: string, from: number, to: number): number {
        const parts = dasharray.split(' ').map(Number);
        const period = parts.reduce((a, b) => a + b, 0);
        let shown = 0;
        let pos = 0;
        // Walk two periods so the window is covered however it falls
        for (let rep = 0; rep < 3; rep++) {
            parts.forEach((len, i) => {
                const start = pos;
                pos += len;
                if (i % 2 === 0) {
                    const lo = Math.max(start, from);
                    const hi = Math.min(pos, to);
                    if (hi > lo) shown += hi - lo;
                }
            });
        }
        expect(period).toBeGreaterThan(0);
        return shown;
    }

    it.each(boards)('keeps the dash run within L and the gap at least L (%s)', (name) => {
        for (const t of buildTangle(name).debts) {
            const parts = t.dasharray.split(' ').map(Number);
            const gap = parts.at(-1)!;
            const dash = parts.slice(0, -2);
            const run = dash.reduce((a, b) => a + b, 0);
            expect(dash.length / 2).toBe(Math.floor(t.length / 11));
            expect(run).toBeLessThanOrEqual(t.length);
            expect(gap).toBeGreaterThanOrEqual(t.length);
            expect(parts.at(-2)).toBe(0);
        }
    });

    it.each(boards)('shows no dash stub at the undrawn offset, and every dash at zero (%s)', (name) => {
        for (const t of buildTangle(name).debts) {
            // dashoffset L slides pattern positions L..2L under the path: all must be hidden
            expect(visible(t.dasharray, t.length, 2 * t.length)).toBe(0);
            // dashoffset 0 shows the run
            const pairs = Math.floor(t.length / 11);
            expect(visible(t.dasharray, 0, t.length)).toBeCloseTo(pairs * 7, 6);
        }
    });

    it('needs a gap of L + 11, because a gap of exactly L leaves a stub unless L is a multiple of 11', () => {
        // The findings ask for "a gap of at least L". With the run at 11n < L, the next period's
        // first dash starts at 11n + gap, inside the undrawn window L..2L when gap is only L.
        const length = 100.5;
        const pairs = Math.floor(length / 11);
        const tooShort = `${'7 4 '.repeat(pairs)}0 ${length}`;
        expect(visible(tooShort, length, 2 * length)).toBeGreaterThan(0);
        expect(visible(dashedDasharray(length).value, length, 2 * length)).toBe(0);
    });

    it('rounds the pair count down for awkward lengths', () => {
        expect(dashedDasharray(110).pairs).toBe(10);
        expect(dashedDasharray(109.99).pairs).toBe(9);
        expect(dashedDasharray(109.99).gap).toBeGreaterThanOrEqual(109.99);
    });
});

describe('tangle arrowheads', () => {
    it('sit at the end of the thread, along its end tangent', () => {
        for (const t of [...buildTangle('desktop').debts, ...buildTangle('phone').payments]) {
            expect(t.head.tip).toEqual(t.end);
            const expected = (Math.atan2(t.end[1] - t.control[1], t.end[0] - t.control[0]) * 180) / Math.PI;
            expect(t.head.angle).toBeCloseTo(expected, 1);
            expect(t.head.transform).toBe(
                `translate(${Math.round(t.end[0] * 100) / 100} ${Math.round(t.end[1] * 100) / 100}) rotate(${t.head.angle})`
            );
        }
    });
});

describe('tangle mirroring for rtl', () => {
    it.each(boards)('mirrors paths, ends and arrowheads across the viewBox (%s)', (name) => {
        const ltr = buildTangle(name, false);
        const rtl = buildTangle(name, true);
        const w = BOARDS[name].width;
        expect(rtl.rtl).toBe(true);
        const a = all(ltr);
        const b = all(rtl);
        expect(b.length).toBe(a.length);
        a.forEach((t, i) => {
            const m = b[i];
            expect(m.start[0]).toBeCloseTo(mirrorX(t.start[0], w), 6);
            expect(m.control[0]).toBeCloseTo(mirrorX(t.control[0], w), 6);
            expect(m.end[0]).toBeCloseTo(mirrorX(t.end[0], w), 6);
            expect(m.end[1]).toBeCloseTo(t.end[1], 6);
            // Same path as mirroring the ltr path data (to the rounding of the data)
            const viaHelper = mirrorPathD(t.d, w).match(/-?\d+\.?\d*/g)!.map(Number);
            const direct = m.d.match(/-?\d+\.?\d*/g)!.map(Number);
            viaHelper.forEach((n, j) => expect(direct[j]).toBeCloseTo(n, 1));
            // Lengths and dashes are unchanged by mirroring
            expect(m.length).toBe(t.length);
            expect(m.dasharray).toBe(t.dasharray);
            // Arrowheads follow the mirrored tangent
            const norm = (deg: number): number => ((deg + 540) % 360) - 180;
            expect(norm(m.head.angle)).toBeCloseTo(norm(mirrorAngle(t.head.angle)), 1);
        });
    });

    it('keeps overlay percentages in ltr space, so inline-start placement mirrors them', () => {
        const ltr = buildTangle('desktop', false);
        const rtl = buildTangle('desktop', true);
        expect(rtl.nodes.ben.xPct).toBe(ltr.nodes.ben.xPct);
        expect(rtl.debts[0].xPct).toBe(ltr.debts[0].xPct);
        expect(rtl.sticky).toEqual(ltr.sticky);
    });

    it('swaps Ben and Sam to the other side in the mirrored SVG space', () => {
        const rtl = buildTangle('desktop', true);
        const benToAva = rtl.debts.find((t) => t.from === 'ben' && t.to === 'ava')!;
        // Ben sits at x=581 unmirrored, so a thread leaving Ben starts on the inline-start half
        expect(benToAva.start[0]).toBeLessThan(400);
        const ltr = buildTangle('desktop', false);
        expect(ltr.debts.find((t) => t.from === 'ben' && t.to === 'ava')!.start[0]).toBeGreaterThan(400);
    });
});
