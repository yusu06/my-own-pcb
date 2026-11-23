import { expect, test } from "vitest";
import { cellInfo, timelineWindow } from "./timeline";
import type { TimeRow } from "../grader/electric";

const rows = (n: number, badAt?: number): TimeRow[] => [
  { name: "clk", label: "clk", values: Array.from({ length: n }, (_, k) => k % 2) },
  {
    name: "q", label: "q", values: Array(n).fill(0), expect: Array(n).fill(0),
    bad: Array.from({ length: n }, (_, k) => k === badAt),
  },
];

test("짧으면 전부", () => {
  expect(timelineWindow(rows(10))).toEqual({ start: 0, end: 10 });
});

test("길고 틀린 곳이 없으면 처음 48칸", () => {
  expect(timelineWindow(rows(4000))).toEqual({ start: 0, end: 48 });
});

test("첫 틀린 칸이 왼쪽에서 8칸째쯤 오게", () => {
  expect(timelineWindow(rows(4000, 3000))).toEqual({ start: 2992, end: 3040 });
});

test("끝 근처면 끝에 붙인다", () => {
  expect(timelineWindow(rows(4000, 3995))).toEqual({ start: 3952, end: 4000 });
});

test("cellInfo: 기대값이 없는 출력 칸은 ‘상관없음’", () => {
  expect(cellInfo(1, [undefined], 0, false, true)).toEqual({ cls: "tl-cell v1 dc", title: "상관없음", text: "1" });
  expect(cellInfo(1, [0], 0, false, true)).toEqual({ cls: "tl-cell v1", title: "기대 0", text: "1" });
  expect(cellInfo(1, [0], 0, true, true)).toEqual({ cls: "tl-cell v1 bad", title: "기대 0", text: "1→0" });
  expect(cellInfo(0, undefined, 0, false, false)).toEqual({ cls: "tl-cell v0", title: "", text: "0" });
});
