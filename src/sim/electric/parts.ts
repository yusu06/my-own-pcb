import type { Part, PartKind, Pressed } from "./types";

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
} as const;

export const SWITCH_KINDS: PartKind[] = ["switch", "button", "button-nc"];

export function isClosed(p: Part, pressed: Pressed): boolean {
  const down = pressed[p.id] === true;
  return p.kind === "button-nc" ? !down : down;
}
