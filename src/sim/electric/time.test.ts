import { expect, test } from "vitest";
import { ckt } from "./ckt";
import { solve } from "./solve";
import { simulateTime } from "./time";

const close = (x: number, y: number, eps: number) => expect(Math.abs(x - y)).toBeLessThan(eps);

test("RC 충전: 3 V, 1 kΩ, 1000 µF → 1초 뒤 약 1.9 V", () => {
  const c = ckt(["bat:battery:3", "r:resistor:1000", "cap:cap:1000"], ["bat.+~r.a", "r.b~cap.a", "cap.b~bat.-"]);
  const frames = simulateTime(c, [{ ms: 1000 }]);
  expect(frames[0].sol.capV.cap).toBeLessThan(0.1);
  close(frames.at(-1)!.t, 1, 1e-6);
  close(frames.at(-1)!.sol.capV.cap, 3 * (1 - Math.exp(-1)), 0.05);
});

test("방전: 버튼으로 충전한 뒤 놓으면 저항으로 줄어든다", () => {
  const c = ckt(
    ["bat:battery:3", "btn:button", "r1:resistor:100", "cap:cap:1000", "r:resistor:1000"],
    ["bat.+~btn.a", "btn.b~r1.a", "r1.b~cap.a", "cap.a~r.a", "r.b~bat.-", "cap.b~bat.-"],
  );
  const frames = simulateTime(c, [{ ms: 1000, pressed: { btn: true } }, { ms: 1000 }]);
  close(frames[99].sol.capV.cap, (3 * 1000) / 1100, 0.05);
  close(frames.at(-1)!.sol.capV.cap, ((3 * 1000) / 1100) * Math.exp(-1), 0.1);
});

test("커패시터가 없으면 tr이 있어도 직류 해와 같다", () => {
  const c = ckt(["bat:battery:3", "btn:button", "r:resistor:100", "led:led"], ["bat.+~btn.a", "btn.b~r.a", "r.b~led.a", "led.k~bat.-"]);
  const dc = solve(c, { btn: true });
  const tr = solve(c, { btn: true }, {}, { dt: 0.01, vc: {} });
  expect(tr.nodeV).toEqual(dc.nodeV);
  expect(tr.parts).toEqual(dc.parts);
});

test("직류 해에서 커패시터는 끊긴 선", () => {
  const c = ckt(["bat:battery:3", "cap:cap:1000", "r:resistor:100", "led:led"], ["bat.+~cap.a", "cap.b~r.a", "r.b~led.a", "led.k~bat.-"]);
  const s = solve(c, {});
  expect(s.parts.led.on).toBe(false);
  expect(s.floating["cap.a"]).toBe(false);
  expect(s.floating["cap.b"]).toBe(true);
});
