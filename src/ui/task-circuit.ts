import { electricSim, logicSim } from "../editor/adapter";
import { sanitizeCircuit } from "../editor/sanitize";
import { mountEditor } from "../editor/view";
import { gradeElectric, type CheckResult } from "../grader/electric";
import { gradeLogic } from "../grader/logic";
import type { Lesson } from "../lessons/types";
import { markTaskDone, recordCost, saveChip, saveWork } from "../progress";
import { renderRich } from "../rich";
import { CHIP_LABEL, makeLib } from "../sim/digital/chips";
import { SWITCH_KINDS } from "../sim/electric/parts";
import type { ChipRef, Circuit } from "../sim/electric/types";
import type { Ctx } from "./app";
import { h } from "./dom";

const HINT_AFTER = 3;
const ANSWER_AFTER = 5;

/** 전기·논리 과제 공통 화면: 편집기 + 테스트 결과 + 힌트/모범 답안 */
export function renderCircuitTask(ctx: Ctx, lesson: Lesson, ti: number, onPassed: () => void): HTMLElement {
  const task = lesson.tasks[ti];
  const key = `${lesson.id}#${ti}`;
  const rich = (s: string) => renderRich(s, ctx.showTerm);
  const already = ctx.store.data.progress[lesson.id]?.tasksDone.includes(ti) ?? false;
  const lib = () => makeLib(ctx.store.data.chips); // 부품함은 과제를 통과할 때마다 바뀔 수 있다
  let fails = 0; // 화면 상태로만 센다(저장하지 않음)

  const results = h("div", { class: "test-results", "aria-live": "polite" });
  const help = h("div", { class: "task-help" });

  /** 부품함 최신 버전, 없으면 기본 부품 */
  const chipRef = (name: string): ChipRef | null => {
    const versions = ctx.store.data.chips[name] ?? [];
    const found = lib()({ name, v: versions.length ? versions.length - 1 : null, inputs: [], outputs: [] });
    if (!found) return null;
    return { name, v: found.fallback ? null : versions.length - 1, inputs: [...found.def.inputs], outputs: [...found.def.outputs] };
  };

  function grade(c: Circuit): { rs: CheckResult[]; notes: string[] } {
    if (task.kind === "electric") {
      return { rs: gradeElectric(c, task.checks, task.palette.filter((p) => SWITCH_KINDS.includes(p.kind)).map((p) => p.id)), notes: [] };
    }
    const g = gradeLogic(c, task, lib());
    const notes = [`🔩 부품 원가: NAND ${g.cost}개`];
    if (g.star) notes.push(`⭐ 원가 목표 달성 (${task.maxCost}개 이하)`);
    else if (task.maxCost !== undefined && !task.costRequired) notes.push(`목표: NAND ${task.maxCost}개 이하면 ⭐`);
    if (g.results.every((r) => r.ok)) {
      ctx.store.data = recordCost(ctx.store.data, lesson.id, g.cost);
      if (task.saveAs) {
        const { data, version } = saveChip(ctx.store.data, task.saveAs, { inputs: task.inputs, outputs: task.outputs, circuit: c });
        ctx.store.data = data;
        notes.push(`🧩 부품함에 ‘${CHIP_LABEL[task.saveAs]}’ 부품을 저장했어요 (버전 ${version + 1})`);
      }
    }
    return { rs: g.results, notes };
  }

  const editor = mountEditor({
    task,
    saved: sanitizeCircuit(ctx.store.data.work[key], task, lib()),
    sim: task.kind === "electric" ? electricSim : logicSim(lib()),
    chipRef,
    onChange(c) {
      ctx.store.data = saveWork(ctx.store.data, key, c);
      ctx.store.save();
    },
    onTest(c) {
      const { rs, notes } = grade(c);
      showResults(rs, notes);
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

  const table = (head: string[], rows: { cells: string[]; ok: boolean }[]) =>
    h(
      "table",
      { class: "truth" },
      h("thead", {}, h("tr", {}, ...head.map((x) => h("th", {}, x)))),
      h("tbody", {}, ...rows.map((r) => h("tr", { class: r.ok ? "" : "wrong" }, ...r.cells.map((x) => h("td", {}, x))))),
    );

  function showResults(rs: CheckResult[], notes: string[]) {
    const pass = rs.every((r) => r.ok);
    const onOff = (v: number) => (v ? "켜짐" : "꺼짐");
    results.replaceChildren(
      h("p", { class: pass ? "pass" : "fail" }, pass ? "✅ 의뢰 조건을 모두 만족했어요!" : "❌ 아직 조건을 만족하지 못했어요."),
      ...rs.map((r) => {
        const item = h("div", { class: "check " + (r.ok ? "ok" : "bad") }, h("span", {}, (r.ok ? "✅ " : "❌ ") + r.message));
        if (r.rows) {
          const n = r.rows[0]?.inputs.length ?? 0;
          item.append(
            table(
              [n > 1 ? "입력" : "누름", "기대", "결과"],
              r.rows.map((row) => ({ cells: [row.inputs.join(" "), onOff(row.expect), onOff(row.got)], ok: row.expect === row.got })),
            ),
          );
        }
        if (r.lrows && task.kind === "logic") {
          const name = (id: string) => task.labels?.[id] ?? id.toUpperCase();
          item.append(
            table(
              [task.inputs.map(name).join(" "), "기대", "결과"],
              r.lrows.map((row) => ({
                cells: [row.inputs.join(" "), row.expect.join(" "), row.got.join(" ")],
                ok: row.got.every((g, i) => g === row.expect[i]),
              })),
            ),
          );
        }
        return item;
      }),
      ...notes.map((n) => h("p", { class: "note" }, n)),
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
