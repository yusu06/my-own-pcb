import { describe, expect, test } from "vitest";
import { ckt } from "../electric/ckt";
import type { Circuit, Part } from "../electric/types";
import { nandCost, simulate, type ChipDef, type ChipLib } from "./sim";

const noLib: ChipLib = () => null;
const NAND2 = ckt(["a:in", "b:in", "n:nand", "o:out"], ["a.y~n.a", "b.y~n.b", "n.y~o.a"]);

describe("NAND", () => {
  test("NAND 진리표", () => {
    const rows = [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]] as const;
    for (const [a, b, y] of rows) expect(simulate(NAND2, { a, b }, noLib).out.o).toBe(y);
  });

  test("연결 안 된 입력은 X", () => {
    const c = ckt(["a:in", "n:nand", "o:out"], ["a.y~n.a", "n.y~o.a"]);
    expect(simulate(c, { a: 1 }, noLib).out.o).toBe("X");
    expect(simulate(c, { a: 0 }, noLib).out.o).toBe(1); // 0이 하나라도 있으면 1
  });

  test("NAND 두 개로 AND", () => {
    const c = ckt(["a:in", "b:in", "n1:nand", "n2:nand", "o:out"], ["a.y~n1.a", "b.y~n1.b", "n1.y~n2.a", "n1.y~n2.b", "n2.y~o.a"]);
    expect(simulate(c, { a: 1, b: 1 }, noLib).out.o).toBe(1);
    expect(simulate(c, { a: 1, b: 0 }, noLib).out.o).toBe(0);
    expect(nandCost(c, noLib)).toBe(2);
  });

  test("출력끼리 연결하면 충돌", () => {
    const c = ckt(["a:in", "b:in", "o:out"], ["a.y~b.y", "a.y~o.a"]);
    const r = simulate(c, { a: 1, b: 0 }, noLib);
    expect(r.conflict).toBe(true);
    expect(r.out.o).toBe("X");
  });

  test("자기 루프는 발진", () => {
    const c = ckt(["a:in", "n:nand", "o:out"], ["a.y~n.b", "n.y~n.a", "n.y~o.a"]);
    expect(simulate(c, { a: 1 }, noLib).oscillating).toBe(true);
    expect(simulate(c, { a: 0 }, noLib).oscillating).toBe(false);
  });

  test("SR 래치는 이전 값을 기억한다", () => {
    // s̄, r̄ (낮을 때 동작), q = NAND(s̄, q̄), q̄ = NAND(r̄, q)
    const c = ckt(["s:in", "r:in", "n1:nand", "n2:nand", "q:out"], ["s.y~n1.a", "n2.y~n1.b", "r.y~n2.a", "n1.y~n2.b", "n1.y~q.a"]);
    const set = simulate(c, { s: 0, r: 1 }, noLib);
    expect(set.out.q).toBe(1);
    expect(simulate(c, { s: 1, r: 1 }, noLib, set.net).out.q).toBe(1);
    const reset = simulate(c, { s: 1, r: 0 }, noLib, set.net);
    expect(simulate(c, { s: 1, r: 1 }, noLib, reset.net).out.q).toBe(0);
  });
});

describe("칩", () => {
  const NOT: ChipDef = { inputs: ["a"], outputs: ["y"], circuit: ckt(["a:in", "n:nand", "y:out"], ["a.y~n.a", "a.y~n.b", "n.y~y.a"]) };
  const lib: ChipLib = (ref) => (ref.name === "not" ? { def: NOT, fallback: false } : null);
  const chipPart = (name: string): Part => ({ id: "c", kind: "chip", x: 0, y: 0, rot: 0, chip: { name, v: 0, inputs: ["a"], outputs: ["y"] } });
  const useChip = (name: string): Circuit => ({
    parts: [...ckt(["i:in", "o:out"], []).parts, chipPart(name)],
    wires: [{ a: { part: "i", pin: "y" }, b: { part: "c", pin: "a" } }, { a: { part: "c", pin: "y" }, b: { part: "o", pin: "a" } }],
  });

  test("칩을 펼쳐서 계산한다", () => {
    expect(simulate(useChip("not"), { i: 1 }, lib).out.o).toBe(0);
    expect(simulate(useChip("not"), { i: 0 }, lib).out.o).toBe(1);
    expect(nandCost(useChip("not"), lib)).toBe(1);
  });

  test("없는 칩은 X와 missingChip", () => {
    const r = simulate(useChip("zzz"), { i: 1 }, lib);
    expect(r.out.o).toBe("X");
    expect(r.missingChip).toBe("zzz");
  });

  test("자기 자신을 품은 칩도 깊이 제한에서 멈춘다", () => {
    const SELF: ChipDef = { inputs: ["a"], outputs: ["y"], circuit: { ...useChip("self"), parts: [...useChip("self").parts.filter((p) => p.kind !== "out" && p.id !== "i"), ...ckt(["a:in", "y:out"], []).parts] } };
    SELF.circuit.wires = [{ a: { part: "a", pin: "y" }, b: { part: "c", pin: "a" } }, { a: { part: "c", pin: "y" }, b: { part: "y", pin: "a" } }];
    const selfLib: ChipLib = (ref) => (ref.name === "self" ? { def: SELF, fallback: false } : null);
    const r = simulate(useChip("self"), { i: 1 }, selfLib);
    expect(r.missingChip).toBe("self");
    expect(r.out.o).toBe("X");
    expect(Number.isFinite(nandCost(useChip("self"), selfLib))).toBe(true);
  });
});
