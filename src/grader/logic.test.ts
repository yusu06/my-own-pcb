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
