export type PartKind = "battery" | "resistor" | "lamp" | "led" | "switch" | "button" | "button-nc" | "npn";

/** x, y는 격자 칸 좌표. value: 저항이면 Ω, 전지면 V. */
export interface Part {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  rot: 0 | 90 | 180 | 270;
  value?: number;
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
