import { describe, expect, test } from "vitest";
import { initEditor, reduce, type EditorState } from "./state";
import { GRID, pinPos, snap, wirePath } from "./geometry";
import { ckt } from "../sim/electric/ckt";
import type { PaletteItem } from "../lessons/types";

const BTN: PaletteItem = { id: "btn", kind: "button", label: "버튼" };
const LAMP: PaletteItem = { id: "lamp", kind: "lamp", label: "전구" };
const start = (): EditorState => {
  let s = initEditor(ckt(["bat:battery:3"], []), null);
  s = reduce(s, { t: "place", item: BTN, x: 10, y: 4 });
  return reduce(s, { t: "place", item: LAMP, x: 10, y: 10 });
};
const pin = (part: string, p: string) => ({ part, pin: p });

describe("선 연결", () => {
  test("서로 다른 핀 두 번 탭 → 선", () => {
    let s = reduce(start(), { t: "tapPin", pin: pin("bat", "+") });
    expect(s.pending).toEqual(pin("bat", "+"));
    s = reduce(s, { t: "tapPin", pin: pin("btn", "a") });
    expect(s.circuit.wires).toHaveLength(1);
    expect(s.pending).toBeNull();
  });

  test("같은 핀 다시 탭 → 대기 취소", () => {
    let s = reduce(start(), { t: "tapPin", pin: pin("btn", "a") });
    s = reduce(s, { t: "tapPin", pin: pin("btn", "a") });
    expect(s.pending).toBeNull();
    expect(s.circuit.wires).toHaveLength(0);
  });

  test("같은 선은 중복으로 만들지 않는다(방향 무관)", () => {
    let s = start();
    for (const [a, b] of [[pin("bat", "+"), pin("btn", "a")], [pin("btn", "a"), pin("bat", "+")]]) {
      s = reduce(reduce(s, { t: "tapPin", pin: a }), { t: "tapPin", pin: b });
    }
    expect(s.circuit.wires).toHaveLength(1);
  });

  test("같은 부품의 두 핀끼리 연결 허용(합선 실습)", () => {
    let s = reduce(start(), { t: "tapPin", pin: pin("bat", "+") });
    s = reduce(s, { t: "tapPin", pin: pin("bat", "-") });
    expect(s.circuit.wires).toHaveLength(1);
  });

  test("removeWire", () => {
    let s = reduce(reduce(start(), { t: "tapPin", pin: pin("bat", "+") }), { t: "tapPin", pin: pin("btn", "a") });
    s = reduce(s, { t: "removeWire", index: 0 });
    expect(s.circuit.wires).toHaveLength(0);
  });
});

describe("부품", () => {
  test("remove는 부품과 그 선을 지운다", () => {
    let s = reduce(reduce(start(), { t: "tapPin", pin: pin("bat", "+") }), { t: "tapPin", pin: pin("btn", "a") });
    s = reduce(s, { t: "remove", id: "btn" });
    expect(s.circuit.parts.map((p) => p.id)).toEqual(["bat", "lamp"]);
    expect(s.circuit.wires).toHaveLength(0);
  });

  test("미리 놓인 부품은 지우거나 돌릴 수 없다", () => {
    const s0 = start();
    expect(reduce(s0, { t: "remove", id: "bat" }).circuit).toBe(s0.circuit);
    expect(reduce(s0, { t: "rotate", id: "bat" }).circuit).toBe(s0.circuit);
  });

  test("같은 id는 한 번만 놓인다", () => {
    const s = reduce(start(), { t: "place", item: BTN, x: 1, y: 1 });
    expect(s.circuit.parts.filter((p) => p.id === "btn")).toHaveLength(1);
  });

  test("rotate 4번이면 제자리, move와 setValue", () => {
    let s = start();
    for (let i = 0; i < 4; i++) s = reduce(s, { t: "rotate", id: "btn" });
    expect(s.circuit.parts.find((p) => p.id === "btn")!.rot).toBe(0);
    s = reduce(s, { t: "move", id: "lamp", x: 3, y: 7 });
    expect(s.circuit.parts.find((p) => p.id === "lamp")).toMatchObject({ x: 3, y: 7 });
    s = reduce(s, { t: "place", item: { id: "r", kind: "resistor", label: "저항", values: [47, 100] }, x: 1, y: 1 });
    expect(s.circuit.parts.find((p) => p.id === "r")!.value).toBe(47);
    s = reduce(s, { t: "setValue", id: "r", value: 100 });
    expect(s.circuit.parts.find((p) => p.id === "r")!.value).toBe(100);
  });
});

test("undo / redo, 새 동작은 future를 비운다", () => {
  let s = start();
  const before = s.circuit;
  s = reduce(s, { t: "move", id: "lamp", x: 1, y: 1 });
  s = reduce(s, { t: "undo" });
  expect(s.circuit).toEqual(before);
  s = reduce(s, { t: "redo" });
  expect(s.circuit.parts.find((p) => p.id === "lamp")).toMatchObject({ x: 1, y: 1 });
  s = reduce(s, { t: "undo" });
  s = reduce(s, { t: "move", id: "btn", x: 2, y: 2 });
  expect(s.future).toEqual([]);
});

test("저장된 회로가 있으면 그것으로 시작", () => {
  const saved = ckt(["bat:battery:3", "btn:button"], ["bat.+~btn.a"]);
  expect(initEditor(ckt(["bat:battery:3"], []), saved).circuit).toEqual(saved);
});

describe("좌표", () => {
  const part = { id: "p", kind: "resistor" as const, x: 5, y: 5, rot: 0 as const };
  test("pinPos와 회전(시계 방향)", () => {
    expect(pinPos(part, "a")).toEqual([3 * GRID, 5 * GRID]);
    expect(pinPos({ ...part, rot: 90 }, "a")).toEqual([5 * GRID, 3 * GRID]);
    expect(pinPos({ ...part, rot: 180 }, "a")).toEqual([7 * GRID, 5 * GRID]);
  });
  test("snap과 wirePath", () => {
    expect(snap(29)).toBe(1);
    expect(snap(31)).toBe(2);
    expect(wirePath([0, 0], [40, 60])).toBe("M 0 0 H 40 V 60");
  });
});
