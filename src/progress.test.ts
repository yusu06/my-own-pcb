import { expect, test } from "vitest";
import {
  completeIfReady, lessonState, lessonSteps, markQuizCorrect, markTaskDone, nextLessonId, openLesson, resumeStep,
  saveWork, setStep,
} from "./progress";
import { emptySave } from "./store/schema";
import type { Lesson } from "./lessons/types";

const mk = (id: string, quizN = 2): Lesson => ({
  id, chapter: 0, title: id, emoji: "", minutes: 5,
  client: { from: "", request: "", requirements: [] },
  concepts: [{ title: "", body: "" }, { title: "", body: "" }],
  tasks: [],
  realWorld: [{ title: "", body: "" }],
  quiz: Array.from({ length: quizN }, () => ({ kind: "choice" as const, q: "", choices: ["x"], answer: 0, explain: "" })),
});
const L = [mk("a"), mk("b"), mk("c")];
const states = (d = emptySave()) => L.map((l) => lessonState(l.id, d, L));

test("단계 순서: client, concept×2, realWorld, quiz, done", () => {
  expect(lessonSteps(L[0]).map((s) => s.kind)).toEqual(["client", "concept", "concept", "realWorld", "quiz", "done"]);
});

test("빈 저장: 첫 단원만 열려 있다", () => {
  expect(states()).toEqual(["available", "locked", "locked"]);
  expect(nextLessonId(emptySave(), L)).toBe("a");
});

test("잠긴 단원을 열면 앞의 미완료 단원은 건너뜀이 된다", () => {
  const d = openLesson("c", emptySave(), L, 1);
  expect(states(d)).toEqual(["skipped", "skipped", "started"]);
  expect(nextLessonId(d, L)).toBe("c");
});

test("앞 단원이 끝나면 다음 단원이 열린다", () => {
  let d = openLesson("a", emptySave(), L, 1);
  for (const qi of [0, 1]) d = markQuizCorrect("a", d, qi, 2);
  d = completeIfReady("a", d, L[0], 3);
  expect(states(d)).toEqual(["done", "available", "locked"]);
});

test("퀴즈를 전부 맞혀야 완료된다", () => {
  let d = openLesson("a", emptySave(), L, 1);
  d = markQuizCorrect("a", d, 0, 2);
  d = markQuizCorrect("a", d, 0, 2);
  expect(completeIfReady("a", d, L[0], 3).progress.a.status).toBe("started");
  d = markQuizCorrect("a", d, 1, 2);
  expect(completeIfReady("a", d, L[0], 3).progress.a.status).toBe("done");
});

test("완료한 단원을 다시 열어도 완료가 유지된다", () => {
  let d = openLesson("a", emptySave(), L, 1);
  d = completeIfReady("a", markQuizCorrect("a", markQuizCorrect("a", d, 0, 1), 1, 1), L[0], 1);
  expect(openLesson("a", d, L, 9).progress.a.status).toBe("done");
});

test("건너뛴 단원도 나중에 끝내면 완료가 된다", () => {
  let d = openLesson("b", emptySave(), L, 1);
  expect(d.progress.a.status).toBe("skipped");
  d = openLesson("a", d, L, 2);
  d = completeIfReady("a", markQuizCorrect("a", markQuizCorrect("a", d, 0, 3), 1, 3), L[0], 4);
  expect(d.progress.a.status).toBe("done");
});

test("저장된 단계가 범위를 넘으면 맞춰서 이어 한다", () => {
  let d = setStep("a", openLesson("a", emptySave(), L, 1), 99, 2);
  expect(resumeStep("a", d, L[0])).toBe(5);
  d = setStep("a", d, -3, 2);
  expect(resumeStep("a", d, L[0])).toBe(0);
  d = setStep("a", d, 2, 2);
  expect(resumeStep("a", d, L[0])).toBe(2);
  expect(resumeStep("b", d, L[1])).toBe(0);
});

test("과제가 있으면 퀴즈와 과제를 모두 끝내야 완료된다", () => {
  const withTask = { ...mk("t", 1), tasks: [{} as never] };
  let d = openLesson("t", emptySave(), [withTask], 1);
  d = markQuizCorrect("t", d, 0, 2);
  expect(completeIfReady("t", d, withTask, 3).progress.t.status).toBe("started");
  d = markTaskDone("t", d, 0, 4);
  d = markTaskDone("t", d, 0, 4);
  expect(d.progress.t.tasksDone).toEqual([0]);
  expect(completeIfReady("t", d, withTask, 5).progress.t.status).toBe("done");
});

test("saveWork는 입력을 바꾸지 않고 회로를 저장한다", () => {
  const d = emptySave();
  const out = saveWork(d, "0-1#0", { parts: [], wires: [] });
  expect(out.work["0-1#0"]).toEqual({ parts: [], wires: [] });
  expect(d.work).toEqual({});
});

test("완료한 단원을 다시 열면 0단계부터", () => {
  let d = openLesson("a", emptySave(), L, 1);
  d = completeIfReady("a", markQuizCorrect("a", markQuizCorrect("a", d, 0, 1), 1, 1), L[0], 1);
  d = setStep("a", d, 5, 2);
  expect(resumeStep("a", d, L[0])).toBe(0);
});

test("입력 데이터를 변경하지 않는다", () => {
  const d = openLesson("a", emptySave(), L, 1);
  const before = structuredClone(d);
  openLesson("c", d, L, 2);
  setStep("a", d, 3, 2);
  markQuizCorrect("a", d, 0, 2);
  completeIfReady("a", d, L[0], 2);
  expect(d).toEqual(before);
});
