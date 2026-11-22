import { expect, test } from "vitest";
import { ckt } from "../electric/ckt";
import type { ChipRef, Circuit } from "../electric/types";
import { DEFAULT_CHIPS, makeLib, validChipDef } from "./chips";
import { nandCost, simulate, type ChipDef } from "./sim";

const noLib = () => null;
const ref = (name: string, v: number | null, inputs = ["a", "b"]): ChipRef => ({ name, v, inputs, outputs: ["y"] });

/** 칩 정의를 입력 조합 순서대로 돌린 출력 y 목록 */
function table(def: ChipDef): (0 | 1 | "X")[] {
  const n = def.inputs.length;
  return Array.from({ length: 1 << n }, (_, i) => {
    const ins = Object.fromEntries(def.inputs.map((name, j) => [name, ((i >> (n - 1 - j)) & 1) as 0 | 1]));
    return simulate(def.circuit, ins, noLib).out.y;
  });
}

test("기본 칩 진리표와 NAND 개수", () => {
  expect(table(DEFAULT_CHIPS.not)).toEqual([1, 0]);
  expect(table(DEFAULT_CHIPS.and)).toEqual([0, 0, 0, 1]);
  expect(table(DEFAULT_CHIPS.or)).toEqual([0, 1, 1, 1]);
  expect(table(DEFAULT_CHIPS.xor)).toEqual([0, 1, 1, 0]);
  expect([DEFAULT_CHIPS.not, DEFAULT_CHIPS.and, DEFAULT_CHIPS.or, DEFAULT_CHIPS.xor].map((d) => nandCost(d.circuit, noLib))).toEqual([1, 2, 3, 4]);
});

// 사용자가 만든 AND: NAND 하나 + 출력이 반대인 (틀렸지만 버전 구분용) 정의
const myAnd: ChipDef = {
  inputs: ["a", "b"],
  outputs: ["y"],
  circuit: ckt(["a:in", "b:in", "n:nand", "y:out"], ["a.y~n.a", "b.y~n.b", "n.y~y.a"]),
};

test("부품함 버전이 있으면 그것, 없으면 기본(fallback)", () => {
  const lib = makeLib({ and: [myAnd] });
  expect(lib(ref("and", 0))).toEqual({ def: myAnd, fallback: false });
  expect(lib(ref("and", 3))).toEqual({ def: DEFAULT_CHIPS.and, fallback: true });
  expect(lib(ref("and", null))).toEqual({ def: DEFAULT_CHIPS.and, fallback: true });
  expect(lib(ref("or", 0))).toEqual({ def: DEFAULT_CHIPS.or, fallback: true });
  expect(lib(ref("nope", null))).toBeNull();
});

test("손상된 정의는 기본으로 대체", () => {
  const broken = [{ inputs: "a", outputs: [], circuit: {} }, null, { inputs: ["a", "b"], outputs: ["y"], circuit: { parts: [], wires: [] } }];
  const lib = makeLib({ and: broken as unknown[] });
  for (const v of [0, 1, 2]) expect(lib(ref("and", v))?.fallback).toBe(true);
  expect(makeLib({ and: "x" as unknown as unknown[] })(ref("and", 0))?.fallback).toBe(true);
});

test("validChipDef", () => {
  expect(validChipDef(myAnd)).toBe(true);
  const noOut: Circuit = { parts: myAnd.circuit.parts.filter((p) => p.kind !== "out"), wires: [] };
  expect(validChipDef({ ...myAnd, circuit: noOut })).toBe(false);
  expect(validChipDef({ ...myAnd, inputs: [] })).toBe(false);
});
