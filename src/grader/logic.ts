import type { LogicTask } from "../lessons/types";
import { CHIP_LABEL, makeLib } from "../sim/digital/chips";
import { nandCost, simulate, type Bit, type ChipLib, type DigitalResult } from "../sim/digital/sim";
import type { Circuit } from "../sim/electric/types";
import type { CheckResult, LogicRow, TimeRow } from "./electric";

export interface LogicGrade {
  results: CheckResult[];
  cost: number;
  /** 원가 목표 달성 */
  star: boolean;
}

/** 입력 조합 순서(첫 입력이 최상위 비트) */
export function inputCombos(inputs: string[]): Record<string, 0 | 1>[] {
  return Array.from({ length: 1 << inputs.length }, (_, n) =>
    Object.fromEntries(inputs.map((id, i) => [id, ((n >> (inputs.length - 1 - i)) & 1) as 0 | 1])),
  );
}

/** 순차 과제: 각본을 차례로 넣으며 직전 넷 값을 이어 간다 */
function runSteps(c: Circuit, steps: Record<string, 0 | 1>[], lib: ChipLib): DigitalResult[] {
  let prev: Record<string, Bit> | undefined;
  return steps.map((s) => {
    const r = simulate(c, s, lib, prev);
    prev = r.net;
    return r;
  });
}

function seqTruth(sims: DigitalResult[], t: LogicTask): CheckResult {
  const seq = t.seq!;
  const m = seq.model();
  const want = seq.steps.map((s) => m(s));
  const from = seq.from ?? 0;
  const name = (id: string) => t.labels?.[id] ?? id.toUpperCase();
  const timeline: TimeRow[] = [
    ...t.inputs.map((id) => ({ name: id, label: name(id), values: seq.steps.map((s) => s[id]) })),
    ...t.outputs.map((id) => {
      const values = sims.map((s) => s.out[id] ?? "X");
      const expect = want.map((w) => w[id]);
      return { name: id, label: name(id), values, expect, bad: values.map((v, k) => k >= from && v !== expect[k]) };
    }),
  ];
  const first = seq.steps.findIndex((_, k) => timeline.some((r) => r.bad?.[k]));
  if (first < 0) return { ok: true, message: "모든 단계에서 의뢰 조건대로 동작해요.", timeline };
  return { ok: false, message: `${first + 1}번째 단계부터 조건과 달라요. 타임라인의 빨간 칸을 확인하세요.`, timeline };
}

export function gradeLogic(c: Circuit, t: LogicTask, lib: ChipLib): LogicGrade {
  const sims: DigitalResult[] = t.seq ? runSteps(c, t.seq.steps, lib) : inputCombos(t.inputs).map((ins) => simulate(c, ins, lib));
  const cost = nandCost(c, lib);
  const star = t.maxCost !== undefined && cost <= t.maxCost;
  const fail = (message: string): LogicGrade => ({ results: [{ ok: false, message }], cost, star: false });

  const missing = sims.find((s) => s.missingChip)?.missingChip;
  if (missing) return fail(`‘${CHIP_LABEL[missing] ?? missing}’ 부품을 찾을 수 없어요.`);
  if (sims.some((s) => s.conflict)) return fail("출력끼리 이어진 선이 있어요. 출력은 입력에만 이어 주세요.");
  if (sims.some((s) => s.oscillating)) return fail("회로가 계속 깜빡여요(발진). 출력이 자기 입력으로 돌아오는 선을 확인하세요.");

  if (t.seq) {
    const truth = seqTruth(sims, t);
    return { results: [truth], cost, star: truth.ok && star };
  }

  const lrows: LogicRow[] = sims.map((s, n) => ({
    inputs: t.inputs.map((_, i) => ((n >> (t.inputs.length - 1 - i)) & 1) as 0 | 1),
    expect: t.expect[n],
    got: t.outputs.map((o) => s.out[o] ?? "X"),
  }));
  const bad = lrows.filter((r) => r.got.some((g, i) => g !== r.expect[i]));
  const truth: CheckResult =
    bad.length === 0
      ? { ok: true, message: "모든 경우에 의뢰 조건대로 동작해요.", lrows }
      : bad.some((r) => r.got.includes("X"))
        ? { ok: false, message: "연결 안 된 입력이 있어서 결과가 정해지지 않아요(X). 모든 게이트 입력을 이어 주세요.", lrows }
        : { ok: false, message: `조건과 다르게 동작하는 경우가 ${bad.length}개 있어요. 표의 빨간 줄을 확인하세요.`, lrows };

  const results = [truth];
  if (t.costRequired && t.maxCost !== undefined) {
    // 통과 조건은 회로 구조를 본다: 부품함 부품은 기본 부품 원가로 센다
    // (예전 단원에서 비싸게 만든 부품 때문에 이 단원이 막히지 않게)
    const std = nandCost(c, makeLib({}));
    const note = std !== cost ? ` (부품함 부품을 기본 원가로 센 값. 지금 부품으로는 ${cost}개)` : "";
    results.push({ ok: std <= t.maxCost, message: `NAND ${std}개 — 목표 ${t.maxCost}개 이하${note}` });
  }
  return { results, cost, star: truth.ok && star };
}
