import type { PaletteItem } from "../lessons/types";
import type { ChipRef, Circuit, Part, PinRef } from "../sim/electric/types";

export interface EditorState {
  circuit: Circuit;
  /** 미리 놓인(지우거나 돌릴 수 없는) 부품 id */
  locked: string[];
  /** 선 연결을 기다리는 첫 번째 핀 */
  pending: PinRef | null;
  past: Circuit[];
  future: Circuit[];
}

export type Action =
  | { t: "place"; item: PaletteItem; x: number; y: number; chip?: ChipRef }
  | { t: "move"; id: string; x: number; y: number }
  | { t: "rotate"; id: string }
  | { t: "remove"; id: string }
  | { t: "setValue"; id: string; value: number }
  | { t: "tapPin"; pin: PinRef }
  | { t: "removeWire"; index: number }
  | { t: "undo" }
  | { t: "redo" };

const MAX_HISTORY = 50;
const samePin = (a: PinRef, b: PinRef) => a.part === b.part && a.pin === b.pin;

export function initEditor(preset: Circuit, saved: Circuit | null): EditorState {
  return { circuit: saved ?? preset, locked: preset.parts.map((p) => p.id), pending: null, past: [], future: [] };
}

/** 회로가 바뀌는 동작만 실행 취소 기록에 쌓는다. */
function commit(s: EditorState, circuit: Circuit): EditorState {
  return { ...s, circuit, pending: null, past: [...s.past, s.circuit].slice(-MAX_HISTORY), future: [] };
}

const mapPart = (c: Circuit, id: string, f: (p: Part) => Part): Circuit => ({
  ...c,
  parts: c.parts.map((p) => (p.id === id ? f(p) : p)),
});

export function reduce(s: EditorState, a: Action): EditorState {
  const c = s.circuit;
  const has = (id: string) => c.parts.some((p) => p.id === id);
  switch (a.t) {
    case "place": {
      let id = a.item.id;
      if (a.item.multi) {
        let n = 1;
        while (has(`${a.item.id}${n}`)) n++;
        id = `${a.item.id}${n}`;
      } else if (has(id)) return s;
      const part: Part = { id, kind: a.item.kind, x: a.x, y: a.y, rot: 0 };
      if (a.item.values?.length) part.value = a.item.values[0];
      if (a.chip) part.chip = a.chip;
      return commit(s, { ...c, parts: [...c.parts, part] });
    }
    case "move":
      return has(a.id) ? commit(s, mapPart(c, a.id, (p) => ({ ...p, x: a.x, y: a.y }))) : s;
    case "rotate":
      if (!has(a.id) || s.locked.includes(a.id)) return s;
      return commit(s, mapPart(c, a.id, (p) => ({ ...p, rot: (((p.rot + 90) % 360) as Part["rot"]) })));
    case "remove":
      if (!has(a.id) || s.locked.includes(a.id)) return s;
      return commit(s, {
        parts: c.parts.filter((p) => p.id !== a.id),
        wires: c.wires.filter((w) => w.a.part !== a.id && w.b.part !== a.id),
      });
    case "setValue":
      return has(a.id) ? commit(s, mapPart(c, a.id, (p) => ({ ...p, value: a.value }))) : s;
    case "tapPin": {
      if (!s.pending) return { ...s, pending: a.pin };
      if (samePin(s.pending, a.pin)) return { ...s, pending: null };
      const dup = c.wires.some(
        (w) => (samePin(w.a, s.pending!) && samePin(w.b, a.pin)) || (samePin(w.a, a.pin) && samePin(w.b, s.pending!)),
      );
      if (dup) return { ...s, pending: null };
      return commit(s, { ...c, wires: [...c.wires, { a: s.pending, b: a.pin }] });
    }
    case "removeWire":
      return a.index >= 0 && a.index < c.wires.length ? commit(s, { ...c, wires: c.wires.filter((_, i) => i !== a.index) }) : s;
    case "undo": {
      const prev = s.past.at(-1);
      return prev ? { ...s, circuit: prev, pending: null, past: s.past.slice(0, -1), future: [c, ...s.future] } : s;
    }
    case "redo": {
      const [next, ...rest] = s.future;
      return next ? { ...s, circuit: next, pending: null, past: [...s.past, c], future: rest } : s;
    }
  }
}
