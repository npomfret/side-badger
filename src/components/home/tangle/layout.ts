/**
 * Build-time geometry for the homepage tangle (scene 5): node positions, bowed quadratic edges
 * shortened at both ends, real path lengths, dash patterns, arrowhead placement and mirroring for
 * rtl locales (homepage plan: "Graph geometry" and "Prototype findings").
 *
 * Everything here is pure. Two boards exist: the desktop landscape board (`0 0 800 520`) and the
 * phone / tablet portrait board (`0 0 360 440`). Coordinates are computed in reading order for a
 * ltr page and mirrored with `mirrorX()` for rtl, so SVG paths and arrowheads
 * are never flipped by CSS. The HTML overlays (polaroids, tags, cards, sticky note, stamp) keep
 * their ltr percentages (`xPct`, `yPct`): the scene places them with
 * `inset-inline-start`, which mirrors them without a second set of coordinates.
 */
import {
    MEMBERS,
    deriveBalances,
    deriveGreedyPayments,
    deriveIous,
    derivePairwiseDebts,
    type MemberId,
    type Transfer,
} from '../data/example-group';
import { mirrorX } from '../format';

export type BoardName = 'desktop' | 'phone';

export interface BoardSpec {
    name: BoardName;
    width: number;
    height: number;
    cx: number;
    cy: number;
    radius: number;
    /** Expense card centres beside each payer's polaroid, in unmirrored board units */
    cards: Record<MemberId, readonly [number, number]>;
    /** The sticky note: centre and width */
    sticky: { x: number; y: number; w: number };
    /** The "3, not 10" stamp centre */
    stamp: readonly [number, number];
}

export const BOARDS: Record<BoardName, BoardSpec> = {
    desktop: {
        name: 'desktop',
        width: 800,
        height: 520,
        cx: 400,
        cy: 270,
        radius: 190,
        cards: { ava: [400, 22], ben: [692, 211], sam: [108, 211], dev: [590, 486], mei: [210, 486] },
        sticky: { x: 400, y: 478, w: 150 },
        stamp: [400, 462],
    },
    phone: {
        name: 'phone',
        width: 360,
        height: 440,
        cx: 180,
        cy: 230,
        radius: 130,
        cards: { ava: [180, 30], ben: [296, 108], sam: [64, 108], dev: [296, 404], mei: [64, 404] },
        sticky: { x: 180, y: 404, w: 104 },
        stamp: [180, 404],
    },
};

/** Every edge stops this far from a node centre, so arrowheads end at the polaroid's edge */
export const NODE_RADIUS = 34;
/** Bows: the peak sideways offset of a curve, in board units */
export const DEBT_BOW = 14;
export const PAYMENT_BOW = 18;
export const iouBow = (expenseId: number): number => 8 + 6 * expenseId;

/** Dashed debt threads: a 7 unit dash and a 4 unit gap */
export const DASH_ON = 7;
export const DASH_OFF = 4;
const DASH_PERIOD = DASH_ON + DASH_OFF;

type Point = readonly [number, number];

export interface Arrowhead {
    /** The tip, which is the end of the thread, in the board's own (possibly mirrored) space */
    tip: Point;
    /** Direction of the thread's tangent at its end, in degrees */
    angle: number;
    /** SVG transform for a head path drawn with its tip at the origin, pointing along +x */
    transform: string;
}

export interface Thread {
    from: MemberId;
    to: MemberId;
    cents: number;
    expenseId?: number;
    bow: number;
    /** SVG path data in the board's own space */
    d: string;
    start: Point;
    control: Point;
    end: Point;
    /** Real arc length, rounded up to 0.01 */
    length: number;
    /** `stroke-dasharray`: `L L` for solid threads; for debts a 7 4 run no longer than L, then a gap */
    dasharray: string;
    head: Arrowhead;
    /** Curve midpoint as unmirrored percentages of the board, for HTML overlays */
    xPct: number;
    yPct: number;
}

export interface NodeSpot {
    id: MemberId;
    index: number;
    /** Unmirrored board units */
    x: number;
    y: number;
    xPct: number;
    yPct: number;
}

export interface Placed {
    xPct: number;
    yPct: number;
}

export interface TangleGeometry {
    board: BoardSpec;
    rtl: boolean;
    nodes: Record<MemberId, NodeSpot>;
    ious: Thread[];
    debts: Thread[];
    payments: Thread[];
    cards: Record<MemberId, Placed>;
    sticky: Placed & { w: number };
    stamp: Placed;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const ceil2 = (n: number): number => Math.ceil(n * 100 - 1e-9) / 100;

/** The pentagon, clockwise from the top, before any mirroring */
export function nodePosition(board: BoardSpec, index: number): Point {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / MEMBERS.length;
    return [board.cx + board.radius * Math.cos(angle), board.cy + board.radius * Math.sin(angle)];
}

/** A point on a quadratic Bezier */
export function quadPoint(p0: Point, c: Point, p2: Point, t: number): Point {
    const q = 1 - t;
    return [
        q * q * p0[0] + 2 * q * t * c[0] + t * t * p2[0],
        q * q * p0[1] + 2 * q * t * c[1] + t * t * p2[1],
    ];
}

/** Arc length of a quadratic Bezier: Simpson's rule over the smooth speed |B'(t)| */
export function quadLength(p0: Point, c: Point, p2: Point): number {
    const speed = (t: number): number => {
        const dx = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]);
        const dy = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]);
        return Math.hypot(dx, dy);
    };
    const n = 256;
    let sum = speed(0) + speed(1);
    for (let i = 1; i < n; i++) sum += speed(i / n) * (i % 2 === 0 ? 2 : 4);
    return sum / (3 * n);
}

/** A solid thread draws by offsetting one dash of length L */
export function solidDasharray(length: number): string {
    return `${length} ${length}`;
}

/**
 * A dashed thread: floor(L / 11) pairs of `7 4`, so the dashes total no more than L, then a zero
 * dash and a gap of at least L. With the dash offset at L (nothing drawn) the path samples pattern
 * positions L to 2L; the gap spans 11n to 11n + gap, which covers all of them, so no stub of a
 * dash shows before the thread draws.
 */
export function dashedDasharray(length: number): { pairs: number; gap: number; value: string } {
    const pairs = Math.floor(length / DASH_PERIOD);
    const gap = Math.ceil(length) + DASH_PERIOD;
    return { pairs, gap, value: `${`${DASH_ON} ${DASH_OFF} `.repeat(pairs)}0 ${gap}` };
}

interface ThreadOptions {
    board: BoardSpec;
    from: MemberId;
    to: MemberId;
    cents: number;
    bow: number;
    rtl: boolean;
    dashed: boolean;
    expenseId?: number;
}

const memberIndex = (id: MemberId): number => MEMBERS.findIndex((m) => m.id === id);

export function buildThread({ board, from, to, cents, bow, rtl, dashed, expenseId }: ThreadOptions): Thread {
    const a = nodePosition(board, memberIndex(from));
    const b = nodePosition(board, memberIndex(to));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const p0: Point = [a[0] + ux * NODE_RADIUS, a[1] + uy * NODE_RADIUS];
    const p2: Point = [b[0] - ux * NODE_RADIUS, b[1] - uy * NODE_RADIUS];
    // Always bow to the same side of the direction of travel, so opposite directions part ways.
    // A quadratic's midpoint sits halfway to its control point, so the control is 2 * bow away.
    const nx = -dy / len;
    const ny = dx / len;
    const c: Point = [(p0[0] + p2[0]) / 2 + nx * 2 * bow, (p0[1] + p2[1]) / 2 + ny * 2 * bow];
    const mid = quadPoint(p0, c, p2, 0.5);
    const length = ceil2(quadLength(p0, c, p2));

    const place = (p: Point): Point => (rtl ? [mirrorX(p[0], board.width), p[1]] : p);
    const s = place(p0);
    const k = place(c);
    const e = place(p2);
    const angle = round2((Math.atan2(e[1] - k[1], e[0] - k[0]) * 180) / Math.PI);
    return {
        from,
        to,
        cents,
        expenseId,
        bow,
        d: `M${round2(s[0])} ${round2(s[1])}Q${round2(k[0])} ${round2(k[1])} ${round2(e[0])} ${round2(e[1])}`,
        start: s,
        control: k,
        end: e,
        length,
        dasharray: dashed ? dashedDasharray(length).value : solidDasharray(length),
        head: { tip: e, angle, transform: `translate(${round2(e[0])} ${round2(e[1])}) rotate(${angle})` },
        xPct: round2((mid[0] / board.width) * 100),
        yPct: round2((mid[1] / board.height) * 100),
    };
}

export function buildTangle(boardName: BoardName, rtl = false): TangleGeometry {
    const board = BOARDS[boardName];
    const ious = deriveIous();
    const debts = derivePairwiseDebts(ious);
    const payments = deriveGreedyPayments(deriveBalances(debts));

    const thread = (t: Transfer, bow: number, dashed: boolean, expenseId?: number): Thread =>
        buildThread({ board, from: t.from, to: t.to, cents: t.cents, bow, rtl, dashed, expenseId });
    const pct = (p: Point): Placed => ({
        xPct: round2((p[0] / board.width) * 100),
        yPct: round2((p[1] / board.height) * 100),
    });

    const nodes = {} as Record<MemberId, NodeSpot>;
    const cards = {} as Record<MemberId, Placed>;
    MEMBERS.forEach((m, index) => {
        const [x, y] = nodePosition(board, index);
        nodes[m.id] = { id: m.id, index, x: round2(x), y: round2(y), ...pct([x, y]) };
        cards[m.id] = pct(board.cards[m.id]);
    });

    return {
        board,
        rtl,
        nodes,
        ious: ious.map((i) => thread(i, iouBow(i.expenseId), false, i.expenseId)),
        debts: debts.map((d) => thread(d, DEBT_BOW, true)),
        payments: payments.map((p) => thread(p, PAYMENT_BOW, false)),
        cards,
        sticky: { ...pct([board.sticky.x, board.sticky.y]), w: board.sticky.w },
        stamp: pct(board.stamp),
    };
}
