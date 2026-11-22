import { expect, test } from "vitest";
import { insertAt, symbolText } from "./code-editor";

test("커서 위치에 넣고 커서는 넣은 글 뒤로", () => {
  expect(insertAt("ab", 1, 1, ";")).toEqual({ text: "a;b", caret: 2 });
  expect(insertAt("", 0, 0, "&")).toEqual({ text: "&", caret: 1 });
});

test("선택 영역은 바꿔 넣는다", () => {
  expect(insertAt("a + b", 2, 3, "&")).toEqual({ text: "a & b", caret: 3 });
});

test("범위를 벗어난 커서는 끝에 맞춘다", () => {
  expect(insertAt("ab", 9, 9, ";")).toEqual({ text: "ab;", caret: 3 });
});

test("begin/end 버튼은 앞뒤에 공백을 붙인다", () => {
  expect(symbolText("begin")).toBe(" begin ");
  expect(symbolText("end")).toBe(" end ");
  expect(symbolText(";")).toBe(";");
  expect(symbolText("<=")).toBe(" <= ");
});
