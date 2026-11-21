import { describe, expect, test } from "vitest";
import { CHAPTERS, LESSONS, findLesson } from "./index";
import { GLOSSARY } from "./glossary";
import type { Lesson } from "./types";

const TERM_RE = /\[\[([a-z0-9-]+)\]\]/g;

function allTexts(l: Lesson): string[] {
  return [
    l.client.request,
    ...l.client.requirements,
    ...l.concepts.flatMap((c) => [c.title, c.body]),
    ...l.realWorld.flatMap((c) => [c.title, c.body]),
    ...l.quiz.flatMap((q) => [q.q, q.explain, ...(q.kind === "choice" ? q.choices : [])]),
  ];
}

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
