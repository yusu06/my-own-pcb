import { simulate, type Bit, type ChipLib } from "../sim/digital/sim";
import { solve } from "../sim/electric/solve";
import { C, sensorR } from "../sim/electric/parts";
import type { Circuit, Part, PinRef, Pressed, Settings, Wire } from "../sim/electric/types";
import { partSymbol } from "./symbols";

/** 한 번 계산한 회로 상태를 화면에 그리는 데 필요한 것들 */
export interface Frame {
  part(p: Part, pressed: boolean): SVGGElement;
  wireClass(w: Wire): string;
  /** 경고(합선·발진 등). 없으면 null */
  warning(): string | null;
  pinTip(pin: PinRef): string;
  partTip(p: Part): string | null;
}

/** 전기/논리 회로를 편집기에 붙이는 어댑터 */
export interface Sim {
  /** settings = 실험 모드의 손잡이·밝기·온도(전기 회로만 씀) */
  frame(c: Circuit, pressed: Pressed, settings?: Settings): Frame;
  /** 실험 모드: 누르는 동안만 켜지는 부품 */
  hold(p: Part): boolean;
  /** 실험 모드: 탭하면 켜짐/꺼짐이 바뀌는 부품 */
  toggle(p: Part): boolean;
  runHelp: string;
  /** 시간이 있는 회로(커패시터): ms만큼 시간을 진행한다 */
  advance?(c: Circuit, pressed: Pressed, settings: Settings, ms: number): void;
  /** 시간 상태(커패시터 전압)를 0으로 */
  reset?(): void;
}

const mA = (a: number) => `${(a * 1000).toFixed(1)} mA`;
const kOhm = (r: number) => (r >= 1000 ? `${(r / 1000).toFixed(1)} kΩ` : `${r.toFixed(0)} Ω`);

/** 회로에 있는 센서에 맞는 환경 슬라이더 */
export function envKeys(c: Circuit): ("light" | "temp")[] {
  return [...(c.parts.some((p) => p.kind === "ldr") ? ["light" as const] : []), ...(c.parts.some((p) => p.kind === "ntc") ? ["temp" as const] : [])];
}

/** 전기 회로 어댑터. 커패시터 전압을 기억하므로 과제 화면마다 새로 만든다 */
export function createElectricSim(): Sim {
  // 회로 모양이 바뀌면 커패시터 전압을 버린다
  let caps: { shape: string; vc: Record<string, number> } = { shape: "", vc: {} };
  const shapeOf = (c: Circuit) => JSON.stringify([c.parts.map((p) => [p.id, p.kind, p.value]), c.wires]);
  const vcOf = (c: Circuit) => (caps.shape === shapeOf(c) ? caps.vc : {});
  const hasCap = (c: Circuit) => c.parts.some((p) => p.kind === "cap");
  return {
  frame(c, pressed, settings = {}) {
    const vc = vcOf(c);
    const sol = hasCap(c) ? solve(c, pressed, settings, { dt: C.DT, vc }) : solve(c, pressed, settings);
    // 10 ms 간격으로는 빈 커패시터를 채우는 순간의 큰 전류가 안 보인다: 채점과 같게 1 µs로 한 번 더 본다
    const inrush = hasCap(c) && !sol.short && solve(c, pressed, settings, { dt: 1e-6, vc }).short;
    return {
      part: (p, down) => partSymbol(p, sol.parts[p.id], down),
      wireClass: (w) => ((sol.parts[w.a.part]?.current ?? 0) >= 0.001 && (sol.parts[w.b.part]?.current ?? 0) >= 0.001 ? "flow" : ""),
      warning: () =>
        sol.short
          ? "⚠ 합선! 전지가 뜨거워져요. +와 −를 바로 잇는 선을 지우세요."
          : inrush
            ? "⚠ 합선! 빈 커패시터를 저항 없이 바로 채우고 있어요. 충전 저항을 넣어 주세요."
          : Object.values(sol.parts).some((r) => r.burnt)
            ? "⚠ LED가 탔어요! 저항으로 전류를 줄여 보세요."
            : !sol.converged
              ? "⚠ 회로 계산이 불안정해요."
              : null,
      pinTip: (pin) => (sol.floating[`${pin.part}.${pin.pin}`] ? "? V (정해지지 않음)" : `${(sol.nodeV[`${pin.part}.${pin.pin}`] ?? 0).toFixed(2)} V`),
      partTip: (p) =>
        p.kind === "button" || p.kind === "button-nc" || p.kind === "switch" || p.kind === "probe"
          ? null
          : p.kind === "cap"
            ? `${(vc[p.id] ?? 0).toFixed(2)} V`
          : p.kind === "pot"
            ? `손잡이 ${Math.round((settings[p.id] ?? 0.5) * 100)}%`
            : p.kind === "ldr" || p.kind === "ntc"
              ? `${kOhm(sensorR(p, settings))}, ${mA(sol.parts[p.id]?.current ?? 0)}`
              : mA(sol.parts[p.id]?.current ?? 0),
    };
  },
  hold: (p) => p.kind === "button" || p.kind === "button-nc",
  toggle: (p) => p.kind === "switch",
  runHelp: "스위치·버튼을 눌러 보세요. 핀을 탭하면 전압, 부품을 탭하면 전류가 보여요.",
  advance(c, pressed, settings, ms) {
    let vc = vcOf(c);
    for (let k = 0; k < Math.round(ms / 1000 / C.DT); k++) vc = solve(c, pressed, settings, { dt: C.DT, vc }).capV;
    caps = { shape: shapeOf(c), vc };
  },
  reset() {
    caps = { shape: "", vc: {} };
  },
  };
}

const BIT_CLASS: Record<string, string> = { 1: "hi", 0: "lo", X: "x" };

/** pressed[in 부품 id] = true면 1 */
export function logicSim(lib: ChipLib): Sim {
  // 래치·플립플롭이 기억하도록 직전 넷 값을 다음 계산에 넘긴다. 회로 구조가 바뀌면 버린다.
  let last: { shape: string; net: Record<string, Bit> } | null = null;
  return {
    frame(c, pressed) {
      const inputs = Object.fromEntries(c.parts.filter((p) => p.kind === "in").map((p) => [p.id, pressed[p.id] ? 1 : 0] as const));
      const shape = JSON.stringify([c.parts.map((p) => [p.id, p.kind, p.chip?.name, p.chip?.v]), c.wires]);
      const r = simulate(c, inputs, lib, last?.shape === shape ? last.net : undefined);
      last = { shape, net: r.net };
      const bit = (k: string): Bit => r.net[k] ?? "X";
      return {
        part: (p) => {
          const b: Bit = p.kind === "out" ? (r.out[p.id] ?? "X") : p.kind === "in" ? inputs[p.id] : "X";
          return partSymbol(p, { current: 0, on: b === 1, brightness: b === 1 ? 1 : 0, burnt: false }, false, {
            bit: b,
            fallback: p.chip ? lib(p.chip)?.fallback ?? true : false,
          });
        },
        wireClass: (w) => `logic ${BIT_CLASS[bit(`${w.a.part}.${w.a.pin}`)]}`,
        warning: () =>
          r.missingChip
            ? `⚠ ‘${r.missingChip}’ 부품을 찾을 수 없어요.`
            : r.conflict
              ? "⚠ 출력끼리 이어진 선이 있어요."
              : r.oscillating
                ? "⚠ 회로가 계속 깜빡여요(발진)."
                : null,
        pinTip: (pin) => `값: ${bit(`${pin.part}.${pin.pin}`)}`,
        partTip: () => null,
      };
    },
    hold: () => false,
    toggle: (p) => p.kind === "in",
    runHelp: "입력(IN)을 탭해서 0과 1을 바꿔 보세요. 선 색: 1 = 밝음, 0 = 흐림, X = 빨간 점선.",
  };
}
