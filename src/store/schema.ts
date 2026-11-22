export const CURRENT_VERSION = 3;

export interface LessonProgress {
  status: "started" | "done" | "skipped";
  step: number;
  quizCorrect: number[];
  tasksDone: number[];
  updatedAt: number;
  /** 이 단원 논리 과제에서 낸 최저 NAND 원가 */
  best?: number;
}

export interface SaveData {
  version: 3;
  progress: Record<string, LessonProgress>;
  /** 키 = `${lessonId}#${taskIndex}`, 값 = 사용자가 만든 회로. 읽는 쪽(sanitizeCircuit)에서 검증한다. */
  work: Record<string, unknown>;
  /** 부품함: 부품 이름 → 버전 목록(0부터). 읽는 쪽(makeLib)에서 검증한다. */
  chips: Record<string, unknown[]>;
  settings: { theme: "system" | "light" | "dark" };
}

export function emptySave(): SaveData {
  return { version: 3, progress: {}, work: {}, chips: {}, settings: { theme: "system" } };
}
