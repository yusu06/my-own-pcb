export type PartKind =
  | "battery" | "resistor" | "lamp" | "led" | "switch" | "button" | "button-nc" | "npn"
  // 논리 부품 (M3)
  | "nand" | "in" | "out" | "chip"
  // 기본 D 플립플롭 (M5b)
  | "dff";

/** 부품함 부품 참조. v: null = 기본 부품. inputs/outputs는 놓을 때 복사한 스냅샷(핀 배치가 이것으로 정해진다). */
export interface ChipRef {
  name: string;
  v: number | null;
  inputs: string[];
  outputs: string[];
}

/** x, y는 격자 칸 좌표. value: 저항이면 Ω, 전지면 V. */
export interface Part {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  rot: 0 | 90 | 180 | 270;
  value?: number;
  chip?: ChipRef;
}

export interface PinRef {
  part: string;
  pin: string;
}

export interface Wire {
  a: PinRef;
  b: PinRef;
}

export interface Circuit {
  parts: Part[];
  wires: Wire[];
}

/** switch/button id → 눌림(토글이면 켜짐) */
export type Pressed = Record<string, boolean>;
