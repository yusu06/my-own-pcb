import type { Circuit, Part, PartKind, PinRef } from "./types";

const ref = (s: string): PinRef => {
  const i = s.lastIndexOf(".");
  return { part: s.slice(0, i), pin: s.slice(i + 1) };
};

/**
 * 회로를 짧게 쓰는 도우미(단원 모범 답안·오답, 테스트용).
 * parts: "id:kind[:value]" — 격자에 두 줄로 자동 배치. wires: "a.pin~b.pin".
 */
export function ckt(parts: string[], wires: string[]): Circuit {
  return {
    parts: parts.map((s, i): Part => {
      const [id, kind, v] = s.split(":");
      return {
        id,
        kind: kind as PartKind,
        x: 4 + (i % 3) * 6,
        y: 4 + Math.floor(i / 3) * 6,
        rot: 0,
        ...(v ? { value: Number(v) } : {}),
      };
    }),
    wires: wires.map((w) => {
      const [a, b] = w.split("~");
      return { a: ref(a), b: ref(b) };
    }),
  };
}
