import { CHAPTERS, LESSONS, findLesson } from "../lessons";
import { lessonState, nextLessonId, openLesson, type LessonState } from "../progress";
import type { Ctx } from "./app";
import { h } from "./dom";

const BADGE: Record<LessonState, string> = {
  locked: "🔒 잠김",
  available: "시작 전",
  started: "진행 중",
  done: "✅ 완료",
  skipped: "↷ 건너뜀",
};

export function warningBar(ctx: Ctx): HTMLElement | null {
  return ctx.store.warning ? h("div", { class: "warn", role: "status" }, "⚠ " + ctx.store.warning) : null;
}

export function renderHome(root: HTMLElement, ctx: Ctx): void {
  const d = ctx.store.data;
  const open = (id: string) => {
    if (lessonState(id, d, LESSONS) === "locked" && !confirm("앞 단원을 건너뛰고 열까요?")) return;
    ctx.go(`#/lesson/${id}`);
  };

  const next = nextLessonId(d, LESSONS);
  const nextL = next ? findLesson(next) : undefined;
  const hero = nextL
    ? h(
        "button",
        { class: "hero", type: "button", onclick: () => open(nextL.id) },
        h("span", { class: "hero-label" }, d.progress[nextL.id] ? "이어서 하기" : "다음 단원"),
        h("span", { class: "hero-title" }, `${nextL.emoji} ${nextL.id} ${nextL.title}`),
        h("span", { class: "muted" }, `약 ${nextL.minutes}분`),
      )
    : h("div", { class: "hero" }, h("span", { class: "hero-title" }, "🎉 지금 있는 단원을 모두 마쳤어요"), h("span", { class: "muted" }, "새 단원은 업데이트로 추가돼요."));

  const chapters = CHAPTERS.map((c) => {
    const ls = LESSONS.filter((l) => l.chapter === c.n);
    return h(
      "section",
      { class: "chapter" },
      h("h2", {}, `${c.n}장. ${c.title}`),
      ls.length === 0
        ? h("p", { class: "muted" }, "준비 중")
        : h(
            "ul",
            { class: "lesson-list" },
            ...ls.map((l) => {
              const st = lessonState(l.id, d, LESSONS);
              return h(
                "li",
                {},
                h(
                  "button",
                  { class: `lesson-row st-${st}`, type: "button", onclick: () => open(l.id) },
                  h("span", { class: "emoji", "aria-hidden": "true" }, l.emoji),
                  h("span", { class: "row-main" }, h("strong", {}, `${l.id} ${l.title}`), h("span", { class: "muted" }, `약 ${l.minutes}분`)),
                  h("span", { class: "badge" }, BADGE[st]),
                ),
              );
            }),
          ),
    );
  });

  root.append(
    ...[
      warningBar(ctx),
      h("header", { class: "top" }, h("h1", {}, "내 하드웨어 공방")),
      hero,
      ...chapters,
      h(
        "nav",
        { class: "bottom-links" },
        h("a", { href: "#/glossary", class: "btn ghost" }, "📖 용어집"),
        h("a", { href: "#/settings", class: "btn ghost" }, "⚙ 설정"),
      ),
    ].filter((x): x is HTMLElement => x !== null),
  );
}
