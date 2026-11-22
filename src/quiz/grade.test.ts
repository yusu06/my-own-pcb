import { expect, test } from "vitest";
import { gradeQuiz, parseNumberInput } from "./grade";
import type { QuizItem } from "../lessons/types";

const n: QuizItem = { kind: "number", q: "", answer: 150, tolerance: 0.05, unit: "Ω", explain: "" };
const c: QuizItem = { kind: "choice", q: "", choices: ["a", "b"], answer: 1, explain: "" };

test("숫자 정답: 공백·단위·전각 숫자를 허용한다", () => {
  expect(gradeQuiz(n, "150")).toBe("correct");
  expect(gradeQuiz(n, " 150 ")).toBe("correct");
  expect(gradeQuiz(n, "150Ω")).toBe("correct");
  expect(gradeQuiz(n, "150 ohm")).toBe("correct");
  expect(gradeQuiz(n, "１５０")).toBe("correct");
});

test("숫자 정답: 허용 오차", () => {
  expect(gradeQuiz(n, "156")).toBe("correct");
  expect(gradeQuiz(n, "160")).toBe("wrong");
  expect(gradeQuiz(n, "140")).toBe("wrong");
});

test("숫자가 없으면 empty", () => {
  expect(gradeQuiz(n, "")).toBe("empty");
  expect(gradeQuiz(n, "abc")).toBe("empty");
  expect(gradeQuiz(n, "   ")).toBe("empty");
});

test("정답이 0이면 절대 오차로 본다", () => {
  const z: QuizItem = { ...n, answer: 0, tolerance: 0.01 } as QuizItem;
  expect(gradeQuiz(z, "0")).toBe("correct");
  expect(gradeQuiz(z, "0.5")).toBe("wrong");
});

test("parseNumberInput", () => {
  expect(parseNumberInput("0,15")).toBe(0.15);
  expect(parseNumberInput("-2.5V")).toBe(-2.5);
  expect(parseNumberInput("+3")).toBe(3);
  expect(parseNumberInput("V5")).toBeNull();
});

test("객관식", () => {
  expect(gradeQuiz(c, 1)).toBe("correct");
  expect(gradeQuiz(c, 0)).toBe("wrong");
});

test("parseNumberInput: 천 단위 쉼표, .5, 유니코드 마이너스", () => {
  expect(parseNumberInput("1,000")).toBe(1000);
  expect(parseNumberInput("10,000Ω")).toBe(10000);
  expect(parseNumberInput("1,5")).toBe(1.5);
  expect(parseNumberInput(".5")).toBe(0.5);
  expect(parseNumberInput("−2")).toBe(-2);
  expect(parseNumberInput(".")).toBeNull();
});
