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

/** 칸 하나의 모양. 출력 줄에서 기대값이 undefined인 칸은 채점하지 않는 ‘상관없음’ */
export function cellInfo(
  v: number | "X",
  expect: (number | undefined)[] | undefined,
  k: number,
  bad: boolean,
  isOut: boolean,
): { cls: string; title: string; text: string } {
  const want = expect?.[k];
  const dc = isOut && want === undefined;
  return {
    cls: `tl-cell v${v}` + (bad ? " bad" : "") + (dc ? " dc" : ""),
    title: !isOut ? "" : dc ? "상관없음" : `기대 ${want}`,
    text: bad ? `${v}→${want}` : String(v),
  };
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
        const c = cellInfo(r.values[k], r.expect, k, r.bad?.[k] ?? false, !!r.expect);
        return h("span", { class: c.cls, title: c.title }, c.text);
      }),
    );
  const note = end - start < n ? h("p", { class: "tl-note" }, `단계 ${start + 1}~${end} / 전체 ${n}`) : null;
  return h("div", {}, note, h("div", { class: "timeline", role: "table", "aria-label": "타임라인" }, head, ...rows.map(line)));
}
