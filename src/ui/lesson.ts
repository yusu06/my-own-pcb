import { LESSONS, findLesson } from "../lessons";
import type { Card, Lesson } from "../lessons/types";
import { completeIfReady, lessonSteps, nextLessonId, openLesson, resumeStep, setStep } from "../progress";
import { renderRich } from "../rich";
import type { Ctx } from "./app";
import { h } from "./dom";
import { warningBar } from "./home";
import { renderQuiz } from "./quiz-view";
import { gateFigure } from "./figures";
import { renderElectricTask } from "./task-electric";

export function renderLesson(root: HTMLElement, ctx: Ctx, lesson: Lesson): void {
  const rich = (s: string) => renderRich(s, ctx.showTerm);
  ctx.store.data = openLesson(lesson.id, ctx.store.data, LESSONS, Date.now());
  ctx.store.save();
  const steps = lessonSteps(lesson);
  let idx = resumeStep(lesson.id, ctx.store.data, lesson);

  const goTo = (i: number) => {
    idx = Math.min(Math.max(i, 0), steps.length - 1);
    ctx.store.data = setStep(lesson.id, ctx.store.data, idx, Date.now());
    ctx.store.save();
    draw();
    window.scrollTo(0, 0);
  };

  const card = (c: Card, kicker: string) =>
    h(
      "article",
      { class: "card" },
      h("div", { class: "kicker" }, kicker),
      h("h2", {}, c.title),
      h("p", {}, rich(c.body)),
      c.figure ? h("div", { class: "figure" }, gateFigure(c.figure)) : null,
    );
  const taskDone = (i: number) => ctx.store.data.progress[lesson.id]?.tasksDone.includes(i) ?? false;

  function body(): HTMLElement {
    const s = steps[idx];
    switch (s.kind) {
      case "client":
        return h(
          "article",
          { class: "card order" },
          h("div", { class: "kicker" }, "📨 의뢰서"),
          h("p", { class: "muted" }, `보낸 곳: ${lesson.client.from}`),
          h("p", { class: "order-request" }, rich(lesson.client.request)),
          h("h3", {}, "요구사항"),
          h("ul", {}, ...lesson.client.requirements.map((r) => h("li", {}, rich(r)))),
        );
      case "concept":
        return card(lesson.concepts[s.i], `📖 개념 ${s.i + 1}/${lesson.concepts.length}`);
      case "realWorld":
        return card(lesson.realWorld[s.i], "🔍 실제 기기에서는");
      case "task":
        return renderElectricTask(ctx, lesson, s.i, draw);
      case "quiz":
        return h("section", {}, h("div", { class: "kicker" }, "📝 마무리 퀴즈"), renderQuiz(ctx, lesson, draw));
      case "done": {
        const next = nextLessonId(ctx.store.data, LESSONS);
        const nextL = next && next !== lesson.id ? findLesson(next) : undefined;
        return h(
          "article",
          { class: "card done" },
          h("div", { class: "big" }, "🎉"),
          h("h2", {}, `${lesson.title} 의뢰 완료!`),
          nextL
            ? h("button", { class: "btn primary wide", type: "button", onclick: () => ctx.go(`#/lesson/${nextL.id}`) }, `다음: ${nextL.emoji} ${nextL.title}`)
            : h("p", { class: "muted" }, "다음 단원은 업데이트로 추가돼요."),
        );
      }
    }
  }

  function footer(): HTMLElement {
    const s = steps[idx];
    const prev = h("button", { class: "btn", type: "button", onclick: () => goTo(idx - 1) }, "← 이전");
    if (idx === 0) prev.setAttribute("disabled", "");
    let next: HTMLElement;
    if (s.kind === "done") next = h("a", { class: "btn primary", href: "#/" }, "홈으로");
    else if (s.kind === "quiz") {
      const done = completeIfReady(lesson.id, ctx.store.data, lesson, Date.now()).progress[lesson.id].status === "done";
      next = h(
        "button",
        {
          class: "btn primary",
          type: "button",
          onclick: () => {
            ctx.store.data = completeIfReady(lesson.id, ctx.store.data, lesson, Date.now());
            goTo(idx + 1);
          },
        },
        done ? "완료 ✔" : "모두 맞히면 완료",
      );
      if (!done) next.setAttribute("disabled", "");
    } else if (s.kind === "task") {
      const ok = taskDone(s.i);
      next = h("button", { class: "btn primary", type: "button", onclick: () => goTo(idx + 1) }, ok ? "다음 →" : "테스트를 통과하면 다음");
      if (!ok) next.setAttribute("disabled", "");
    } else next = h("button", { class: "btn primary", type: "button", onclick: () => goTo(idx + 1) }, s.kind === "client" ? "수락하기 →" : "다음 →");
    // 편집기 화면에서는 하단 버튼이 캔버스를 가리지 않게 일반 흐름으로 둔다
    return h("nav", { class: "step-nav" + (s.kind === "task" ? " inline" : "") }, prev, next);
  }

  let kept: { el: HTMLElement; step: number } | null = null;
  function draw() {
    // 퀴즈·실습 화면에서는 본문 상태(피드백, 편집 중인 회로)를 유지하고 하단 버튼만 갱신한다
    const keep = steps[idx].kind === "quiz" || steps[idx].kind === "task";
    if (keep && kept?.step === idx && root.contains(kept.el)) {
      root.querySelector(".step-nav")!.replaceWith(footer());
      return;
    }
    const b = body();
    kept = keep ? { el: b, step: idx } : null;
    root.replaceChildren(
      ...[
        warningBar(ctx),
        h(
          "header",
          { class: "lesson-top" },
          h("a", { href: "#/", class: "back", "aria-label": "홈으로" }, "←"),
          h("strong", {}, `${lesson.emoji} ${lesson.id} ${lesson.title}`),
          h("span", { class: "muted" }, `${idx + 1} / ${steps.length}`),
        ),
        h("div", { class: "dots", "aria-hidden": "true" }, ...steps.map((_, i) => h("span", { class: i <= idx ? "on" : "" }))),
        b,
        footer(),
      ].filter((x): x is HTMLElement => x !== null),
    );
  }
  draw();
}
