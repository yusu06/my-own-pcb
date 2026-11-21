import { describe, expect, test } from "vitest";
import { solve } from "./solve";
import { ckt } from "./ckt";
import type { Pressed } from "./types";

const close = (x: number, y: number, eps = 1e-3) => expect(Math.abs(x - y)).toBeLessThan(eps);

describe("선형 부품", () => {
  test("3V 전지 + 100Ω", () => {
    const s = solve(ckt(["bat:battery", "r:resistor:100"], ["bat.+~r.a", "r.b~bat.-"]), {});
    close(s.parts.r.current, 3 / 100.1);
    expect(s.short).toBe(false);
    expect(s.converged).toBe(true);
  });

  test("버튼 + 전구: 누를 때만 켜진다", () => {
    const c = ckt(["bat:battery", "btn:button", "lamp:lamp"], ["bat.+~btn.a", "btn.b~lamp.a", "lamp.b~bat.-"]);
    const off = solve(c, {});
    close(off.parts.lamp.current, 0);
    expect(off.parts.lamp.on).toBe(false);
    const on = solve(c, { btn: true });
    close(on.parts.lamp.current, 3 / 30.11);
    expect(on.parts.lamp.on).toBe(true);
  });

  test("분압: 100Ω 두 개의 가운데는 약 1.5V", () => {
    const s = solve(ckt(["bat:battery", "r1:resistor:100", "r2:resistor:100"], ["bat.+~r1.a", "r1.b~r2.a", "r2.b~bat.-"]), {});
    close(s.nodeV["r1.b"], 1.5, 0.01);
  });

  const lampWith = (wires: string[]) => ckt(["bat:battery", "s1:switch", "s2:switch", "lamp:lamp"], wires);
  const combos: Pressed[] = [{}, { s2: true }, { s1: true }, { s1: true, s2: true }];

  test("병렬 스위치 = OR", () => {
    const c = lampWith(["bat.+~s1.a", "bat.+~s2.a", "s1.b~lamp.a", "s2.b~lamp.a", "lamp.b~bat.-"]);
    expect(combos.map((p) => solve(c, p).parts.lamp.on)).toEqual([false, true, true, true]);
  });

  test("직렬 스위치 = AND", () => {
    const c = lampWith(["bat.+~s1.a", "s1.b~s2.a", "s2.b~lamp.a", "lamp.b~bat.-"]);
    expect(combos.map((p) => solve(c, p).parts.lamp.on)).toEqual([false, false, false, true]);
  });
});

describe("덜 만든 회로와 합선", () => {
  test("전지가 없으면 모두 0, 모두 꺼짐", () => {
    const s = solve(ckt(["lamp:lamp", "r:resistor:100"], ["lamp.a~r.a"]), {});
    expect(Object.values(s.nodeV).every((v) => v === 0)).toBe(true);
    expect(s.parts.lamp.on).toBe(false);
  });

  test("선이 하나도 없어도 NaN이 없다", () => {
    const s = solve(ckt(["bat:battery", "lamp:lamp", "led:led", "q:npn"], []), {});
    expect(Object.values(s.nodeV).every(Number.isFinite)).toBe(true);
    expect(Object.values(s.parts).every((p) => Number.isFinite(p.current))).toBe(true);
  });

  test("빈 회로", () => {
    const s = solve({ parts: [], wires: [] }, {});
    expect(s.short).toBe(false);
  });

  test("전지 양 끝 직결은 합선", () => {
    expect(solve(ckt(["bat:battery"], ["bat.+~bat.-"]), {}).short).toBe(true);
  });
});
