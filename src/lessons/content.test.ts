import { describe, expect, test } from "vitest";
import { CHAPTERS, LESSONS, findLesson } from "./index";
import { GLOSSARY } from "./glossary";
import type { CircuitTask, ElectricTask, Lesson, VerilogTask } from "./types";
import { gradeVerilog, verilogCombos } from "../grader/verilog";
import { parse } from "../sim/verilog/parser";
import type { Circuit } from "../sim/electric/types";
import { gradeLogic } from "../grader/logic";
import { DEFAULT_CHIPS, makeLib } from "../sim/digital/chips";
import { gradeElectric } from "../grader/electric";
import { SWITCH_KINDS } from "../sim/electric/parts";

test("과제가 있는 단원이 하나 이상 있다", () => {
  expect(LESSONS.some((l) => l.tasks.length > 0)).toBe(true);
});

const TERM_RE = /\[\[([a-z0-9-]+)\]\]/g;

function allTexts(l: Lesson): string[] {
  return [
    l.client.request,
    ...l.client.requirements,
    ...l.concepts.flatMap((c) => [c.title, c.body]),
    ...l.realWorld.flatMap((c) => [c.title, c.body]),
    ...l.quiz.flatMap((q) => [q.q, q.explain, ...(q.kind === "choice" ? q.choices : [])]),
    ...l.tasks.flatMap((t) => [t.title, t.goal, t.hint, ...(t.kind === "verilog" ? Object.values(t.labels ?? {}) : t.palette.map((p) => p.label))]),
  ];
}

const switchIds = (t: ElectricTask) => t.palette.filter((p) => SWITCH_KINDS.includes(p.kind)).map((p) => p.id);
const lib = makeLib({}); // 부품함이 비어 있으면 기본 부품으로 채점
const failures = (t: CircuitTask, c: Circuit): string[] =>
  (t.kind === "electric" ? gradeElectric(c, t.checks, switchIds(t)) : gradeLogic(c, t, lib).results).filter((x) => !x.ok).map((x) => x.message);

const circuitTasks = LESSONS.flatMap((l) => l.tasks.map((t, i) => [`${l.id} 과제 ${i + 1}` as string, t] as const)).filter(
  (x): x is readonly [string, CircuitTask] => x[1].kind !== "verilog",
);
const verilogTasks = LESSONS.flatMap((l) => l.tasks.map((t, i) => [`${l.id} 과제 ${i + 1}` as string, t] as const)).filter(
  (x): x is readonly [string, VerilogTask] => x[1].kind === "verilog",
);

describe.each(verilogTasks)("%s (Verilog)", (_name, t) => {
  test("모범 답안은 통과한다", () => {
    const g = gradeVerilog(t.reference, t);
    expect(g.error?.message ?? null).toBeNull();
    expect(g.passed).toBe(true);
  });
  test("오답은 하나 이상 있고, 각각 실패한다", () => {
    expect(t.wrong.length).toBeGreaterThanOrEqual(1);
    for (const w of t.wrong) expect(gradeVerilog(w, t).passed, w).toBe(false);
  });
  test("뼈대는 문법이 맞고, 그대로 내면 실패한다", () => {
    expect(() => parse(t.skeleton)).not.toThrow();
    expect(gradeVerilog(t.skeleton, t).passed).toBe(false);
  });
  test("입력·기대값이 포트 너비 안에 있다", () => {
    if (t.seq) {
      const m = t.seq.model();
      for (const i of t.seq.steps) {
        for (const p of t.inputs) expect(i[p.name], `${p.name} @ ${JSON.stringify(i)}`).toBeLessThan(2 ** p.width);
        const o = m(i);
        for (const p of t.outputs) expect(o[p.name], `${p.name} @ ${JSON.stringify(i)}`).toBeLessThan(2 ** p.width);
      }
      return;
    }
    for (const i of verilogCombos(t)) {
      const o = t.spec(i);
      for (const p of t.outputs) expect(o[p.name], `${p.name} @ ${JSON.stringify(i)}`).toBeLessThan(2 ** p.width);
    }
  });
});

describe.each(circuitTasks)("%s", (_name, t) => {
  test("모범 답안은 모든 검사를 통과한다", () => {
    expect(failures(t, t.reference)).toEqual([]);
  });

  test("오답은 하나 이상 있고, 각각 검사에 걸린다", () => {
    expect(t.wrong.length).toBeGreaterThanOrEqual(1);
    for (const w of t.wrong) expect(failures(t, w).length, JSON.stringify(w.wires)).toBeGreaterThan(0);
  });

  test("회로의 부품 id는 팔레트나 미리 놓인 부품에 있다", () => {
    const multi = t.palette.filter((p) => p.multi).map((p) => p.id);
    const known = new Set([...t.palette.map((p) => p.id), ...t.preset.parts.map((p) => p.id)]);
    for (const c of [t.reference, ...t.wrong])
      for (const p of c.parts) expect(known.has(p.id) || multi.some((m) => new RegExp(`^${m}\\d+$`).test(p.id)), p.id).toBe(true);
  });

  if (t.kind === "logic") {
    test("입출력이 미리 놓인 in·out 부품과 같고, 진리표 줄 수가 맞다", () => {
      const ids = (k: string) => t.preset.parts.filter((p) => p.kind === k).map((p) => p.id);
      expect(ids("in")).toEqual(t.inputs);
      expect(ids("out")).toEqual(t.outputs);
      if (t.seq) {
        // 순차 과제: 진리표 대신 각본. 단계마다 모든 입력을 정한다
        expect(t.expect).toEqual([]);
        for (const s of t.seq.steps) expect(Object.keys(s).sort()).toEqual([...t.inputs].sort());
        return;
      }
      expect(t.expect).toHaveLength(1 << t.inputs.length);
      for (const row of t.expect) expect(row).toHaveLength(t.outputs.length);
    });
    if (t.saveAs) {
      test("부품함에 저장하는 과제는 기본 부품과 같은 핀 이름을 쓴다", () => {
        expect(t.inputs).toEqual(DEFAULT_CHIPS[t.saveAs!].inputs);
        expect(t.outputs).toEqual(DEFAULT_CHIPS[t.saveAs!].outputs);
      });
    }
    if (t.maxCost !== undefined) {
      test("모범 답안은 원가 목표를 만족하고, 목표를 넘는 오답이 있다", () => {
        expect(gradeLogic(t.reference, t, lib).cost).toBeLessThanOrEqual(t.maxCost!);
        if (t.costRequired) expect(t.wrong.some((w) => gradeLogic(w, t, lib).cost > t.maxCost!)).toBe(true);
      });
    }
  }
});

test("8개 장 제목이 있다", () => {
  expect(CHAPTERS.length).toBe(8);
});

test("단원 id 형식이 맞고 중복이 없다", () => {
  const ids = LESSONS.map((l) => l.id);
  for (const id of ids) expect(id).toMatch(/^\d-\d{1,2}$/);
  expect(new Set(ids).size).toBe(ids.length);
  expect(findLesson("0-1")?.title).toBe("손전등");
  expect(findLesson("9-9")).toBeUndefined();
});

describe.each(LESSONS.map((l) => [l.id, l] as const))("단원 %s", (_id, l) => {
  test("분량과 구성", () => {
    expect(l.minutes).toBeGreaterThanOrEqual(5);
    expect(l.minutes).toBeLessThanOrEqual(20);
    expect(l.concepts.length).toBeGreaterThanOrEqual(1);
    expect(l.quiz.length).toBeGreaterThanOrEqual(2);
    expect(l.quiz.length).toBeLessThanOrEqual(3);
    expect(CHAPTERS.some((c) => c.n === l.chapter)).toBe(true);
  });

  test("퀴즈 정답이 유효하다", () => {
    for (const q of l.quiz) {
      if (q.kind === "choice") {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
      } else {
        expect(q.tolerance).toBeGreaterThan(0);
      }
    }
  });

  test("본문의 용어가 모두 용어집에 있다", () => {
    for (const t of allTexts(l)) {
      for (const m of t.matchAll(TERM_RE)) expect(GLOSSARY, `용어 ${m[1]}`).toHaveProperty(m[1]);
    }
  });
});
