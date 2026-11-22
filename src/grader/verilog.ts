import type { VerilogCombTask, VerilogTask } from "../lessons/types";
import { compile, VerilogError } from "../sim/verilog";
import type { TimeRow } from "./electric";

export interface VRow {
  inputs: Record<string, number>;
  expect: Record<string, number>;
  got: Record<string, number>;
  ok: boolean;
}
export interface VerilogGrade {
  error: VerilogError | null;
  /** 틀린 줄 먼저, 최대 MAX_ROWS줄 */
  rows: VRow[];
  total: number;
  passed: boolean;
  /** 순차 과제 타임라인(이때 rows는 비어 있다) */
  timeline?: TimeRow[];
}

const MAX_ROWS = 16;
export const MAX_INPUT_BITS = 10;

/** 입력 비트를 모두 이은 수 n을 입력별 값으로 나눈다(첫 입력이 최상위) */
export function verilogCombos(task: VerilogCombTask): Record<string, number>[] {
  const bits = task.inputs.reduce((n, p) => n + p.width, 0);
  if (bits > MAX_INPUT_BITS) throw new Error(`${task.title}: 입력 비트가 ${bits}개라 너무 많다`);
  return Array.from({ length: 2 ** bits }, (_, n) => {
    const row: Record<string, number> = {};
    for (let k = task.inputs.length - 1; k >= 0; k--) {
      const M = 2 ** task.inputs[k].width;
      row[task.inputs[k].name] = n % M;
      n = Math.floor(n / M);
    }
    return row;
  });
}

export function gradeVerilog(src: string, task: VerilogTask): VerilogGrade {
  const bad = (error: VerilogError): VerilogGrade => ({ error, rows: [], total: 0, passed: false });
  try {
    const d = compile(src, task.top);
    const want = [...task.inputs.map((p) => ({ ...p, dir: "입력" })), ...task.outputs.map((p) => ({ ...p, dir: "출력" }))];
    const have = [...d.inputs.map((p) => ({ ...p, dir: "입력" })), ...d.outputs.map((p) => ({ ...p, dir: "출력" }))];
    for (const w of want) {
      const h = have.find((p) => p.name === w.name);
      if (!h || h.dir !== w.dir) return bad(new VerilogError(1, `${w.dir} 포트 ‘${w.name}’이(가) 없어요. 뼈대 코드의 포트 이름을 바꾸지 마세요.`));
      if (h.width !== w.width) return bad(new VerilogError(1, `포트 ‘${w.name}’은(는) ${w.width}비트여야 해요(지금 ${h.width}비트).`));
    }
    const extra = have.find((h) => !want.some((w) => w.name === h.name));
    if (extra) return bad(new VerilogError(1, `포트 ‘${extra.name}’은(는) 이 과제에 없어요. 뼈대 코드의 포트 목록을 그대로 써 주세요.`));

    if (task.seq) {
      const { steps, from = 0 } = task.seq;
      const s = d.sim();
      const m = task.seq.model();
      const got = steps.map((i) => s.step(i));
      const want = steps.map((i) => m(i));
      const label = (n: string) => task.labels?.[n] ?? n;
      const timeline: TimeRow[] = [
        ...task.inputs.map((p) => ({ name: p.name, label: label(p.name), values: steps.map((i) => i[p.name] ?? 0) })),
        ...task.outputs.map((p) => {
          const values = got.map((o) => o[p.name]);
          const expect = want.map((o) => o[p.name]);
          return { name: p.name, label: label(p.name), values, expect, bad: values.map((v, k) => k >= from && v !== expect[k]) };
        }),
      ];
      const passed = timeline.every((r) => !r.bad?.some(Boolean));
      return { error: null, rows: [], total: steps.length - from, passed, timeline };
    }

    const spec = task.spec;
    const all = verilogCombos(task).map((inputs) => {
      const expect = spec(inputs);
      const got = d.run(inputs);
      return { inputs, expect, got, ok: task.outputs.every((o) => got[o.name] === expect[o.name]) };
    });
    const rows = [...all.filter((r) => !r.ok), ...all.filter((r) => r.ok)].slice(0, MAX_ROWS);
    return { error: null, rows, total: all.length, passed: all.every((r) => r.ok) };
  } catch (e) {
    if (e instanceof VerilogError) return bad(e);
    // 괄호·begin을 수천 겹 쌓으면 해석기 재귀가 스택을 넘는다 — 버튼이 먹통이 되지 않게 오류로 보여 준다
    if (e instanceof RangeError) return bad(new VerilogError(1, "식이나 begin을 너무 깊게 겹쳐 썼어요. 중간 결과를 wire로 나눠 써 주세요."));
    throw e;
  }
}
