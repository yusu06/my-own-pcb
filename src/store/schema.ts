export const CURRENT_VERSION = 2;

export interface LessonProgress {
  status: "started" | "done" | "skipped";
  step: number;
  quizCorrect: number[];
  tasksDone: number[];
  updatedAt: number;
}

export interface SaveData {
  version: 2;
  progress: Record<string, LessonProgress>;
  /** 키 = `${lessonId}#${taskIndex}`, 값 = 사용자가 만든 회로. 읽는 쪽(sanitizeCircuit)에서 검증한다. */
  work: Record<string, unknown>;
  settings: { theme: "system" | "light" | "dark" };
}

export function emptySave(): SaveData {
  return { version: 2, progress: {}, work: {}, settings: { theme: "system" } };
}
