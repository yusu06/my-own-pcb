import { expect, test } from "vitest";
import { compile } from "../../sim/verilog";
import { clocked } from "../seq";
import { TOY4_EXEC, TOY4_OPS, TOY4_PARAMS, cpuVerilog, ins, romCases, toy4 } from "./toy4";

/** 각 주기 clk 0→1, rstAt 주기에 rst = 1 */
const script = (n: number, rstAt: number[] = [0], sensor: (k: number) => number = () => 0) =>
  clocked(
    Array.from({ length: n }, (_, k) => ({ rst: rstAt.includes(k) ? 1 : 0, sensor: sensor(k) })),
    ["rst"],
  );
const run = (program: number[], steps: Record<string, number>[]) => {
  const m = toy4(program)();
  return steps.map((s) => m(s));
};

test("명령어 표는 op 0~7", () => {
  expect(TOY4_OPS.map((o) => o.op)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(TOY4_OPS.map((o) => o.name)).toEqual(["LDI", "ADD", "SUB", "OUT", "JMP", "JZ", "IN", "HLT"]);
});

test("ins는 {op, n} 바이트", () => {
  expect(ins("IN")).toBe(0x60);
  expect(ins("JZ", 5)).toBe(0x55);
  expect(ins("HLT")).toBe(0x70);
});

test("넘침은 4비트로 버린다", () => {
  const p = [ins("LDI", 15), ins("ADD", 2), ins("OUT"), ins("SUB", 3), ins("OUT"), ins("HLT")];
  const outs = run(p, script(10)).map((o) => o.out);
  expect(outs).toContain(1);
  expect(outs.at(-1)).toBe(14);
  // OUT 1 다음에 14가 온다
  expect(outs.indexOf(14)).toBeGreaterThan(outs.indexOf(1));
});

test("JZ는 A가 0일 때만 점프하고, HLT에서 pc가 멈춘다", () => {
  // A=1이면 JZ를 지나 HLT(주소 2), A=0이면 주소 3의 HLT
  const p1 = [ins("LDI", 1), ins("JZ", 3), ins("HLT"), ins("HLT")];
  const p0 = [ins("LDI", 0), ins("JZ", 3), ins("HLT"), ins("HLT")];
  expect(run(p1, script(8)).at(-1)!.pc).toBe(2);
  expect(run(p0, script(8)).at(-1)!.pc).toBe(3);
});

test("rst 에지에 pc·out이 0으로 돌아간다", () => {
  const p = [ins("LDI", 5), ins("OUT"), ins("HLT")];
  const o = run(p, script(10, [0, 6]));
  expect(o[11]).toEqual({ out: 5, pc: 2 }); // 6번째 주기 clk=0: 아직 이전 값
  expect(o[13]).toEqual({ out: 0, pc: 0 }); // 7번째 주기(rst) 에지 뒤
});

test("프로그램 밖 주소는 HLT", () => {
  const o = run([ins("LDI", 2)], script(6));
  expect(o.at(-1)!.pc).toBe(1);
});

const COUNTDOWN = [ins("LDI", 3), ins("OUT"), ins("JZ", 5), ins("SUB", 1), ins("JMP", 1), ins("HLT")];
const SENSE = [ins("IN"), ins("JZ", 5), ins("LDI", 1), ins("OUT"), ins("JMP", 0), ins("LDI", 3), ins("OUT"), ins("JMP", 0)];

test.each([
  ["카운트다운", COUNTDOWN],
  ["센서", SENSE],
])("모범 CPU Verilog가 TS 모델과 클럭마다 같다 (%s)", (_n, p) => {
  const steps = script(40, [0, 25], (k) => (k > 12 && k < 30 ? 1 : 0));
  const s = compile(cpuVerilog(romCases(p), TOY4_EXEC), "cpu").sim();
  const got = steps.map((i) => s.step(i));
  const want = run(p, steps);
  // 첫 단계(리셋 에지 전)는 값이 정해지지 않았다
  expect(got.slice(1)).toEqual(want.slice(1));
});

test("3-6 모델은 구간마다 마지막 4주기만 out을 채점하고 pc는 채점하지 않는다", async () => {
  const { lesson } = await import("./3-6-robot");
  const t = lesson.tasks[0];
  if (t.kind !== "verilog" || !t.seq) throw new Error("3-6 과제는 순차 Verilog");
  const m = t.seq.model();
  const outs = t.seq.steps.map((s) => m(s));
  expect(outs.filter((o) => o.out !== undefined)).toHaveLength(6 * 4 * 2);
  expect(outs.every((o) => o.pc === undefined)).toBe(true);
});

test("{IN, 4'd0}는 8비트 0x60", () => {
  const d = compile(`module t(output [7:0] y);\n${TOY4_PARAMS}  assign y = {IN, 4'd0};\nendmodule\n`, "t");
  expect(d.run({}).y).toBe(0x60);
});
