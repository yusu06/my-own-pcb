import { svg } from "../editor/symbols";

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
