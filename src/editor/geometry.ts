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
