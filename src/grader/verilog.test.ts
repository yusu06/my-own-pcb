import { expect, test } from "vitest";
import { gradeVerilog } from "./verilog";
import type { VerilogTask } from "../lessons/types";
import { clocked } from "../lessons/seq";

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

const DFF = (body: string) => `module dff(input clk, input d, output reg q);\n${body}\nendmodule`;
const seqTask: VerilogTask = {
  kind: "verilog",
  title: "D 플립플롭",
  goal: "",
  hint: "",
  top: "dff",
  skeleton: DFF(""),
  inputs: [{ name: "clk", width: 1 }, { name: "d", width: 1 }],
  outputs: [{ name: "q", width: 1 }],
  seq: {
    steps: clocked([{ d: 1 }, { d: 0 }, { d: 0 }, { d: 1 }]).map((s, k) => (k % 2 === 0 ? { ...s, d: 1 - s.d } : s)),
    model() {
      let q = 0;
      let last = 0;
      return ({ clk, d }) => {
        if (clk && !last) q = d;
        last = clk;
        return { q };
      };
    },
  },
  reference: DFF("  always @(posedge clk) q <= d;"),
  wrong: [],
};

test("순차 Verilog는 타임라인으로 채점한다", () => {
  const ok = gradeVerilog(seqTask.reference, seqTask);
  expect(ok.error).toBeNull();
  expect(ok.passed).toBe(true);
  expect(ok.total).toBe(8);
  expect(ok.timeline!.map((r) => r.name)).toEqual(["clk", "d", "q"]);
  // 클럭 없이 d를 그대로 내보내면 에지 사이에서 달라진다
  const bad = gradeVerilog(DFF("  always @(*) q = d;"), seqTask);
  expect(bad.passed).toBe(false);
  expect(bad.timeline![2].bad!.some(Boolean)).toBe(true);
  expect(gradeVerilog(DFF("  always @(posedge clk) q <= d;").replace("input d", "input [1:0] d"), seqTask).error?.message).toContain("1비트");
});
