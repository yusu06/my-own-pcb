import { expect, test } from "vitest";
import { sanitizeCircuit } from "./sanitize";
import { ckt } from "../sim/electric/ckt";
import type { ElectricTask, LogicTask } from "../lessons/types";
import { makeLib } from "../sim/digital/chips";

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

test("값은 팔레트 목록 안의 값만, 프리셋 값은 프리셋대로", () => {
  const t2 = { ...task, palette: [...task.palette, { id: "r", kind: "resistor", label: "저항", values: [47, 100] }] } satisfies ElectricTask;
  const c = ckt(["bat:battery:99", "r:resistor:0", "btn:button:5"], []);
  const s = sanitizeCircuit(c, t2)!;
  expect(s.parts.find((p) => p.id === "bat")!.value).toBe(3);
  expect(s.parts.find((p) => p.id === "r")!.value).toBe(47);
  expect(s.parts.find((p) => p.id === "btn")!.value).toBeUndefined();
  expect(sanitizeCircuit(ckt(["r:resistor:100"], []), t2)!.parts.find((p) => p.id === "r")!.value).toBe(100);
});

test("논리 과제: 모르는 multi id와 스냅샷이 다른 칩은 버린다", () => {
  const lt = {
    kind: "logic", title: "", goal: "", hint: "",
    palette: [
      { id: "nand", kind: "nand", label: "NAND", multi: true },
      { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
    ],
    preset: ckt(["a:in", "y:out"], []),
    inputs: ["a"], outputs: ["y"], expect: [[0], [1]],
    reference: ckt([], []), wrong: [],
  } satisfies LogicTask;
  const lib = makeLib({});
  const chip = (id: string, inputs: string[], name = "and") => ({ id, kind: "chip", x: 1, y: 1, rot: 0, chip: { name, v: null, inputs, outputs: ["y"] } });
  const raw = {
    parts: [
      ...ckt(["nand1:nand", "nand12:nand", "nandx:nand", "foo1:nand", "and1:nand"], []).parts,
      chip("and2", ["a", "b"]), chip("and3", ["a"]), chip("and4", ["a", "b"], "or"),
    ],
    wires: [],
  };
  const s = sanitizeCircuit(raw, lt, lib)!;
  expect(s.parts.map((p) => p.id).sort()).toEqual(["a", "and2", "nand1", "nand12", "y"]);
});

test("기본 D 플립플롭이 든 저장 회로는 그대로 남는다", () => {
  const t = {
    kind: "logic", title: "", goal: "", hint: "",
    palette: [{ id: "dff", kind: "dff", label: "D 플립플롭(기본)", multi: true }],
    preset: ckt(["s:in", "clk:in", "q:out"], []),
    inputs: ["s", "clk"], outputs: ["q"], expect: [], reference: ckt([], []), wrong: [],
  } satisfies LogicTask;
  const c = ckt(["s:in", "clk:in", "q:out", "dff1:dff"], ["s.y~dff1.d", "clk.y~dff1.clk", "dff1.q~q.a"]);
  expect(sanitizeCircuit(c, t, makeLib({}))).toEqual(c);
});
