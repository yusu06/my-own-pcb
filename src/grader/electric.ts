import { buildNets, pinKey } from "../sim/electric/netlist";
import { PINS, SWITCH_KINDS } from "../sim/electric/parts";
import { solve, type Solution } from "../sim/electric/solve";
import type { Circuit, PartKind, Pressed } from "../sim/electric/types";

export type ElectricCheck =
  /** inputs의 2진 조합 순서(첫 입력이 최상위 비트), 1 = 켜짐 */
  | { kind: "truth"; inputs: string[]; output: string; expect: (0 | 1)[] }
  /** A 단위 */
  | { kind: "current"; part: string; min: number; max: number; when: Pressed }
  | { kind: "noBurn" }
  | { kind: "noShort" };

export interface TruthRow {
  inputs: (0 | 1)[];
  expect: 0 | 1;
  got: 0 | 1;
}

export interface CheckResult {
  ok: boolean;
  message: string;
  rows?: TruthRow[];
}

const NAME: Partial<Record<PartKind, string>> = { lamp: "전구", led: "LED", resistor: "저항", npn: "트랜지스터" };
const UNSTABLE = "회로 계산이 불안정해요. 연결을 조금 바꿔 보세요.";
const mA = (a: number) => `${(a * 1000).toFixed(1)}mA`;

function combos(inputs: string[]): Pressed[] {
  return Array.from({ length: 1 << inputs.length }, (_, n) =>
    Object.fromEntries(inputs.map((id, i) => [id, ((n >> (inputs.length - 1 - i)) & 1) === 1])),
  );
}

/** 부품의 모든 핀이 다른 부품의 핀과 넷을 공유하는가 */
function connected(c: Circuit, id: string): boolean {
  const p = c.parts.find((q) => q.id === id);
  if (!p) return false;
  const { netOf } = buildNets(c);
  const others = new Set<number>();
  for (const q of c.parts) if (q.id !== id) for (const pin of PINS[q.kind]) others.add(netOf.get(pinKey({ part: q.id, pin }))!);
  return PINS[p.kind].every((pin) => others.has(netOf.get(pinKey({ part: id, pin }))!));
}

export function gradeElectric(c: Circuit, checks: ElectricCheck[], inputs: string[]): CheckResult[] {
  const cache = new Map<string, Solution>();
  const run = (pressed: Pressed) => {
    const key = JSON.stringify(Object.entries(pressed).sort());
    if (!cache.has(key)) cache.set(key, solve(c, pressed));
    return cache.get(key)!;
  };
  const kindName = (id: string) => NAME[c.parts.find((p) => p.id === id)?.kind as PartKind] ?? "부품";

  return checks.map((chk): CheckResult => {
    switch (chk.kind) {
      case "truth": {
        const name = kindName(chk.output);
        if (!c.parts.some((p) => p.id === chk.output)) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        if (!connected(c, chk.output)) return { ok: false, message: `${name}가 회로에 연결되지 않았어요. 양쪽 핀을 모두 이어 주세요.` };
        const sols = combos(chk.inputs).map(run);
        if (sols.some((s) => !s.converged)) return { ok: false, message: UNSTABLE };
        const rows: TruthRow[] = sols.map((s, n) => ({
          inputs: chk.inputs.map((_, i) => ((n >> (chk.inputs.length - 1 - i)) & 1) as 0 | 1),
          expect: chk.expect[n],
          got: s.parts[chk.output]?.on ? 1 : 0,
        }));
        const bad = rows.filter((r) => r.expect !== r.got);
        if (bad.length === 0) return { ok: true, message: "모든 경우에 의뢰 조건대로 동작해요.", rows };
        const first = bad[0];
        const message =
          first.inputs.every((v) => v === 0) && first.got === 1
            ? `아무것도 누르지 않았는데 ${name}가 켜져요.`
            : `조건과 다르게 동작하는 경우가 ${bad.length}개 있어요. 표의 빨간 줄을 확인하세요.`;
        return { ok: false, message, rows };
      }
      case "current": {
        const s = run(chk.when);
        if (!s.converged) return { ok: false, message: UNSTABLE };
        const r = s.parts[chk.part];
        const name = kindName(chk.part);
        if (!r) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        const range = `(지금 ${mA(r.current)}, 알맞은 범위 ${mA(chk.min)}~${mA(chk.max)})`;
        if (SWITCH_KINDS.includes(c.parts.find((p) => p.id === chk.part)!.kind) && r.current > chk.max)
          return { ok: false, message: `버튼·스위치에 전류가 너무 많이 흘러요 ${range}` };
        if (r.burnt) return { ok: false, message: `${name}가 탔어요. 전류가 너무 많아요 ${range}` };
        if (r.current < chk.min) return { ok: false, message: `${name}가 너무 어두워요 ${range}` };
        if (r.current > chk.max) return { ok: false, message: `${name}가 너무 밝아요. 수명이 짧아져요 ${range}` };
        return { ok: true, message: `${name} 전류가 알맞아요 ${range}` };
      }
      case "noBurn": {
        const sols = combos(inputs).map(run);
        if (sols.some((s) => !s.converged)) return { ok: false, message: UNSTABLE };
        return sols.some((s) => Object.values(s.parts).some((p) => p.burnt))
          ? { ok: false, message: "LED가 탔어요. 저항으로 전류를 줄여 주세요." }
          : { ok: true, message: "타는 부품이 없어요." };
      }
      case "noShort": {
        const sols = combos(inputs).map(run);
        return sols.some((s) => s.short)
          ? { ok: false, message: "합선! 전지의 +와 −가 부품 없이 바로 이어지는 길이 있어요." }
          : { ok: true, message: "합선이 없어요." };
      }
    }
  });
}
