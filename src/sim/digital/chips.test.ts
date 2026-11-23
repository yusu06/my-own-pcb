import { expect, test } from "vitest";
import { ckt } from "../electric/ckt";
import type { ChipRef, Circuit } from "../electric/types";
import { CHIP_LABEL, DEFAULT_CHIPS, latestValid, makeLib, validChipDef } from "./chips";
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

/** 여러 입력·출력 칩의 진리표(첫 입력이 최상위 비트), 출력은 이어 붙인 문자열 */
function multiTable(def: ChipDef): string[] {
  return Array.from({ length: 1 << def.inputs.length }, (_, n) => {
    const ins = Object.fromEntries(def.inputs.map((name, i) => [name, ((n >> (def.inputs.length - 1 - i)) & 1) as 0 | 1]));
    const out = simulate(def.circuit, ins, noLib).out;
    return def.outputs.map((o) => out[o]).join("");
  });
}

test("MUX 기본 부품: s가 0이면 a, 1이면 b (NAND 4개)", () => {
  expect(DEFAULT_CHIPS.mux.inputs).toEqual(["a", "b", "s"]);
  expect(multiTable(DEFAULT_CHIPS.mux)).toEqual(["0", "0", "0", "1", "1", "0", "1", "1"]);
  expect(nandCost(DEFAULT_CHIPS.mux.circuit, noLib)).toBe(4);
  expect(CHIP_LABEL.mux).toBe("MUX");
});

test("반가산기·전가산기 기본 부품 (NAND 5개, 9개)", () => {
  expect(DEFAULT_CHIPS.ha.inputs).toEqual(["a", "b"]);
  expect(DEFAULT_CHIPS.ha.outputs).toEqual(["s", "c"]);
  expect(multiTable(DEFAULT_CHIPS.ha)).toEqual(["00", "10", "10", "01"]);
  expect(nandCost(DEFAULT_CHIPS.ha.circuit, noLib)).toBe(5);
  expect(DEFAULT_CHIPS.fa.inputs).toEqual(["a", "b", "cin"]);
  expect(DEFAULT_CHIPS.fa.outputs).toEqual(["s", "cout"]);
  // 출력 순서 s cout, 입력 a b cin
  expect(multiTable(DEFAULT_CHIPS.fa)).toEqual(["00", "10", "10", "01", "10", "01", "01", "11"]);
  expect(nandCost(DEFAULT_CHIPS.fa.circuit, noLib)).toBe(9);
  expect([CHIP_LABEL.ha, CHIP_LABEL.fa]).toEqual(["반가산기", "전가산기"]);
});

/** 칩을 각본대로 돌리며 직전 넷 값을 이어 간 출력 q 목록 */
function trace(def: ChipDef, steps: Record<string, 0 | 1>[]): (0 | 1 | "X")[] {
  let prev: Record<string, 0 | 1 | "X"> | undefined;
  return steps.map((s) => {
    const r = simulate(def.circuit, s, noLib, prev);
    expect(r.oscillating).toBe(false);
    prev = r.net;
    return r.out.q;
  });
}

test("SR 래치: 0으로 누르면 설정·리셋, 둘 다 1이면 유지", () => {
  const s = (s_n: 0 | 1, r_n: 0 | 1) => ({ s_n, r_n });
  expect(trace(DEFAULT_CHIPS.sr, [s(1, 0), s(1, 1), s(0, 1), s(1, 1), s(1, 0), s(1, 1)])).toEqual([0, 0, 1, 1, 0, 0]);
  expect(nandCost(DEFAULT_CHIPS.sr.circuit, noLib)).toBe(2);
});

test("D 래치: en=1이면 d를 따라가고 en=0이면 유지", () => {
  const s = (d: 0 | 1, en: 0 | 1) => ({ d, en });
  expect(trace(DEFAULT_CHIPS.dlatch, [s(1, 1), s(0, 1), s(0, 0), s(1, 0), s(1, 1), s(1, 0), s(0, 0)])).toEqual([1, 0, 0, 0, 1, 1, 1]);
  expect(nandCost(DEFAULT_CHIPS.dlatch.circuit, noLib)).toBe(4);
});

test("D 플립플롭: clk가 0→1일 때만 d를 잡는다", () => {
  const s = (d: 0 | 1, clk: 0 | 1) => ({ d, clk });
  // 첫 단계는 전원 직후라 검사하지 않는다. clk=1 동안 d가 바뀌어도, clk가 내려가며 d가 바뀌어도 q는 그대로
  const q = trace(DEFAULT_CHIPS.dff, [s(1, 0), s(1, 1), s(0, 1), s(0, 0), s(0, 1), s(1, 1), s(0, 0), s(1, 0), s(1, 1)]);
  expect(q.slice(1)).toEqual([1, 1, 1, 0, 0, 0, 0, 1]);
  expect(nandCost(DEFAULT_CHIPS.dff.circuit, noLib)).toBe(9);
  expect(CHIP_LABEL.dff).toBe("D 플립플롭");
});

test("기본 D 플립플롭이 든 칩 정의도 유효하다", () => {
  const def = { inputs: ["d", "clk"], outputs: ["q"], circuit: ckt(["d:in", "clk:in", "f:dff", "q:out"], ["d.y~f.d", "clk.y~f.clk", "f.q~q.a"]) };
  expect(validChipDef(def)).toBe(true);
});

test("latestValid: 손상된 최신 버전은 건너뛰고 그 앞의 성한 버전을 고른다", () => {
  expect(latestValid({ and: [myAnd, { broken: true }] }, "and")).toBe(0);
  expect(latestValid({ and: [myAnd, myAnd] }, "and")).toBe(1);
  expect(latestValid({ and: [{ broken: true }] }, "and")).toBeNull();
  expect(latestValid({}, "and")).toBeNull();
  expect(latestValid({ and: "nope" }, "and")).toBeNull();
});
