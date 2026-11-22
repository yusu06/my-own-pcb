import type { Part, PartKind } from "../sim/electric/types";

/** 격자 1칸 = SVG 20 단위 */
export const GRID = 20;

/** 격자 칸 단위, rot 0 기준 핀 위치 */
export const PIN_OFFSET: Record<PartKind, Record<string, [number, number]>> = {
  battery: { "-": [-2, 0], "+": [2, 0] },
  resistor: { a: [-2, 0], b: [2, 0] },
  lamp: { a: [-2, 0], b: [2, 0] },
  led: { a: [-2, 0], k: [2, 0] },
  switch: { a: [-2, 0], b: [2, 0] },
  button: { a: [-2, 0], b: [2, 0] },
  "button-nc": { a: [-2, 0], b: [2, 0] },
  npn: { b: [-2, 0], c: [1, -2], e: [1, 2] },
};

/** 시계 방향 회전(SVG y축 아래) */
function rotate([x, y]: [number, number], rot: Part["rot"]): [number, number] {
  switch (rot) {
    case 90:
      return [-y, x];
    case 180:
      return [-x, -y];
    case 270:
      return [y, -x];
    default:
      return [x, y];
  }
}

export function pinPos(p: Part, pin: string): [number, number] {
  const [dx, dy] = rotate(PIN_OFFSET[p.kind][pin], p.rot);
  return [(p.x + dx) * GRID, (p.y + dy) * GRID];
}

export function snap(v: number): number {
  return Math.round(v / GRID);
}

export function wirePath(a: [number, number], b: [number, number]): string {
  return `M ${a[0]} ${a[1]} H ${b[0]} V ${b[1]}`;
}

type XY = [number, number];

/** 부품 몸체 상자(핀은 상자 밖). 세계 좌표 [x1, y1, x2, y2] */
export function partBox(p: Part): [number, number, number, number] {
  const local: [number, number, number, number] = p.kind === "npn" ? [-1.2, -1.3, 1.6, 1.3] : [-1.4, -0.9, 1.4, 0.9];
  const [a, b] = [rotate([local[0], local[1]], p.rot), rotate([local[2], local[3]], p.rot)];
  const xs = [a[0], b[0]].map((v) => (p.x + v) * GRID);
  const ys = [a[1], b[1]].map((v) => (p.y + v) * GRID);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** 가로/세로 선분이 부품 몸체 안쪽을 지나는가 */
export function segmentHitsPart(a: XY, b: XY, p: Part): boolean {
  const [x1, y1, x2, y2] = partBox(p);
  const [sx1, sx2] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [sy1, sy2] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return sx2 > x1 && sx1 < x2 && sy2 > y1 && sy1 < y2;
}

/** 핀이 부품 밖을 향하는 방향(가로 또는 세로 단위 벡터) */
export function outward(p: Part, pin: string): XY {
  const [dx, dy] = rotate(PIN_OFFSET[p.kind][pin], p.rot);
  return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
}

/**
 * 두 핀을 잇는 가로·세로 경로. 각 핀에서 바깥으로 한 칸 나간 뒤,
 * ㄱ자 2가지와 ㄹ자 2가지 중 부품 몸체를 가장 적게 지나는 경로를 고른다(같으면 꺾임이 적은 것).
 */
export function wireRoute(pa: Part, pinA: string, pb: Part, pinB: string, parts: Part[]): XY[] {
  const a = pinPos(pa, pinA);
  const b = pinPos(pb, pinB);
  const [oa, ob] = [outward(pa, pinA), outward(pb, pinB)];
  const A: XY = [a[0] + oa[0] * GRID, a[1] + oa[1] * GRID];
  const B: XY = [b[0] + ob[0] * GRID, b[1] + ob[1] * GRID];
  const mx = Math.round((A[0] + B[0]) / 2 / GRID) * GRID;
  const my = Math.round((A[1] + B[1]) / 2 / GRID) * GRID;
  const middles: XY[][] = [
    [[B[0], A[1]]],
    [[A[0], B[1]]],
    [[mx, A[1]], [mx, B[1]]],
    [[A[0], my], [B[0], my]],
  ];
  const score = (pts: XY[]) => {
    let n = 0;
    for (let i = 1; i < pts.length; i++) for (const p of parts) if (segmentHitsPart(pts[i - 1], pts[i], p)) n++;
    return n;
  };
  let best: XY[] = [];
  let bestScore = Infinity;
  for (const mid of middles) {
    const pts = [a, A, ...mid, B, b];
    const s = score(pts);
    if (s < bestScore) [best, bestScore] = [pts, s];
  }
  // 길이 0인 선분과 한 직선 위 중간점 정리: 이미 남긴 점을 기준으로 차례로 (원래 이웃 기준이면 둘 다 지워져 대각선이 생긴다)
  const out: XY[] = [];
  for (const p of best) {
    const prev = out[out.length - 1];
    if (prev && p[0] === prev[0] && p[1] === prev[1]) continue;
    const pp = out[out.length - 2];
    if (pp && ((pp[0] === prev[0] && prev[0] === p[0]) || (pp[1] === prev[1] && prev[1] === p[1]))) out.pop();
    out.push(p);
  }
  return out;
}

export const pointsPath = (pts: XY[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
