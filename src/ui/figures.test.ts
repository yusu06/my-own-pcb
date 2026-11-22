import { expect, test } from "vitest";
import { edgePath } from "./figures";

const start = (d: string) => d.match(/^M ([\d.-]+) ([\d.-]+)/)!.slice(1).map(Number);

test("두 상태를 잇는 화살표는 첫 원 가장자리에서 시작한다", () => {
  const e = edgePath({ x: 50, y: 100 }, { x: 250, y: 100 }, 20);
  const [sx, sy] = start(e.d);
  expect(Math.hypot(sx - 50, sy - 100)).toBeCloseTo(20, 0) // 경로 좌표는 0.1 단위로 반올림;
});

test("반대 방향 화살표 둘은 서로 다른 쪽으로 휜다", () => {
  const ab = edgePath({ x: 50, y: 100 }, { x: 250, y: 100 }, 20);
  const ba = edgePath({ x: 250, y: 100 }, { x: 50, y: 100 }, 20);
  expect(Math.sign(ab.ly - 100)).not.toBe(Math.sign(ba.ly - 100));
});

test("자기 자신으로 가는 화살표는 원 위쪽 고리", () => {
  const e = edgePath({ x: 100, y: 100 }, { x: 100, y: 100 }, 20);
  expect(e.d.startsWith("M")).toBe(true);
  expect(e.ly).toBeLessThan(100 - 20);
});
