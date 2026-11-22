import { expect, test } from "vitest";
import { editorKey, lessonKey } from "./keys";

const k = (key: string, mod: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mod,
});

test("편집기 단축키", () => {
  expect(editorKey(k("z", { ctrlKey: true }))).toBe("undo");
  expect(editorKey(k("Z", { metaKey: true }))).toBe("undo");
  expect(editorKey(k("y", { ctrlKey: true }))).toBe("redo");
  expect(editorKey(k("Z", { ctrlKey: true, shiftKey: true }))).toBe("redo");
  expect(editorKey(k("Delete"))).toBe("deleteWire");
  expect(editorKey(k("Backspace"))).toBe("deleteWire");
  expect(editorKey(k("Escape"))).toBe("cancel");
  expect(editorKey(k("Enter", { ctrlKey: true }))).toBe("test");
  expect(editorKey(k("z"))).toBeNull();
  expect(editorKey(k("Enter"))).toBeNull();
});

test("단원 넘기기와 퀴즈 번호", () => {
  expect(lessonKey(k("ArrowRight"))).toEqual({ t: "next" });
  expect(lessonKey(k("ArrowLeft"))).toEqual({ t: "prev" });
  expect(lessonKey(k("2"))).toEqual({ t: "choice", i: 1 });
  expect(lessonKey(k("0"))).toBeNull();
  expect(lessonKey(k("ArrowRight", { ctrlKey: true }))).toBeNull();
});
