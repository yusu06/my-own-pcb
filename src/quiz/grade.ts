import type { QuizItem } from "../lessons/types";

export type GradeResult = "correct" | "wrong" | "empty";

/**
 * 앞쪽 숫자만 읽는다 ("150Ω" → 150, "0,15" → 0.15, "1,000" → 1000, ".5" → 0.5, "−2" → −2).
 * 단위 접두어(k, m)는 해석하지 않는다.
 */
export function parseNumberInput(s: string): number | null {
  const t = s.normalize("NFKC").trim().replace(/^−/, "-");
  const thousands = t.match(/^[-+]?\d{1,3}(?:,\d{3})+(?![\d,.])/);
  if (thousands) return Number(thousands[0].replace(/,/g, ""));
  const m = t.match(/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

export function gradeQuiz(item: QuizItem, input: string | number): GradeResult {
  if (item.kind === "choice") return input === item.answer ? "correct" : "wrong";
  const x = typeof input === "number" ? input : parseNumberInput(input);
  if (x === null || Number.isNaN(x)) return "empty";
  const limit = item.answer === 0 ? item.tolerance : Math.abs(item.answer) * item.tolerance;
  return Math.abs(x - item.answer) <= limit ? "correct" : "wrong";
}
