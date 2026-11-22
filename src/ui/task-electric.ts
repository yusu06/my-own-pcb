import { electricSim } from "../editor/adapter";
import { gradeElectric } from "../grader/electric";
import { SWITCH_KINDS } from "../sim/electric/parts";
import { sanitizeCircuit } from "../editor/sanitize";
import { mountEditor } from "../editor/view";
import type { CheckResult } from "../grader/electric";
import type { ElectricTask, Lesson } from "../lessons/types";
import { markTaskDone, saveWork } from "../progress";
import { renderRich } from "../rich";
import type { Ctx } from "./app";
import { h } from "./dom";

const HINT_AFTER = 3;
const ANSWER_AFTER = 5;

export function renderElectricTask(ctx: Ctx, lesson: Lesson, ti: number, onPassed: () => void): HTMLElement {
  const task = lesson.tasks[ti] as ElectricTask; // Task 7에서 논리 과제까지 일반화
  const key = `${lesson.id}#${ti}`;
  const rich = (s: string) => renderRich(s, ctx.showTerm);
  const already = ctx.store.data.progress[lesson.id]?.tasksDone.includes(ti) ?? false;
  let fails = 0; // 화면 상태로만 센다(저장하지 않음)

  const results = h("div", { class: "test-results", "aria-live": "polite" });
  const help = h("div", { class: "task-help" });

  const editor = mountEditor({
    task,
    saved: sanitizeCircuit(ctx.store.data.work[key], task),
    onChange(c) {
      ctx.store.data = saveWork(ctx.store.data, key, c);
      ctx.store.save();
    },
    sim: electricSim,
    onTest(c) {
      const rs = gradeElectric(c, task.checks, task.palette.filter((p) => SWITCH_KINDS.includes(p.kind)).map((p) => p.id));
      showResults(rs);
      if (rs.every((r) => r.ok)) {
        ctx.store.data = markTaskDone(lesson.id, ctx.store.data, ti, Date.now());
        ctx.store.save();
        onPassed();
      } else {
        fails++;
        drawHelp();
      }
    },
  });

  function showResults(rs: CheckResult[]) {
    const pass = rs.every((r) => r.ok);
    results.replaceChildren(
      h("p", { class: pass ? "pass" : "fail" }, pass ? "✅ 의뢰 조건을 모두 만족했어요!" : "❌ 아직 조건을 만족하지 못했어요."),
      ...rs.map((r) => {
        const item = h("div", { class: "check " + (r.ok ? "ok" : "bad") }, h("span", {}, (r.ok ? "✅ " : "❌ ") + r.message));
        if (r.rows) {
          const n = r.rows[0]?.inputs.length ?? 0;
          item.append(
            h(
              "table",
              { class: "truth" },
              h("thead", {}, h("tr", {}, h("th", {}, n > 1 ? "입력" : "누름"), h("th", {}, "기대"), h("th", {}, "결과"))),
              h(
                "tbody",
                {},
                ...r.rows.map((row) =>
                  h(
                    "tr",
                    { class: row.expect === row.got ? "" : "wrong" },
                    h("td", {}, row.inputs.join(" ")),
                    h("td", {}, row.expect ? "켜짐" : "꺼짐"),
                    h("td", {}, row.got ? "켜짐" : "꺼짐"),
                  ),
                ),
              ),
            ),
          );
        }
        return item;
      }),
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
                if (confirm("지금 만든 회로 대신 모범 답안을 불러올까요? (↶로 되돌릴 수 있어요)")) editor.load(task.reference);
              },
            },
            "📘 모범 답안 불러오기",
          ),
    ];
    help.replaceChildren(...items.filter((x): x is HTMLElement => x !== false));
  }

  return h(
    "section",
    { class: "task" },
    h("div", { class: "kicker" }, "🛠 실습"),
    h("h2", {}, task.title),
    h("p", {}, rich(task.goal)),
    already ? h("p", { class: "muted" }, "✅ 이미 통과한 과제예요. 다시 해 봐도 좋아요.") : null,
    editor.el,
    results,
    help,
  );
}
