import { expect, test } from "vitest";
import { gradeVerilog } from "./verilog";
import type { VerilogTask } from "../lessons/types";

const task: VerilogTask = {
  kind: "verilog",
  title: "AND",
  goal: "",
  hint: "",
  top: "and2",
  skeleton: "module and2(input a, input b, output y);\n\nendmodule",
  inputs: [{ name: "a", width: 1 }, { name: "b", width: 1 }],
  outputs: [{ name: "y", width: 1 }],
  spec: ({ a, b }) => ({ y: a & b }),
  reference: "module and2(input a, input b, output y);\n  assign y = a & b;\nendmodule",
  wrong: [],
};
const code = (body: string, ports = "input a, input b, output y") => `module and2(${ports});\n${body}\nendmodule`;

test("정답은 통과, 모든 입력 조합을 돈다", () => {
  const g = gradeVerilog(task.reference, task);
  expect(g.error).toBeNull();
  expect(g.passed).toBe(true);
  expect(g.total).toBe(4);
  expect(g.rows).toHaveLength(4);
});

test("오답은 틀린 줄이 앞에 온다", () => {
  const g = gradeVerilog(code("  assign y = a | b;"), task);
  expect(g.passed).toBe(false);
  expect(g.rows.slice(0, 2).every((r) => !r.ok)).toBe(true);
  expect(g.rows.slice(2).every((r) => r.ok)).toBe(true);
  expect(g.rows[0]).toMatchObject({ inputs: { a: 0, b: 1 }, expect: { y: 0 }, got: { y: 1 } });
});

test("문법 오류는 줄 번호가 있는 오류로", () => {
  const g = gradeVerilog(code("  assign y = a & b"), task);
  expect(g.passed).toBe(false);
  expect(g.error?.line).toBe(2);
  expect(g.rows).toEqual([]);
});

test("포트 이름·너비가 다르거나 모듈 이름이 다르면 안내", () => {
  expect(gradeVerilog(code("  assign z = a & b;", "input a, input b, output z"), task).error?.message).toContain("‘y’");
  expect(gradeVerilog(code("  assign y = a & b;", "input [1:0] a, input b, output y"), task).error?.message).toContain("‘a’");
  expect(gradeVerilog(task.reference.replace("and2", "andx"), task).error?.message).toContain("‘and2’");
  expect(gradeVerilog(code("  assign y = a & b;", "input a, input b, input c, output y"), task).error?.message).toContain("‘c’");
});

test("조합 루프도 오류로(크래시 없음)", () => {
  const g = gradeVerilog(code("  wire t;\n  assign t = ~t;\n  assign y = t;"), task);
  expect(g.passed).toBe(false);
  expect(g.error?.message).toContain("조합 루프");
});

test("빈 뼈대는 실패", () => {
  const g = gradeVerilog(task.skeleton, task);
  expect(g.passed).toBe(false);
  expect(g.error?.message).toContain("값을 넣는 곳이 없어요");
});

test("아주 깊게 겹친 식도 크래시 없이 오류로", () => {
  const deep = "(".repeat(5000) + "a & b" + ")".repeat(5000);
  const g = gradeVerilog(code(`  assign y = ${deep};`), task);
  expect(g.passed).toBe(false);
  expect(g.error?.message).toContain("너무 깊게");
});
