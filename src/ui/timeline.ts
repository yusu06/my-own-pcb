import type { TimeRow } from "../grader/electric";
import { h } from "./dom";

/** 긴 각본은 일부만 보여 준다. 틀린 칸이 있으면 첫 틀린 칸이 왼쪽에서 8칸째쯤 오게 */
export function timelineWindow(rows: TimeRow[], max = 48): { start: number; end: number } {
  const n = rows[0]?.values.length ?? 0;
  if (n <= max) return { start: 0, end: n };
  const first = Array.from({ length: n }, (_, k) => k).find((k) => rows.some((r) => r.bad?.[k])) ?? 0;
  const start = Math.max(0, Math.min(first - 8, n - max));
  return { start, end: start + max };
}

/** 신호 × 단계 표. 출력 줄의 틀린 칸은 빨갛게 "받은→기대"로 보여 준다 */
export function renderTimeline(rows: TimeRow[]): HTMLElement {
  const n = rows[0]?.values.length ?? 0;
  const { start, end } = timelineWindow(rows);
  const idx = Array.from({ length: end - start }, (_, k) => start + k);
  const head = h(
    "div",
    { class: "tl-row tl-head", role: "row" },
    h("span", { class: "tl-name" }, "단계"),
    ...idx.map((k) => h("span", { class: "tl-cell" }, String(k + 1))),
  );
  const line = (r: TimeRow) =>
    h(
      "div",
      { class: "tl-row" + (r.expect ? " tl-out" : ""), role: "row" },
      h("span", { class: "tl-name" }, r.label),
      ...idx.map((k) => {
        const v = r.values[k];
        const bad = r.bad?.[k] ?? false;
        return h(
          "span",
          { class: `tl-cell v${v}` + (bad ? " bad" : ""), title: r.expect ? `기대 ${r.expect[k]}` : "" },
          bad ? `${v}→${r.expect![k]}` : String(v),
        );
      }),
    );
  const note = end - start < n ? h("p", { class: "tl-note" }, `단계 ${start + 1}~${end} / 전체 ${n}`) : null;
  return h("div", {}, note, h("div", { class: "timeline", role: "table", "aria-label": "타임라인" }, head, ...rows.map(line)));
}
