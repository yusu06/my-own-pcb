import type { Bit } from "../sim/digital/sim";
import { buildNets, pinKey } from "../sim/electric/netlist";
import { pinNames, SWITCH_KINDS } from "../sim/electric/parts";
import { solve, type Solution } from "../sim/electric/solve";
import { simulateTime } from "../sim/electric/time";
import { C } from "../sim/electric/parts";
import type { Circuit, PartKind, PinRef, Pressed, Settings } from "../sim/electric/types";

/** 채점 조건: 누른 버튼과 조작 값(손잡이·밝기·온도) */
export interface When {
  pressed?: Pressed;
  settings?: Settings;
}

export type ElectricCheck =
  /** inputs의 2진 조합 순서(첫 입력이 최상위 비트), 1 = 켜짐 */
  | { kind: "truth"; inputs: string[]; output: string; expect: (0 | 1)[] }
  /** A 단위 */
  | { kind: "current"; part: string; min: number; max: number; when: When }
  /** V 단위. ref가 없으면 접지(첫 전지 −) 기준. 떠 있으면 실패 */
  | { kind: "voltage"; at: PinRef; ref?: PinRef; min: number; max: number; when: When }
  /** 그 조건에서 부품이 켜졌는지(LED·전구) */
  | { kind: "state"; part: string; on: boolean; when: When }
  /** 0.5 s 쉼 → press 버튼을 holdMs 누름 → 놓고 최대 10 s. 놓은 뒤 part가 켜져 있는 시간(ms)이 onFor 안 */
  | { kind: "timing"; part: string; press: string; holdMs: number; onFor: [number, number] }
  | { kind: "noBurn" }
  | { kind: "noShort" };

export interface LogicRow {
  inputs: (0 | 1)[];
  expect: (0 | 1)[];
  got: Bit[];
}

/** 타임라인 한 줄: 신호 하나의 단계별 값. 출력 줄에만 expect·bad */
export interface TimeRow {
  name: string;
  label: string;
  values: (number | "X")[];
  /** undefined = 채점하지 않는 칸(상관없음) */
  expect?: (number | undefined)[];
  bad?: boolean[];
}

export interface TruthRow {
  inputs: (0 | 1)[];
  expect: 0 | 1;
  got: 0 | 1;
}

export interface CheckResult {
  ok: boolean;
  message: string;
  rows?: TruthRow[];
  /** 논리 과제 진리표(출력이 여러 개일 수 있다) */
  lrows?: LogicRow[];
  /** 순차 과제 타임라인 */
  timeline?: TimeRow[];
}

const NAME: Partial<Record<PartKind, string>> = {
  lamp: "전구", led: "LED", resistor: "저항", npn: "트랜지스터", button: "버튼", "button-nc": "버튼", switch: "스위치",
  pot: "가변저항", ldr: "광센서", ntc: "서미스터", probe: "측정 핀",
};
const UNSTABLE = "회로 계산이 불안정해요. 연결을 조금 바꿔 보세요.";
// 스위치 모델 트랜지스터는 이미터 쪽에 부하를 달면 켜짐·꺼짐을 오간다
const UNSTABLE_NPN = "트랜지스터가 켜졌다 꺼졌다 해요. 이미터(E)는 전지 −에 바로 잇고, LED 같은 부하는 컬렉터(C) 쪽에 달아 주세요.";
const mA = (a: number) => `${(a * 1000).toFixed(1)}mA`;

function combos(inputs: string[]): Pressed[] {
  return Array.from({ length: 1 << inputs.length }, (_, n) =>
    Object.fromEntries(inputs.map((id, i) => [id, ((n >> (inputs.length - 1 - i)) & 1) === 1])),
  );
}

/** 탐·합선 검사가 훑는 조건: 버튼 조합 × 회로에 있는 조작 부품의 끝값 */
function conditions(c: Circuit, inputs: string[]): When[] {
  let sets: Settings[] = [{}];
  const spread = (key: string, values: number[]) => (sets = sets.flatMap((s) => values.map((v) => ({ ...s, [key]: v }))));
  for (const p of c.parts) if (p.kind === "pot") spread(p.id, [0, 0.5, 1]);
  if (c.parts.some((p) => p.kind === "ldr")) spread("light", [0, 100]);
  if (c.parts.some((p) => p.kind === "ntc")) spread("temp", [0, 50]);
  return combos(inputs).flatMap((pressed) => sets.map((settings) => ({ pressed, settings })));
}

/** 조건을 사람 말로: "밝기 10, 버튼 누름". name = 부품 id → 화면에 보이는 이름 */
function describe(w: When, name: (id: string) => string): string {
  const s = w.settings ?? {};
  const parts = [
    ...Object.entries(s).map(([k, v]) =>
      k === "light" ? `밝기 ${v}` : k === "temp" ? `온도 ${v} °C` : `${name(k)} 손잡이 ${Math.round(v * 100)}%`,
    ),
    ...Object.entries(w.pressed ?? {}).map(([k, v]) => `${name(k)} ${v ? "누름" : "안 누름"}`),
  ];
  return parts.length ? parts.join(", ") : "기본 상태";
}

/** 부품의 모든 핀이 다른 부품의 핀과 넷을 공유하는가 */
function connected(c: Circuit, id: string): boolean {
  const p = c.parts.find((q) => q.id === id);
  if (!p) return false;
  const { netOf } = buildNets(c);
  const others = new Set<number>();
  for (const q of c.parts) if (q.id !== id) for (const pin of pinNames(q)) others.add(netOf.get(pinKey({ part: q.id, pin }))!);
  return pinNames(p).every((pin) => others.has(netOf.get(pinKey({ part: id, pin }))!));
}

/** labels = 부품 id → 부품함 이름표(같은 종류가 여럿일 때 메시지에서 구분) */
export function gradeElectric(c: Circuit, checks: ElectricCheck[], inputs: string[], labels: Record<string, string> = {}): CheckResult[] {
  const cache = new Map<string, Solution>();
  const run = (w: When) => {
    const key = JSON.stringify([Object.entries(w.pressed ?? {}).sort(), Object.entries(w.settings ?? {}).sort()]);
    if (!cache.has(key)) cache.set(key, solve(c, w.pressed ?? {}, w.settings ?? {}));
    return cache.get(key)!;
  };
  const runPressed = (pressed: Pressed) => run({ pressed });
  const unstable = c.parts.some((p) => p.kind === "npn") ? UNSTABLE_NPN : UNSTABLE;
  const kindName = (id: string) => NAME[c.parts.find((p) => p.id === id)?.kind as PartKind] ?? "부품";
  const label = (id: string) => labels[id] ?? (NAME[c.parts.find((p) => p.id === id)?.kind as PartKind] ?? id);

  return checks.map((chk): CheckResult => {
    switch (chk.kind) {
      case "truth": {
        const name = kindName(chk.output);
        if (!c.parts.some((p) => p.id === chk.output)) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        if (!connected(c, chk.output)) return { ok: false, message: `${name}가 회로에 연결되지 않았어요. 양쪽 핀을 모두 이어 주세요.` };
        const sols = combos(chk.inputs).map(runPressed);
        if (sols.some((s) => !s.converged)) return { ok: false, message: unstable };
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
        if (!s.converged) return { ok: false, message: unstable };
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
      case "voltage": {
        const s = run(chk.when);
        if (!s.converged) return { ok: false, message: unstable };
        const key = (r: PinRef) => pinKey(r);
        if (!c.parts.some((p) => p.id === chk.at.part)) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        const probe = chk.at.part.toUpperCase(); // 미리 놓인 측정 핀은 화면에 id 대문자로 보인다
        if (s.floating[key(chk.at)] || (chk.ref && s.floating[key(chk.ref)]))
          return { ok: false, message: `${describe(chk.when, label)}: 측정 핀 ${probe} 전압이 정해지지 않았어요. 어디에도 이어지지 않은 점이 있어요.` };
        const v = (s.nodeV[key(chk.at)] ?? 0) - (chk.ref ? (s.nodeV[key(chk.ref)] ?? 0) : 0);
        const range = `(알맞은 범위 ${chk.min}~${chk.max} V)`;
        return v >= chk.min && v <= chk.max
          ? { ok: true, message: `${describe(chk.when, label)}: 측정 핀 ${probe} 전압 ${v.toFixed(2)} V ${range}` }
          : { ok: false, message: `${describe(chk.when, label)}: 측정 핀 ${probe} 전압이 ${v.toFixed(2)} V예요 ${range}` };
      }
      case "state": {
        const s = run(chk.when);
        if (!s.converged) return { ok: false, message: unstable };
        const name = kindName(chk.part);
        if (!s.parts[chk.part]) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        const on = s.parts[chk.part].on;
        return on === chk.on
          ? { ok: true, message: `${describe(chk.when, label)}일 때 ${name}가 ${on ? "켜져요" : "꺼져요"}.` }
          : { ok: false, message: `${describe(chk.when, label)}일 때 ${name}가 ${chk.on ? "켜져야" : "꺼져야"} 해요.` };
      }
      case "timing": {
        const REST = 500;
        const AFTER = 10000;
        const frames = simulateTime(c, [{ ms: REST }, { ms: chk.holdMs, pressed: { [chk.press]: true } }, { ms: AFTER }]);
        const name = kindName(chk.part);
        if (!c.parts.some((p) => p.id === chk.part)) return { ok: false, message: "필요한 부품을 아직 놓지 않았어요." };
        const release = Math.round((REST + chk.holdMs) / 1000 / C.DT); // 놓은 뒤 첫 단계
        const onAt = (k: number) => frames[k].sol.parts[chk.part]?.on ?? false;
        // 250 ms마다 표본: 보여 주기만 하고 칸별로 채점하지는 않는다
        const samples = frames.filter((_, k) => (k + 1) % 25 === 0).map((f) => f.t);
        const at = (t: number) => frames[Math.round(t / C.DT) - 1];
        const timeline: TimeRow[] = [
          { name: chk.press, label: label(chk.press), values: samples.map((t) => (t * 1000 > REST && t * 1000 <= REST + chk.holdMs ? 1 : 0)) },
          { name: chk.part, label: name, values: samples.map((t) => (at(t).sol.parts[chk.part]?.on ? 1 : 0)) },
        ];
        if (frames.some((f) => !f.sol.converged)) return { ok: false, message: unstable, timeline };
        // 10 ms 간격으로는 빈 커패시터를 채우는 순간의 큰 전류가 보이지 않는다: 누르는 순간을 1 µs로 한 번 더 본다
        const instant = solve(c, { [chk.press]: true }, {}, { dt: 1e-6, vc: frames[release - Math.round(chk.holdMs / 1000 / C.DT) - 1]?.sol.capV ?? {} });
        if (instant.short || frames.some((f) => f.sol.short)) return { ok: false, message: "합선! 커패시터를 저항 없이 바로 채우면 순간적으로 전지가 합선돼요.", timeline };
        const burnt = frames.flatMap((f) => Object.entries(f.sol.parts).filter(([, p]) => p.burnt).map(([id]) => id))[0];
        if (burnt) return { ok: false, message: `${kindName(burnt)}가 탔어요. 저항으로 전류를 줄여 주세요.`, timeline };
        const range = `(알맞은 범위 ${chk.onFor[0] / 1000}~${chk.onFor[1] / 1000}초)`;
        const off = frames.findIndex((_, k) => k >= release && !onAt(k));
        if (off < 0) return { ok: false, message: `버튼을 놓고 ${AFTER / 1000}초가 지나도 ${name}가 꺼지지 않아요 ${range}`, timeline };
        const ms = (off - release) * C.DT * 1000;
        const sec = (ms / 1000).toFixed(1);
        if (ms < chk.onFor[0]) return { ok: false, message: `버튼을 놓은 뒤 ${name}가 ${sec}초 만에 꺼져요. 더 오래 켜져 있어야 해요 ${range}`, timeline };
        if (ms > chk.onFor[1]) return { ok: false, message: `버튼을 놓은 뒤 ${name}가 ${sec}초나 켜져 있어요. 더 빨리 꺼져야 해요 ${range}`, timeline };
        return { ok: true, message: `버튼을 놓은 뒤 ${name}가 ${sec}초 동안 켜져 있어요 ${range}`, timeline };
      }
      case "noBurn": {
        const sols = conditions(c, inputs).map(run);
        if (sols.some((s) => !s.converged)) return { ok: false, message: unstable };
        const burnt = sols.flatMap((s) => Object.entries(s.parts).filter(([, p]) => p.burnt).map(([id]) => id))[0];
        return burnt
          ? { ok: false, message: `${kindName(burnt)}가 탔어요. 저항으로 전류를 줄여 주세요.` }
          : { ok: true, message: "타는 부품이 없어요." };
      }
      case "noShort": {
        const sols = conditions(c, inputs).map(run);
        return sols.some((s) => s.short)
          ? { ok: false, message: "합선! 전지의 +와 −가 부품 없이 바로 이어지는 길이 있어요." }
          : { ok: true, message: "합선이 없어요." };
      }
    }
  });
}
