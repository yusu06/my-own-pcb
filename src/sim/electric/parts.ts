import type { Part, PartKind, Pressed, Settings } from "./types";

export const PINS: Record<PartKind, string[]> = {
  battery: ["+", "-"],
  resistor: ["a", "b"],
  lamp: ["a", "b"],
  led: ["a", "k"],
  switch: ["a", "b"],
  button: ["a", "b"],
  "button-nc": ["a", "b"],
  npn: ["b", "c", "e"],
  nand: ["a", "b", "y"],
  in: ["y"],
  out: ["a"],
  dff: ["d", "clk", "q"],
  chip: [], // 부품마다 다르다: pinNames 사용
  pot: ["a", "w", "b"],
  ldr: ["a", "b"],
  ntc: ["a", "b"],
  probe: ["p"],
};

export function pinNames(p: Part): string[] {
  return p.kind === "chip" ? [...(p.chip?.inputs ?? []), ...(p.chip?.outputs ?? [])] : PINS[p.kind];
}

/** 단위: V, Ω, A, S. 값은 계획(M2) "부품 상수" 표에서 확정. */
export const C = {
  VBAT: 3,
  RBAT: 0.1,
  RLAMP: 30,
  LAMP_ON: 0.01,
  LAMP_FULL: 0.1,
  LED_VF: 2.0,
  LED_RS: 5,
  LED_ON: 0.001,
  LED_FULL: 0.02,
  LED_BURN: 0.03,
  RCLOSED: 0.01,
  BE_VF: 0.7,
  BE_RS: 10,
  IB_ON: 0.00005,
  RCE_ON: 1,
  GMIN: 1e-9,
  SHORT_A: 2,
  MAX_ITER: 20,
  // 4장
  POT_R: 10000,
  POT_MIN: 1,
  LDR_DARK: 200000,
  LDR_BRIGHT: 1000,
  NTC_R25: 10000,
  NTC_B: 3950,
} as const;

/** 광센서(밝기에 따라 로그 보간)·서미스터(B 상수 식)의 지금 저항 */
export function sensorR(p: Part, s: Settings): number {
  if (p.kind === "ldr") return C.LDR_DARK * (C.LDR_BRIGHT / C.LDR_DARK) ** ((s.light ?? 50) / 100);
  return C.NTC_R25 * Math.exp(C.NTC_B * (1 / ((s.temp ?? 25) + 273.15) - 1 / 298.15));
}

/** 가변저항의 a–w, w–b 저항 */
export function potR(p: Part, s: Settings): [number, number] {
  const r = p.value ?? C.POT_R;
  const pos = Math.min(Math.max(s[p.id] ?? 0.5, 0), 1);
  return [Math.max(r * pos, C.POT_MIN), Math.max(r * (1 - pos), C.POT_MIN)];
}

export const SWITCH_KINDS: PartKind[] = ["switch", "button", "button-nc"];

export function isClosed(p: Part, pressed: Pressed): boolean {
  const down = pressed[p.id] === true;
  return p.kind === "button-nc" ? !down : down;
}
