/** PC 키보드 단축키. 순수 함수라 테스트하기 쉽고, 화면 코드는 결과만 실행한다. */
export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export type EditorKeyAction = "undo" | "redo" | "deleteWire" | "cancel" | "test";

export function editorKey(e: KeyLike): EditorKeyAction | null {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === "z") return e.shiftKey ? "redo" : "undo";
  if (mod && k === "y") return "redo";
  if (mod && e.key === "Enter") return "test";
  if (mod) return null;
  if (e.key === "Delete" || e.key === "Backspace") return "deleteWire";
  if (e.key === "Escape") return "cancel";
  return null;
}

export type LessonKeyAction = { t: "next" } | { t: "prev" } | { t: "choice"; i: number };

export function lessonKey(e: KeyLike): LessonKeyAction | null {
  if (e.ctrlKey || e.metaKey) return null;
  if (e.key === "ArrowRight") return { t: "next" };
  if (e.key === "ArrowLeft") return { t: "prev" };
  if (/^[1-9]$/.test(e.key)) return { t: "choice", i: Number(e.key) - 1 };
  return null;
}

/** 입력창에서 친 키는 단축키로 쓰지 않는다 */
export const typingIn = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
