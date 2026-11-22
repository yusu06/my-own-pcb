import type { Lesson } from "./lessons/types";
import type { LessonProgress, SaveData } from "./store/schema";
import type { ChipDef } from "./sim/digital/sim";

export type Step =
  | { kind: "client" }
  | { kind: "concept"; i: number }
  | { kind: "task"; i: number }
  | { kind: "realWorld"; i: number }
  | { kind: "quiz" }
  | { kind: "done" };

export type LessonState = "locked" | "available" | "started" | "done" | "skipped";

export function lessonSteps(l: Lesson): Step[] {
  return [
    { kind: "client" },
    ...l.concepts.map((_, i) => ({ kind: "concept" as const, i })),
    ...l.tasks.map((_, i) => ({ kind: "task" as const, i })),
    ...l.realWorld.map((_, i) => ({ kind: "realWorld" as const, i })),
    { kind: "quiz" },
    { kind: "done" },
  ];
}

export function lessonState(id: string, d: SaveData, lessons: Lesson[]): LessonState {
  const p = d.progress[id];
  if (p) return p.status;
  const i = lessons.findIndex((l) => l.id === id);
  if (i <= 0) return "available";
  const prev = lessonState(lessons[i - 1].id, d, lessons);
  return prev === "done" || prev === "skipped" ? "available" : "locked";
}

export function nextLessonId(d: SaveData, lessons: Lesson[]): string | null {
  const st = d.progress;
  return lessons.find((l) => st[l.id]?.status !== "done" && st[l.id]?.status !== "skipped")?.id ?? null;
}

function patch(d: SaveData, id: string, now: number, f: (p: LessonProgress) => Partial<LessonProgress>): SaveData {
  const p = d.progress[id] ?? { status: "started", step: 0, quizCorrect: [], tasksDone: [], updatedAt: now };
  return { ...d, progress: { ...d.progress, [id]: { ...p, ...f(p), updatedAt: now } } };
}

export function openLesson(id: string, d: SaveData, lessons: Lesson[], now: number): SaveData {
  let out = d;
  for (const l of lessons) {
    if (l.id === id) break;
    if (!out.progress[l.id] || out.progress[l.id].status === "started") {
      out = patch(out, l.id, now, () => ({ status: "skipped" }));
    }
  }
  return patch(out, id, now, (p) => ({ status: p.status === "done" ? "done" : "started" }));
}

export function resumeStep(id: string, d: SaveData, l: Lesson): number {
  if (d.progress[id]?.status === "done") return 0; // 복습은 처음부터
  const last = lessonSteps(l).length - 1;
  return Math.min(Math.max(d.progress[id]?.step ?? 0, 0), last);
}

export function setStep(id: string, d: SaveData, step: number, now: number): SaveData {
  return patch(d, id, now, () => ({ step }));
}

export function markQuizCorrect(id: string, d: SaveData, qi: number, now: number): SaveData {
  return patch(d, id, now, (p) => ({ quizCorrect: p.quizCorrect.includes(qi) ? p.quizCorrect : [...p.quizCorrect, qi] }));
}

export function markTaskDone(id: string, d: SaveData, ti: number, now: number): SaveData {
  return patch(d, id, now, (p) => ({ tasksDone: p.tasksDone.includes(ti) ? p.tasksDone : [...p.tasksDone, ti] }));
}

export function saveWork(d: SaveData, key: string, circuit: unknown): SaveData {
  return { ...d, work: { ...d.work, [key]: circuit } };
}

export function completeIfReady(id: string, d: SaveData, l: Lesson, now: number): SaveData {
  const got = new Set(d.progress[id]?.quizCorrect ?? []);
  const tasks = new Set(d.progress[id]?.tasksDone ?? []);
  const ready = l.quiz.every((_, i) => got.has(i)) && l.tasks.every((_, i) => tasks.has(i));
  return ready ? patch(d, id, now, () => ({ status: "done" })) : d;
}

/** 부품함에 저장. 최신 버전과 같으면 그 번호, 다르면 새 버전을 덧붙인다(옛 회로는 옛 버전을 계속 쓴다). */
export function saveChip(d: SaveData, name: string, def: ChipDef): { data: SaveData; version: number } {
  const versions = d.chips[name] ?? [];
  const last = versions.length - 1;
  if (last >= 0 && JSON.stringify(versions[last]) === JSON.stringify(def)) return { data: d, version: last };
  return { data: { ...d, chips: { ...d.chips, [name]: [...versions, def] } }, version: last + 1 };
}

/** 단원의 최저 NAND 원가 기록(더 낮을 때만) */
export function recordCost(d: SaveData, id: string, cost: number): SaveData {
  const p = d.progress[id];
  if (!p || (p.best !== undefined && p.best <= cost)) return d;
  return { ...d, progress: { ...d.progress, [id]: { ...p, best: cost } } };
}
