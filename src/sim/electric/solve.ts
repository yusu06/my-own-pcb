import { solveLinear } from "./linear";
import { buildNets, pinKey } from "./netlist";
import { C, isClosed, potR, sensorR } from "./parts";
import type { Circuit, Part, Pressed, Settings } from "./types";

export interface PartResult {
  /** A, 크기만 */
  current: number;
  on: boolean;
  brightness: number;
  burnt: boolean;
}

export interface Solution {
  /** 키 = pinKey, 값 = 접지(첫 전지의 −) 기준 전압 */
  nodeV: Record<string, number>;
  parts: Record<string, PartResult>;
  short: boolean;
  converged: boolean;
}

/** 다이오드형 접합: LED(a→k) 또는 npn의 B→E */
interface Junction {
  part: Part;
  a: string;
  k: string;
  vf: number;
  rs: number;
}

const OFF: PartResult = { current: 0, on: false, brightness: 0, burnt: false };
const isSwitch = (p: Part) => p.kind === "switch" || p.kind === "button" || p.kind === "button-nc";

/**
 * 직류 해석. 모든 부품을 컨덕턴스 + 전류원으로 바꿔 절점 방정식을 푼다.
 * LED·B–E 접합은 구간 선형(꺼짐 / Vf + 직렬저항)이고, 상태가 더 바뀌지 않을 때까지 반복한다.
 */
export function solve(c: Circuit, pressed: Pressed, settings: Settings = {}): Solution {
  const { netOf, count } = buildNets(c);
  const net = (p: Part, pin: string) => netOf.get(pinKey({ part: p.id, pin }))!;
  const nodeV: Record<string, number> = Object.fromEntries([...netOf.keys()].map((k) => [k, 0]));
  const parts: Record<string, PartResult> = Object.fromEntries(c.parts.map((p) => [p.id, { ...OFF }]));
  const firstBat = c.parts.find((p) => p.kind === "battery");
  if (!firstBat) return { nodeV, parts, short: false, converged: true };

  const ground = net(firstBat, "-");
  const idx = new Map<number, number>();
  for (let k = 0; k < count; k++) if (k !== ground) idx.set(k, idx.size);
  const n = idx.size;

  const junctions: Junction[] = [];
  for (const p of c.parts) {
    if (p.kind === "led") junctions.push({ part: p, a: "a", k: "k", vf: C.LED_VF, rs: C.LED_RS });
    if (p.kind === "npn") junctions.push({ part: p, a: "b", k: "e", vf: C.BE_VF, rs: C.BE_RS });
  }
  const jOn = new Map<Junction, boolean>(junctions.map((j) => [j, false]));
  const ceOn = new Map<string, boolean>();
  const resist = (p: Part) =>
    p.kind === "lamp" ? C.RLAMP : p.kind === "resistor" ? (p.value ?? 100) : p.kind === "ldr" || p.kind === "ntc" ? sensorR(p, settings) : C.RCLOSED;

  let x: number[] = new Array(n).fill(0);
  const vNet = (k: number) => (k === ground ? 0 : x[idx.get(k)!]);
  const dv = (p: Part, a: string, b: string) => vNet(net(p, a)) - vNet(net(p, b));
  const jCurrent = (j: Junction) => (jOn.get(j) ? (dv(j.part, j.a, j.k) - j.vf) / j.rs : 0);

  let converged = false;
  for (let iter = 0; iter < C.MAX_ITER && !converged; iter++) {
    const G = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const I = new Array<number>(n).fill(0);
    const cond = (p: number, q: number, g: number) => {
      const i = idx.get(p);
      const j = idx.get(q);
      if (i !== undefined) G[i][i] += g;
      if (j !== undefined) G[j][j] += g;
      if (i !== undefined && j !== undefined) {
        G[i][j] -= g;
        G[j][i] -= g;
      }
    };
    /** q에서 p로 흐르는 전류원 J (p로 들어감) */
    const src = (p: number, q: number, J: number) => {
      const i = idx.get(p);
      const j = idx.get(q);
      if (i !== undefined) I[i] += J;
      if (j !== undefined) I[j] -= J;
    };
    for (let i = 0; i < n; i++) G[i][i] += C.GMIN;

    for (const p of c.parts) {
      if (p.kind === "battery") {
        cond(net(p, "+"), net(p, "-"), 1 / C.RBAT);
        src(net(p, "+"), net(p, "-"), (p.value ?? C.VBAT) / C.RBAT);
      } else if (p.kind === "resistor" || p.kind === "lamp" || p.kind === "ldr" || p.kind === "ntc" || (isSwitch(p) && isClosed(p, pressed))) {
        cond(net(p, "a"), net(p, "b"), 1 / resist(p));
      } else if (p.kind === "pot") {
        const [ra, rb] = potR(p, settings);
        cond(net(p, "a"), net(p, "w"), 1 / ra);
        cond(net(p, "w"), net(p, "b"), 1 / rb);
      } else if (p.kind === "npn" && ceOn.get(p.id)) {
        cond(net(p, "c"), net(p, "e"), 1 / C.RCE_ON);
      }
    }
    for (const j of junctions) {
      if (!jOn.get(j)) continue;
      // 켜진 접합: a에서 나가는 전류 = (Va−Vk)/Rs − Vf/Rs → 컨덕턴스 1/Rs + a로 들어가는 전류원 Vf/Rs
      cond(net(j.part, j.a), net(j.part, j.k), 1 / j.rs);
      src(net(j.part, j.a), net(j.part, j.k), j.vf / j.rs);
    }

    x = solveLinear(G, I);

    let changed = false;
    for (const j of junctions) {
      const on = jOn.get(j)!;
      if (!on && dv(j.part, j.a, j.k) > j.vf + 1e-9) {
        jOn.set(j, true);
        changed = true;
      } else if (on && jCurrent(j) < 0) {
        jOn.set(j, false);
        changed = true;
      }
    }
    for (const j of junctions) {
      if (j.part.kind !== "npn") continue;
      // C가 E보다 높을 때만 켠다: C·E를 거꾸로 꽂은 회로가 켜지지 않게
      const want = jCurrent(j) >= C.IB_ON && dv(j.part, "c", "e") >= 0;
      if (want !== (ceOn.get(j.part.id) ?? false)) {
        ceOn.set(j.part.id, want);
        changed = true;
      }
    }
    converged = !changed;
  }

  for (const [key, k] of netOf) nodeV[key] = vNet(k);

  let short = false;
  for (const p of c.parts) {
    const r = parts[p.id];
    if (p.kind === "battery") {
      r.current = Math.abs(((p.value ?? C.VBAT) - dv(p, "+", "-")) / C.RBAT);
      if (r.current > C.SHORT_A) short = true;
    } else if (p.kind === "resistor" || p.kind === "lamp" || p.kind === "ldr" || p.kind === "ntc") {
      r.current = Math.abs(dv(p, "a", "b")) / resist(p);
      if (p.kind === "lamp") {
        r.on = r.current >= C.LAMP_ON;
        r.brightness = Math.min(r.current / C.LAMP_FULL, 1);
      }
    } else if (isSwitch(p) && isClosed(p, pressed)) {
      r.current = Math.abs(dv(p, "a", "b")) / C.RCLOSED;
    } else if (p.kind === "npn") {
      r.current = ceOn.get(p.id) ? Math.abs(dv(p, "c", "e")) / C.RCE_ON : 0;
      r.on = ceOn.get(p.id) ?? false;
    }
  }
  for (const j of junctions) {
    if (j.part.kind !== "led") continue;
    const r = parts[j.part.id];
    r.current = Math.max(jCurrent(j), 0);
    r.burnt = r.current > C.LED_BURN;
    r.on = r.current >= C.LED_ON && !r.burnt;
    r.brightness = r.on ? Math.min(r.current / C.LED_FULL, 1) : 0;
  }
  return { nodeV, parts, short, converged };
}
