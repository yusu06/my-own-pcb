import { gradeVerilog, type VerilogGrade } from "../grader/verilog";
import type { Lesson, VerilogPort, VerilogTask } from "../lessons/types";
import { markTaskDone, saveWork } from "../progress";
import { renderRich } from "../rich";
import type { Ctx } from "./app";
import { mountCodeEditor } from "./code-editor";
import { h } from "./dom";
import { renderTimeline } from "./timeline";

const HINT_AFTER = 3;
const ANSWER_AFTER = 5;
const MAX_SAVED = 20_000;

const fmt = (v: number | undefined, p: VerilogPort) =>
  v === undefined ? "?" : p.width === 1 ? String(v) : `${v} (${v.toString(2).padStart(p.width, "0")})`;

/** Verilog 과제 화면: 코드 편집기 + 테스트 결과표 + 힌트/모범 답안 */
export function renderVerilogTask(ctx: Ctx, lesson: Lesson, ti: number, onPassed: () => void): HTMLElement {
  const task = lesson.tasks[ti] as VerilogTask;
  const key = `${lesson.id}#${ti}`;
  const rich = (s: string) => renderRich(s, ctx.showTerm);
  const already = ctx.store.data.progress[lesson.id]?.tasksDone.includes(ti) ?? false;
  const saved = ctx.store.data.work[key];
  let fails = 0;
  let timer: number | undefined;

  const results = h("div", { class: "test-results", "aria-live": "polite" });
  const help = h("div", { class: "task-help" });

  const editor = mountCodeEditor({
    value: typeof saved === "string" && saved.length <= MAX_SAVED ? saved : task.skeleton,
    onChange(v) {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (v.length > MAX_SAVED) return;
        ctx.store.data = saveWork(ctx.store.data, key, v);
        ctx.store.save();
      }, 500);
    },
    onRun: test,
  });

  function test() {
    const g = gradeVerilog(editor.value(), task);
    show(g);
    editor.markLine(g.error ? g.error.line : null);
    if (g.passed) {
      ctx.store.data = markTaskDone(lesson.id, ctx.store.data, ti, Date.now());
      ctx.store.save();
      onPassed();
    } else {
      fails++;
      drawHelp();
    }
  }

  function show(g: VerilogGrade) {
    if (g.error) {
      results.replaceChildren(
        h("p", { class: "fail" }, "❌ 코드를 실행할 수 없어요."),
        h("div", { class: "check bad" }, h("span", {}, g.error.message)),
      );
      return;
    }
    if (g.timeline) {
      const n = g.timeline[0]?.values.length ?? 0;
      const first = Array.from({ length: n }, (_, k) => k).find((k) => g.timeline!.some((r) => r.bad?.[k])) ?? 0;
      results.replaceChildren(
        h("p", { class: g.passed ? "pass" : "fail" }, g.passed ? `✅ ${g.total}단계 모두 맞혔어요!` : "❌ 조건과 다르게 동작하는 단계가 있어요."),
        h(
          "div",
          { class: "check " + (g.passed ? "ok" : "bad") },
          h("span", {}, g.passed ? "단계별 신호를 보여 줄게요." : `${first + 1}번째 단계부터 달라요. 빨간 칸은 ‘받은 값→기대 값’이에요.`),
          renderTimeline(g.timeline),
        ),
      );
      return;
    }
    const name = (p: VerilogPort) => task.labels?.[p.name] ?? p.name;
    const wrong = g.rows.filter((r) => !r.ok).length;
    results.replaceChildren(
      h(
        "p",
        { class: g.passed ? "pass" : "fail" },
        g.passed ? `✅ 입력 ${g.total}가지를 모두 맞혔어요!` : `❌ 입력 ${g.total}가지 중 틀린 경우가 있어요.`,
      ),
      h(
        "div",
        { class: "check " + (g.passed ? "ok" : "bad") },
        h("span", {}, g.passed ? "몇 가지만 보여 줄게요." : `틀린 줄${wrong >= 16 ? "(앞 16줄)" : ""}을 빨갛게 표시했어요.`),
        h(
          "div",
          { class: "truth-wrap" },
          h(
            "table",
            { class: "truth" },
            h("thead", {}, h("tr", {}, ...task.inputs.map((p) => h("th", {}, name(p))), ...task.outputs.map((p) => h("th", {}, `${name(p)} 기대 / 결과`)))),
            h(
              "tbody",
              {},
              ...g.rows.map((r) =>
                h(
                  "tr",
                  { class: r.ok ? "" : "wrong" },
                  ...task.inputs.map((p) => h("td", {}, fmt(r.inputs[p.name], p))),
                  ...task.outputs.map((p) => h("td", {}, `${fmt(r.expect[p.name], p)} / ${fmt(r.got[p.name], p)}`)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  function drawHelp() {
    const items: (HTMLElement | false)[] = [
      fails >= HINT_AFTER && h("details", { class: "hint" }, h("summary", {}, "💡 힌트 보기"), h("p", {}, rich(task.hint))),
      fails >= ANSWER_AFTER &&
        h(
          "button",
          {
            type: "button",
            class: "btn ghost",
            onclick: () => {
              if (confirm("지금 쓴 코드 대신 모범 답안을 불러올까요? (지금 코드는 사라져요)")) editor.setValue(task.reference);
            },
          },
          "📘 모범 답안 불러오기",
        ),
    ];
    help.replaceChildren(...items.filter((x): x is HTMLElement => x !== false));
  }

  return h(
    "section",
    { class: "task verilog" },
    h(
      "div",
      { class: "task-head" },
      h("div", { class: "kicker" }, "⌨ Verilog 실습"),
      h("h2", {}, task.title),
      h("p", {}, rich(task.goal)),
      already ? h("p", { class: "muted" }, "✅ 이미 통과한 과제예요. 다시 해 봐도 좋아요.") : null,
    ),
    h(
      "div",
      { class: "editor" },
      editor.el,
      h(
        "div",
        { class: "ed-tools" },
        h(
          "button",
          { type: "button", class: "btn", "aria-label": "처음 뼈대로", title: "처음 뼈대로", onclick: () => confirm("처음 뼈대 코드로 되돌릴까요? (지금 코드는 사라져요)") && editor.setValue(task.skeleton) },
          "↺",
        ),
        h("button", { type: "button", class: "btn primary", onclick: test }, "🧪 테스트 실행"),
      ),
    ),
    h("div", { class: "task-side" }, results, help),
  );
}
