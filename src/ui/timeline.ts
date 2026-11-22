import type { TimeRow } from "../grader/electric";
import { h } from "./dom";

/** 신호 × 단계 표. 출력 줄의 틀린 칸은 빨갛게 "받은→기대"로 보여 준다 */
export function renderTimeline(rows: TimeRow[]): HTMLElement {
  const n = rows[0]?.values.length ?? 0;
  const head = h(
    "div",
    { class: "tl-row tl-head", role: "row" },
    h("span", { class: "tl-name" }, "단계"),
    ...Array.from({ length: n }, (_, k) => h("span", { class: "tl-cell" }, String(k + 1))),
  );
  const line = (r: TimeRow) =>
    h(
      "div",
      { class: "tl-row" + (r.expect ? " tl-out" : ""), role: "row" },
      h("span", { class: "tl-name" }, r.label),
      ...r.values.map((v, k) => {
        const bad = r.bad?.[k] ?? false;
        return h(
          "span",
          { class: `tl-cell v${v}` + (bad ? " bad" : ""), title: r.expect ? `기대 ${r.expect[k]}` : "" },
          bad ? `${v}→${r.expect![k]}` : String(v),
        );
      }),
    );
  return h("div", { class: "timeline", role: "table", "aria-label": "타임라인" }, head, ...rows.map(line));
}
