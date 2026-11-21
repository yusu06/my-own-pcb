export const CURRENT_VERSION = 1;

export interface LessonProgress {
  status: "started" | "done" | "skipped";
  step: number;
  quizCorrect: number[];
  updatedAt: number;
}

export interface SaveData {
  version: 1;
  progress: Record<string, LessonProgress>;
  settings: { theme: "system" | "light" | "dark" };
}

export function emptySave(): SaveData {
  return { version: 1, progress: {}, settings: { theme: "system" } };
}
