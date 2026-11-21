import { expect, test } from "vitest";
import { sanitizeCircuit } from "./sanitize";
import { ckt } from "../sim/electric/ckt";
import type { ElectricTask } from "../lessons/types";

const task = {
  kind: "electric",
  title: "",
  goal: "",
  hint: "",
  palette: [
    { id: "btn", kind: "button", label: "버튼" },
    { id: "lamp", kind: "lamp", label: "전구" },
  ],
  preset: ckt(["bat:battery:3"], []),
  checks: [],
  reference: ckt([], []),
  wrong: [],
} satisfies ElectricTask;

test("형식이 틀리면 null", () => {
  expect(sanitizeCircuit("x", task)).toBeNull();
  expect(sanitizeCircuit(null, task)).toBeNull();
  expect(sanitizeCircuit({ parts: "no" }, task)).toBeNull();
});

test("정상 회로는 그대로", () => {
  const c = ckt(["bat:battery:3", "btn:button"], ["bat.+~btn.a"]);
  expect(sanitizeCircuit(c, task)).toEqual(c);
});

test("팔레트에 없는 부품과 그 선은 버린다", () => {
  const c = ckt(["bat:battery:3", "btn:button", "old:resistor:100"], ["bat.+~btn.a", "btn.b~old.a"]);
  const s = sanitizeCircuit(c, task)!;
  expect(s.parts.map((p) => p.id)).toEqual(["bat", "btn"]);
  expect(s.wires).toHaveLength(1);
});

test("종류가 바뀐 부품도 버린다", () => {
  const c = ckt(["bat:battery:3", "btn:switch"], []);
  expect(sanitizeCircuit(c, task)!.parts.map((p) => p.id)).toEqual(["bat"]);
});

test("미리 놓인 전지가 없으면 다시 넣는다", () => {
  const s = sanitizeCircuit(ckt(["btn:button"], []), task)!;
  expect(s.parts.map((p) => p.id).sort()).toEqual(["bat", "btn"]);
});

test("핀 이름이 틀린 선은 버린다", () => {
  const c = ckt(["bat:battery:3", "btn:button"], ["bat.x~btn.a"]);
  expect(sanitizeCircuit(c, task)!.wires).toHaveLength(0);
});
