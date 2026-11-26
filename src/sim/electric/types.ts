export type PartKind =
  | "battery" | "resistor" | "lamp" | "led" | "switch" | "button" | "button-nc" | "npn"
  // 논리 부품 (M3)
  | "nand" | "in" | "out" | "chip"
  // 기본 D 플립플롭 (M5b)
  | "dff"
  // 4장: 가변저항, 광센서, 서미스터, 측정 핀(MCU 입력, 전류 없음)
  | "pot" | "ldr" | "ntc" | "probe"
  // 커패시터(value = µF): 직류에서는 끊긴 선, 시간 해석에서만 전하를 담는다
  | "cap";

/** 조작 값: 가변저항 id → 손잡이 0~1(기본 0.5), light → 밝기 0~100(기본 50), temp → 온도 °C(기본 25) */
export type Settings = Record<string, number>;

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
