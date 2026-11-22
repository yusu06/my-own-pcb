import { describe, expect, test } from "vitest";
import { CHAPTERS, LESSONS, findLesson } from "./index";
import { GLOSSARY } from "./glossary";
import type { ElectricTask, Lesson, Task } from "./types";
import type { Circuit } from "../sim/electric/types";
import { gradeLogic } from "../grader/logic";
import { makeLib } from "../sim/digital/chips";
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
    ...l.tasks.flatMap((t) => [t.title, t.goal, t.hint, ...t.palette.map((p) => p.label)]),
  ];
}

const switchIds = (t: ElectricTask) => t.palette.filter((p) => SWITCH_KINDS.includes(p.kind)).map((p) => p.id);
const lib = makeLib({}); // 부품함이 비어 있으면 기본 부품으로 채점
const failures = (t: Task, c: Circuit): string[] =>
  (t.kind === "electric" ? gradeElectric(c, t.checks, switchIds(t)) : gradeLogic(c, t, lib).results).filter((x) => !x.ok).map((x) => x.message);

describe.each(LESSONS.flatMap((l) => l.tasks.map((t, i) => [`${l.id} 과제 ${i + 1}`, t] as const)))("%s", (_name, t) => {
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
      expect(t.expect).toHaveLength(1 << t.inputs.length);
      for (const row of t.expect) expect(row).toHaveLength(t.outputs.length);
    });
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
