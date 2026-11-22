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

describe("손상된 부품함 방어", () => {
  const ioParts = ckt(["a:in", "y:out"], []).parts;
  /** 자기 자신(같은 이름·버전)을 k번 품은 칩: 입력 → 첫 칩 → … → 마지막 칩 → 출력 */
  const selfChip = (k: number): ChipDef => {
    const inner: Part[] = Array.from({ length: k }, (_, i) => ({ id: `c${i}`, kind: "chip", x: 0, y: 0, rot: 0, chip: { name: "self", v: 0, inputs: ["a"], outputs: ["y"] } }));
    const wires = [{ a: { part: "a", pin: "y" }, b: { part: "c0", pin: "a" } }, ...inner.slice(1).map((p, i) => ({ a: { part: `c${i}`, pin: "y" }, b: { part: p.id, pin: "a" } })), { a: { part: `c${k - 1}`, pin: "y" }, b: { part: "y", pin: "a" } }];
    return { inputs: ["a"], outputs: ["y"], circuit: { parts: [...ioParts, ...inner], wires } };
  };
  const top = (name: string): Circuit => ({
    parts: [...ckt(["i:in", "o:out"], []).parts, { id: "c", kind: "chip", x: 0, y: 0, rot: 0, chip: { name, v: 0, inputs: ["a"], outputs: ["y"] } }],
    wires: [{ a: { part: "i", pin: "y" }, b: { part: "c", pin: "a" } }, { a: { part: "c", pin: "y" }, b: { part: "o", pin: "a" } }],
  });

  test("자기 자신을 여러 번 품은 칩도 빨리 끝난다(순환 감지)", () => {
    const lib: ChipLib = (ref) => (ref.name === "self" ? { def: selfChip(6), fallback: false } : null);
    const t0 = performance.now();
    const r = simulate(top("self"), { i: 1 }, lib);
    nandCost(top("self"), lib);
    expect(performance.now() - t0).toBeLessThan(100);
    expect(r.missingChip).toBe("self");
  });

  test("두 칩이 서로를 품는 순환도 막는다", () => {
    const pair = (other: string): ChipDef => ({ ...selfChip(2), circuit: { ...selfChip(2).circuit, parts: selfChip(2).circuit.parts.map((p) => (p.chip ? { ...p, chip: { ...p.chip, name: other } } : p)) } });
    const lib: ChipLib = (ref) => (ref.name === "p" ? { def: pair("q"), fallback: false } : ref.name === "q" ? { def: pair("p"), fallback: false } : null);
    const t0 = performance.now();
    expect(simulate(top("p"), { i: 1 }, lib).missingChip).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe('래치(피드백)', () => {
  const SR = ckt(['s_n:in', 'r_n:in', 'n1:nand', 'n2:nand', 'q:out'], ['s_n.y~n1.a', 'n2.y~n1.b', 'r_n.y~n2.a', 'n1.y~n2.b', 'n1.y~q.a']);
  const run = (seq: [0 | 1, 0 | 1][]) => {
    let prev: Record<string, 0 | 1 | 'X'> | undefined;
    return seq.map(([s_n, r_n]) => {
      const r = simulate(SR, { s_n, r_n }, noLib, prev);
      prev = r.net;
      return r;
    });
  };

  test('SR 래치는 설정·유지·리셋된다', () => {
    const rs = run([[0, 1], [1, 1], [1, 0], [1, 1]]);
    expect(rs.map((r) => r.out.q)).toEqual([1, 1, 0, 0]);
    expect(rs.every((r) => !r.oscillating)).toBe(true);
  });

  test('래치는 prev 없이도 발진하지 않고 자리 잡는다', () => {
    const r = simulate(SR, { s_n: 1, r_n: 1 }, noLib);
    expect(r.oscillating).toBe(false);
    expect([0, 1]).toContain(r.out.q);
  });

  test('S·R 동시 해제도 멈추지 않는다', () => {
    const [, r] = run([[0, 0], [1, 1]]);
    if (!r.oscillating) expect([0, 1]).toContain(r.out.q);
  });

  test('NOT 하나 고리는 여전히 발진', () => {
    const c = ckt(['n:nand', 'o:out'], ['n.y~n.a', 'n.y~n.b', 'n.y~o.a']);
    expect(simulate(c, {}, noLib).oscillating).toBe(true);
  });
});

describe("기본 D 플립플롭", () => {
  const go = (c: Circuit, steps: Record<string, 0 | 1>[], out: string[]) => {
    let prev: Record<string, 0 | 1 | "X"> | undefined;
    return steps.map((s) => {
      const r = simulate(c, s, noLib, prev);
      expect(r.oscillating).toBe(false);
      prev = r.net;
      return out.map((o) => r.out[o]);
    });
  };
  const clk2 = (vals: Record<string, 0 | 1>[]) => vals.flatMap((v) => [{ ...v, clk: 0 as const }, { ...v, clk: 1 as const }]);

  test("상승 에지에서만 d를 잡는다", () => {
    const c = ckt(["d:in", "clk:in", "f:dff", "q:out"], ["d.y~f.d", "clk.y~f.clk", "f.q~q.a"]);
    const s = (d: 0 | 1, clk: 0 | 1) => ({ d, clk });
    expect(go(c, [s(1, 0), s(1, 1), s(0, 1), s(0, 0), s(0, 1)], ["q"]).flat()).toEqual([0, 1, 1, 1, 0]);
  });

  test("시프트 레지스터는 부품 순서와 상관없이 한 칸씩", () => {
    const IO = ["s:in", "clk:in", "q0:out", "q1:out", "q2:out"];
    const W = ["s.y~f1.d", "f1.q~f2.d", "f2.q~f3.d", "clk.y~f1.clk", "clk.y~f2.clk", "clk.y~f3.clk", "f1.q~q0.a", "f2.q~q1.a", "f3.q~q2.a"];
    const orders = [["f1", "f2", "f3"], ["f1", "f3", "f2"], ["f2", "f1", "f3"], ["f2", "f3", "f1"], ["f3", "f1", "f2"], ["f3", "f2", "f1"]];
    const steps = clk2([{ s: 1 }, { s: 0 }, { s: 0 }, { s: 1 }]);
    const want = go(ckt([...IO, "f1:dff", "f2:dff", "f3:dff"], W), steps, ["q0", "q1", "q2"]);
    expect(want[3]).toEqual([0, 1, 0]); // 2주기 뒤 첫 s가 q1에
    for (const o of orders) expect(go(ckt([...IO, ...o.map((f) => `${f}:dff`)], W), steps, ["q0", "q1", "q2"])).toEqual(want);
  });

  test("리플 분주기: clk 8주기에 q1은 8번, q2는 4번 바뀐다(1/4 주파수)", () => {
    const c = ckt(
      ["clk:in", "f1:dff", "f2:dff", "n1:nand", "n2:nand", "q1:out", "q2:out"],
      ["clk.y~f1.clk", "f1.q~n1.a", "f1.q~n1.b", "n1.y~f1.d", "n1.y~f2.clk", "f2.q~n2.a", "f2.q~n2.b", "n2.y~f2.d", "f1.q~q1.a", "f2.q~q2.a"],
    );
    const rows = go(c, clk2(Array.from({ length: 8 }, () => ({}))), ["q1", "q2"]);
    const changes = (j: number) => rows.filter((r, k) => k > 0 && r[j] !== rows[k - 1][j]).length;
    expect([changes(0), changes(1)]).toEqual([8, 4]);
  });

  test("clk가 연결되지 않으면 q는 X, 멈춤 없음", () => {
    const c = ckt(["d:in", "f:dff", "q:out"], ["d.y~f.d", "f.q~q.a"]);
    const r = simulate(c, { d: 1 }, noLib);
    expect(r.oscillating).toBe(false);
    expect(r.out.q).toBe("X");
  });

  test("원가: 기본 D 플립플롭 하나 = NAND 9개", () => {
    expect(nandCost(ckt(["f:dff"], []), noLib)).toBe(9);
  });
});
