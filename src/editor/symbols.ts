import type { PartResult } from "../sim/electric/solve";
import type { Part } from "../sim/electric/types";
import { GRID, PIN_OFFSET } from "./geometry";

const NS = "http://www.w3.org/2000/svg";

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

const line = (x1: number, y1: number, x2: number, y2: number, cls = "") => svg("line", { x1, y1, x2, y2, class: cls });
const path = (d: string, cls = "") => svg("path", { d, class: cls });

/** 일반 회로도 기호. 원점 = 부품 중심, 2핀 부품은 핀이 (-40,0), (40,0). */
function body(p: Part, r: PartResult | undefined, pressed: boolean): SVGElement[] {
  const glow = r?.brightness ?? 0;
  switch (p.kind) {
    case "battery":
      return [
        line(-40, 0, -6, 0), line(6, 0, 40, 0),
        line(-6, -8, -6, 8, "thick"), line(6, -16, 6, 16),
        Object.assign(svg("text", { x: 14, y: -16, class: "pol" }), { textContent: "+" }),
        Object.assign(svg("text", { x: -22, y: -16, class: "pol" }), { textContent: "−" }),
      ];
    case "resistor":
      return [line(-40, 0, -24, 0), path("M -24 0 L -20 -8 L -12 8 L -4 -8 L 4 8 L 12 -8 L 20 8 L 24 0"), line(24, 0, 40, 0)];
    case "lamp":
      return [
        line(-40, 0, -14, 0), line(14, 0, 40, 0),
        svg("circle", { cx: 0, cy: 0, r: 14, class: "lamp-glass", style: `--glow:${glow}` }),
        line(-10, -10, 10, 10), line(-10, 10, 10, -10),
      ];
    case "led": {
      const ledBody = path("M -10 -12 L -10 12 L 10 0 Z", "led-body");
      ledBody.setAttribute("style", `--glow:${glow}`);
      const parts: SVGElement[] = [
        line(-40, 0, -10, 0), line(10, 0, 40, 0), ledBody, line(10, -12, 10, 12),
        path("M 2 -14 l 8 -8 M 10 -22 l -5 0 M 10 -22 l 0 5 M 10 -10 l 8 -8 M 18 -18 l -5 0 M 18 -18 l 0 5", "rays"),
      ];
      if (r?.burnt) parts.push(path("M -14 -14 L 14 14 M -14 14 L 14 -14", "burnt"));
      return parts;
    }
    case "switch":
      return [line(-40, 0, -14, 0), line(14, 0, 40, 0), svg("circle", { cx: -14, cy: 0, r: 3 }), svg("circle", { cx: 14, cy: 0, r: 3 }),
        pressed ? line(-14, 0, 14, 0, "lever") : line(-14, 0, 12, -14, "lever")];
    case "button":
    case "button-nc": {
      const closed = p.kind === "button" ? pressed : !pressed;
      const y = closed ? -3 : -14;
      return [line(-40, 0, -14, 0), line(14, 0, 40, 0), svg("circle", { cx: -14, cy: 0, r: 3 }), svg("circle", { cx: 14, cy: 0, r: 3 }),
        line(-16, y, 16, y, "lever"), line(0, y, 0, y - 12), line(-6, y - 12, 6, y - 12)];
    }
    case "npn":
      return [
        svg("circle", { cx: 6, cy: 0, r: 22, class: "case" }),
        line(-40, 0, -6, 0), line(-6, -14, -6, 14, "thick"),
        path("M -6 -6 L 20 -24 L 20 -40"), path("M -6 6 L 20 24 L 20 40"), path("M 12 15 L 20 24 L 9 23", "arrow"),
      ];
  }
}

export function partSymbol(p: Part, r: PartResult | undefined, pressed: boolean): SVGGElement {
  const g = svg("g", { class: `part k-${p.kind}${r?.on ? " on" : ""}${r?.burnt ? " is-burnt" : ""}`, "data-id": p.id });
  const inner = svg("g", { transform: `rotate(${p.rot})` });
  for (const e of body(p, r, pressed)) inner.append(e);
  for (const [, [dx, dy]] of Object.entries(PIN_OFFSET[p.kind])) inner.append(svg("circle", { cx: dx * GRID, cy: dy * GRID, r: 5, class: "pin" }));
  g.append(inner);
  g.setAttribute("transform", `translate(${p.x * GRID} ${p.y * GRID})`);
  return g;
}
