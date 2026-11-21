import { expect, test } from "vitest";
import { buildNets, pinKey } from "./netlist";
import { isClosed, PINS } from "./parts";
import type { Circuit, Part } from "./types";

const r = (id: string): Part => ({ id, kind: "resistor", x: 0, y: 0, rot: 0, value: 100 });
const net = (c: Circuit, part: string, pin: string) => buildNets(c).netOf.get(pinKey({ part, pin }));

test("선이 없으면 핀마다 넷이 따로다", () => {
  expect(buildNets({ parts: [r("r1"), r("r2")], wires: [] }).count).toBe(4);
});

test("선으로 이은 핀은 같은 넷", () => {
  const c: Circuit = { parts: [r("r1"), r("r2")], wires: [{ a: { part: "r1", pin: "b" }, b: { part: "r2", pin: "a" } }] };
  expect(buildNets(c).count).toBe(3);
  expect(net(c, "r1", "b")).toBe(net(c, "r2", "a"));
});

test("사슬로 이어진 핀은 모두 같은 넷", () => {
  const c: Circuit = {
    parts: [r("r1"), r("r2"), r("r3")],
    wires: [
      { a: { part: "r1", pin: "b" }, b: { part: "r2", pin: "a" } },
      { a: { part: "r2", pin: "a" }, b: { part: "r3", pin: "a" } },
    ],
  };
  expect(net(c, "r1", "b")).toBe(net(c, "r3", "a"));
});

test("없는 부품을 가리키는 선은 무시한다", () => {
  const c: Circuit = { parts: [r("r1")], wires: [{ a: { part: "r1", pin: "a" }, b: { part: "ghost", pin: "a" } }] };
  expect(() => buildNets(c)).not.toThrow();
  expect(buildNets(c).count).toBe(2);
});

test("핀 이름 표", () => {
  expect(PINS.battery).toEqual(["+", "-"]);
  expect(PINS.led).toEqual(["a", "k"]);
  expect(PINS.npn).toEqual(["b", "c", "e"]);
});

test("isClosed: 스위치와 버튼", () => {
  const p = (kind: Part["kind"]): Part => ({ id: "s", kind, x: 0, y: 0, rot: 0 });
  expect(isClosed(p("button"), { s: true })).toBe(true);
  expect(isClosed(p("button"), {})).toBe(false);
  expect(isClosed(p("switch"), { s: true })).toBe(true);
  expect(isClosed(p("button-nc"), { s: true })).toBe(false);
  expect(isClosed(p("button-nc"), {})).toBe(true);
});
