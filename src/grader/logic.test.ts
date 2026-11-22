import { expect, test } from "vitest";
import { gradeLogic } from "./logic";
import { ckt } from "../sim/electric/ckt";
import { makeLib } from "../sim/digital/chips";
import type { LogicTask } from "../lessons/types";
import type { Circuit } from "../sim/electric/types";

const lib = makeLib({});
const IO = ["a:in", "b:in", "y:out"];
const task: LogicTask = {
  kind: "logic",
  title: "",
  goal: "",
  hint: "",
  palette: [{ id: "nand", kind: "nand", label: "NAND", multi: true }],
  preset: ckt(IO, []),
  inputs: ["a", "b"],
  outputs: ["y"],
  expect: [[0], [0], [0], [1]],
  reference: ckt([], []),
  wrong: [],
};
const AND: Circuit = ckt([...IO, "nand1:nand", "nand2:nand"], ["a.y~nand1.a", "b.y~nand1.b", "nand1.y~nand2.a", "nand1.y~nand2.b", "nand2.y~y.a"]);
const fails = (r: ReturnType<typeof gradeLogic>) => r.results.filter((x) => !x.ok).map((x) => x.message);

test("맞는 AND는 통과, 원가 2", () => {
  const r = gradeLogic(AND, task, lib);
  expect(fails(r)).toEqual([]);
  expect(r.cost).toBe(2);
  expect(r.results[0].lrows).toHaveLength(4);
});

test("연결 안 된 입력이 있으면 X 안내로 실패", () => {
  const c = ckt([...IO, "nand1:nand", "nand2:nand"], ["a.y~nand1.a", "nand1.y~nand2.a", "nand1.y~nand2.b", "nand2.y~y.a"]);
  expect(fails(gradeLogic(c, task, lib)).join()).toContain("(X)");
});

test("출력끼리 연결하면 충돌 안내", () => {
  const c = ckt(IO, ["a.y~b.y", "a.y~y.a"]);
  expect(fails(gradeLogic(c, task, lib)).join()).toContain("출력끼리");
});

test("발진 안내", () => {
  const c = ckt([...IO, "nand1:nand"], ["a.y~nand1.b", "nand1.y~nand1.a", "nand1.y~y.a"]);
  expect(fails(gradeLogic(c, task, lib)).join()).toContain("발진");
});

test("없는 칩 안내", () => {
  const c: Circuit = { ...ckt(IO, []), parts: [...ckt(IO, []).parts, { id: "c1", kind: "chip", x: 0, y: 0, rot: 0, chip: { name: "zzz", v: null, inputs: ["a"], outputs: ["y"] } }] };
  expect(fails(gradeLogic(c, task, lib)).join()).toContain("‘zzz’");
});

test("costRequired: 목표를 넘으면 실패, 맞으면 star", () => {
  expect(fails(gradeLogic(AND, { ...task, maxCost: 1, costRequired: true }, lib)).join()).toContain("목표 1개 이하");
  const ok = gradeLogic(AND, { ...task, maxCost: 2, costRequired: true }, lib);
  expect(fails(ok)).toEqual([]);
  expect(ok.star).toBe(true);
  const soft = gradeLogic(AND, { ...task, maxCost: 1 }, lib);
  expect(fails(soft)).toEqual([]);
  expect(soft.star).toBe(false);
});

test("costRequired는 부품함 부품을 기본 부품 원가로 센다(예전에 비싸게 만든 부품 때문에 막히지 않게)", () => {
  // 사용자가 NAND 4개로 만든 AND(맞지만 비쌈)
  const fatAnd = {
    inputs: ["a", "b"], outputs: ["y"],
    circuit: ckt(["a:in", "b:in", "n1:nand", "n2:nand", "n3:nand", "n4:nand", "y:out"],
      ["a.y~n1.a", "b.y~n1.b", "n1.y~n2.a", "n1.y~n2.b", "n2.y~n3.a", "n2.y~n3.b", "n3.y~n4.a", "n3.y~n4.b", "n4.y~y.a"]),
  };
  const myLib = makeLib({ and: [fatAnd] });
  const c: Circuit = { ...ckt(IO, ["a.y~and1.a", "b.y~and1.b", "and1.y~y.a"]), parts: [...ckt(IO, []).parts, { id: "and1", kind: "chip", x: 0, y: 0, rot: 0, chip: { name: "and", v: 0, inputs: ["a", "b"], outputs: ["y"] } }] };
  const t = { ...task, palette: [{ id: "and", kind: "chip" as const, chip: "and" as const, label: "AND", multi: true }], maxCost: 2, costRequired: true };
  const r = gradeLogic(c, t, myLib);
  expect(r.cost).toBe(4);
  expect(fails(r)).toEqual([]);
});

const SR_IO = ['s_n:in', 'r_n:in', 'q:out'];
const latchTask: LogicTask = {
  ...task,
  preset: ckt(SR_IO, []),
  inputs: ['s_n', 'r_n'],
  outputs: ['q'],
  expect: [],
  seq: {
    steps: [{ s_n: 0, r_n: 1 }, { s_n: 1, r_n: 1 }, { s_n: 1, r_n: 0 }, { s_n: 1, r_n: 1 }],
    model() {
      let q: 0 | 1 = 0;
      return (i) => {
        if (!i.s_n) q = 1;
        else if (!i.r_n) q = 0;
        return { q };
      };
    },
  },
};
const SR: Circuit = ckt([...SR_IO, 'n1:nand', 'n2:nand'], ['s_n.y~n1.a', 'n2.y~n1.b', 'r_n.y~n2.a', 'n1.y~n2.b', 'n1.y~q.a']);
// 기억 없이 q = NOT s_n
const NO_MEMORY: Circuit = ckt([...SR_IO, 'n1:nand'], ['s_n.y~n1.a', 's_n.y~n1.b', 'n1.y~q.a']);

test('순차 과제는 단계마다 prev를 이어 채점한다', () => {
  const ok = gradeLogic(SR, latchTask, lib);
  expect(fails(ok)).toEqual([]);
  const bad = gradeLogic(NO_MEMORY, latchTask, lib);
  expect(fails(bad)).toHaveLength(1);
  const tl = bad.results[0].timeline!;
  expect(tl.map((r) => r.name)).toEqual(['s_n', 'r_n', 'q']);
  expect(tl[2].bad!.some(Boolean)).toBe(true);
  expect(tl[0].values).toEqual([0, 1, 1, 1]);
});

test('from 이전 단계는 검사하지 않는다', () => {
  const t: LogicTask = { ...latchTask, seq: { ...latchTask.seq!, steps: [{ s_n: 1, r_n: 1 }, ...latchTask.seq!.steps], from: 1 } };
  // 첫 단계(전원 직후)는 회로가 어느 값이든 상관없다
  expect(fails(gradeLogic(SR, t, lib))).toEqual([]);
});
