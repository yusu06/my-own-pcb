import { expect, test } from "vitest";
import { spotFree } from "./geometry";
import type { Part } from "../sim/electric/types";

const chip = (id: string, x: number, y: number, nIn: number): Part => ({
  id,
  kind: "chip",
  x,
  y,
  rot: 0,
  chip: { name: "c", v: null, inputs: Array.from({ length: nIn }, (_, i) => `i${i}`), outputs: ["y"] },
});
const nand = (x: number, y: number): Part => ({ id: "n", kind: "nand", x, y, rot: 0 });

test("작은 부품끼리는 예전 간격(가로 5, 세로 4) 그대로", () => {
  expect(spotFree([nand(0, 0)], 0, 4, { kind: "nand" })).toBe(true);
  expect(spotFree([nand(0, 0)], 0, 3, { kind: "nand" })).toBe(false);
  expect(spotFree([nand(0, 0)], 5, 0, { kind: "nand" })).toBe(true);
});

test("키 큰 칩(입력 3개)은 몸체만큼 더 떨어뜨린다", () => {
  const ha = chip("ha1", 0, 0, 2);
  const fa = chip("fa1", 0, 0, 3);
  // 반가산기 아래 5칸에 전가산기를 놓으면 몸체가 겹친다
  expect(spotFree([ha], 0, 5, fa)).toBe(false);
  expect(spotFree([ha], 0, 10, fa)).toBe(true);
  expect(spotFree([fa], 6, 0, chip("x", 0, 0, 3))).toBe(true);
});
