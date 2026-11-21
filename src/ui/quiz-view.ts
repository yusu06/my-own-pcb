import type { Lesson, QuizItem } from "../lessons/types";
import { gradeQuiz } from "../quiz/grade";
import { markQuizCorrect } from "../progress";
import { renderRich } from "../rich";
import type { Ctx } from "./app";
import { h } from "./dom";

/** 문제마다 맞히면 저장하고 onChange를 부른다. 오답은 해설을 보고 다시 풀 수 있다. */
export function renderQuiz(ctx: Ctx, lesson: Lesson, onChange: () => void): HTMLElement {
  const rich = (s: string) => renderRich(s, ctx.showTerm);
  const solved = () => new Set(ctx.store.data.progress[lesson.id]?.quizCorrect ?? []);

  const items = lesson.quiz.map((item, qi) => {
    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    const show = (ok: boolean | null, msg?: string) => {
      feedback.replaceChildren();
      feedback.className = "feedback" + (ok === true ? " ok" : ok === false ? " bad" : "");
      if (msg) feedback.append(h("strong", {}, msg));
      if (ok !== null) feedback.append(h("p", {}, rich(item.explain)));
    };
    const submit = (input: string | number) => {
      const r = gradeQuiz(item, input);
      if (r === "empty") return show(null, "숫자를 입력하세요.");
      show(r === "correct", r === "correct" ? "✅ 정답!" : "❌ 다시 생각해 보세요");
      if (r === "correct") {
        ctx.store.data = markQuizCorrect(lesson.id, ctx.store.data, qi, Date.now());
        ctx.store.save();
        onChange();
      }
      return r;
    };
    const card = h("div", { class: "card quiz-item" }, h("p", { class: "q" }, `Q${qi + 1}. `, rich(item.q)));
    card.append(item.kind === "choice" ? choiceInput(item, submit) : numberInput(item, submit), feedback);
    if (solved().has(qi)) show(true, "✅ 이미 맞힌 문제");
    return card;
  });
  return h("div", { class: "quiz" }, ...items);
}

function choiceInput(item: Extract<QuizItem, { kind: "choice" }>, submit: (i: number) => unknown): HTMLElement {
  const list = h("div", { class: "choices" });
  item.choices.forEach((c, i) => {
    const b = h("button", { class: "choice", type: "button" }, c);
    b.addEventListener("click", () => {
      const r = submit(i);
      list.querySelectorAll(".choice").forEach((x) => x.classList.remove("picked-ok", "picked-bad"));
      b.classList.add(r === "correct" ? "picked-ok" : "picked-bad");
    });
    list.append(b);
  });
  return list;
}

function numberInput(item: Extract<QuizItem, { kind: "number" }>, submit: (s: string) => unknown): HTMLElement {
  const input = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "답" });
  const form = h(
    "form",
    { class: "num-answer" },
    input,
    h("span", { class: "unit" }, item.unit),
    h("button", { class: "btn primary", type: "submit" }, "확인"),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit(input.value);
  });
  return form;
}
