import { svg } from "../editor/symbols";
import type { StateDiagram } from "../lessons/types";

const LABEL = { and: "AND 게이트", or: "OR 게이트", not: "NOT 게이트" } as const;

/** 일반적인 논리 게이트 기호(입력 왼쪽, 출력 오른쪽) */
export function gateFigure(f: "and" | "or" | "not"): SVGSVGElement {
  const root = svg("svg", { viewBox: "0 0 160 80", class: "gate-figure", role: "img", "aria-label": LABEL[f] });
  const p = (d: string) => root.append(svg("path", { d }));
  if (f === "not") {
    p("M 10 40 H 50 M 50 16 L 50 64 L 96 40 Z M 112 40 H 150");
    root.append(svg("circle", { cx: 104, cy: 40, r: 7 }));
  } else {
    p(f === "and" ? "M 50 14 H 80 A 26 26 0 0 1 80 66 H 50 Z" : "M 46 14 Q 66 40 46 66 Q 100 66 118 40 Q 100 14 46 14 Z");
    p(`M 10 28 H ${f === "and" ? 50 : 54} M 10 52 H ${f === "and" ? 50 : 54} M ${f === "and" ? 106 : 118} 40 H 150`);
  }
  const t = svg("text", { x: 80, y: 78, "text-anchor": "middle" });
  t.textContent = LABEL[f];
  root.append(t);
  return root;
}

type XY = { x: number; y: number };
const W = 400;
const H = 260;

/** 상태 사이 화살표: 진행 방향의 왼쪽으로 휘는 곡선(반대 방향 화살표와 겹치지 않게). 같은 상태면 위쪽 고리 */
export function edgePath(a: XY, b: XY, r: number): { d: string; lx: number; ly: number } {
  const f = (n: number) => n.toFixed(1);
  if (a.x === b.x && a.y === b.y) {
    const top = a.y - r - 34;
    return {
      d: `M ${f(a.x - r * 0.6)} ${f(a.y - r * 0.8)} C ${f(a.x - 30)} ${f(top)} ${f(a.x + 30)} ${f(top)} ${f(a.x + r * 0.6)} ${f(a.y - r * 0.8)}`,
      lx: a.x,
      ly: top - 2,
    };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  // 왼쪽 법선(화면 좌표: y가 아래로)
  const nx = dy / len;
  const ny = -dx / len;
  const bend = Math.min(40, len * 0.25);
  const c = { x: (a.x + b.x) / 2 + nx * bend, y: (a.y + b.y) / 2 + ny * bend };
  const edge = (p: XY) => {
    const ux = c.x - p.x;
    const uy = c.y - p.y;
    const ul = Math.hypot(ux, uy);
    return { x: p.x + (ux / ul) * r, y: p.y + (uy / ul) * r };
  };
  const s = edge(a);
  const e = edge(b);
  return { d: `M ${f(s.x)} ${f(s.y)} Q ${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}`, lx: (s.x + 2 * c.x + e.x) / 4, ly: (s.y + 2 * c.y + e.y) / 4 };
}

/** FSM 상태도: 원 = 상태, 화살표 = 조건 */
export function stateFigure(sd: StateDiagram): SVGSVGElement {
  const R = 26;
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "state-figure", role: "img", "aria-label": "상태도" });
  const defs = svg("defs", {});
  const marker = svg("marker", { id: "sd-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
  marker.append(svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "sd-head" }));
  defs.append(marker);
  root.append(defs);
  const pos = new Map(sd.nodes.map((n) => [n.id, { x: 30 + (n.x / 100) * (W - 60), y: 40 + (n.y / 100) * (H - 70) }]));
  const label = (x: number, y: number, s: string, cls: string) =>
    Object.assign(svg("text", { x: x.toFixed(1), y: y.toFixed(1), "text-anchor": "middle", class: cls }), { textContent: s });
  for (const e of sd.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    const p = edgePath(a, b, R);
    root.append(svg("path", { d: p.d, class: "sd-edge", "marker-end": "url(#sd-arrow)" }), label(p.lx, p.ly - 4, e.label, "sd-label"));
  }
  for (const n of sd.nodes) {
    const p = pos.get(n.id)!;
    root.append(svg("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: R, class: "sd-node" }), label(p.x, p.y + 5, n.label, "sd-name"));
  }
  return root;
}
