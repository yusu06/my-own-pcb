import { expect, test } from "vitest";
import { createElectricSim, envKeys, logicSim } from "./adapter";
import { makeLib } from "../sim/digital/chips";
import { ckt } from "../sim/electric/ckt";

const SR = ckt(["s_n:in", "r_n:in", "n1:nand", "n2:nand", "q:out"], ["s_n.y~n1.a", "n2.y~n1.b", "r_n.y~n2.a", "n1.y~n2.b", "n1.y~q.a"]);
const q = (sim: ReturnType<typeof logicSim>, c: typeof SR, pressed: Record<string, boolean>) => sim.frame(c, pressed).pinTip({ part: "q", pin: "a" });

test("편집기에서 래치가 값을 기억한다", () => {
  const sim = logicSim(makeLib({}));
  q(sim, SR, { s_n: false, r_n: true }); // 설정
  expect(q(sim, SR, { s_n: true, r_n: true })).toBe("값: 1");
  q(sim, SR, { s_n: true, r_n: false }); // 리셋
  expect(q(sim, SR, { s_n: true, r_n: true })).toBe("값: 0");
});

test("회로 구조가 바뀌면 이전 상태를 버린다", () => {
  const sim = logicSim(makeLib({}));
  q(sim, SR, { s_n: false, r_n: true });
  const fresh = q(logicSim(makeLib({})), { ...SR, wires: [...SR.wires] }, { s_n: true, r_n: true });
  // 선 하나를 지웠다 다시 이은 회로처럼 모양이 다르면 처음 상태와 같아야 한다
  const moved = { ...SR, parts: SR.parts.map((p) => (p.id === "n2" ? { ...p, id: "n2" } : p)), wires: SR.wires.slice().reverse() };
  expect(q(sim, moved, { s_n: true, r_n: true })).toBe(fresh);
});

test("envKeys: 회로에 있는 센서에 맞는 슬라이더만", () => {
  expect(envKeys(ckt(["bat:battery", "ldr:ldr"], []))).toEqual(["light"]);
  expect(envKeys(ckt(["n:ntc", "l:ldr"], []))).toEqual(["light", "temp"]);
  expect(envKeys(ckt(["bat:battery", "r:resistor"], []))).toEqual([]);
});

test("가변저항은 양 끝 핀에 0 %·100 % 표시가 있다", async () => {
  const { PIN_NAMES } = await import("./view");
  expect(PIN_NAMES.pot).toMatchObject({ a: "0%", b: "100%" });
});

const RC = ckt(
  ["bat:battery:3", "btn:button", "r:resistor:100", "cap:cap:1000"],
  ["bat.+~btn.a", "btn.b~r.a", "r.b~cap.a", "cap.b~bat.-"],
);
const capV = (sim: ReturnType<typeof createElectricSim>, c = RC) => parseFloat(sim.frame(c, {}, {}).partTip(c.parts.find((p) => p.id === "cap")!)!);

test("advance: 버튼을 1초 누르면 커패시터 전압이 오른다", () => {
  const sim = createElectricSim();
  expect(capV(sim)).toBeLessThan(0.1);
  sim.advance!(RC, { btn: true }, {}, 1000);
  expect(capV(sim)).toBeGreaterThan(1.5);
});

test("reset 뒤에는 다시 0 V", () => {
  const sim = createElectricSim();
  sim.advance!(RC, { btn: true }, {}, 1000);
  sim.reset!();
  expect(capV(sim)).toBeLessThan(0.1);
});

test("회로 모양이 바뀌면 커패시터 상태를 버린다", () => {
  const sim = createElectricSim();
  sim.advance!(RC, { btn: true }, {}, 1000);
  const moved = { ...RC, wires: [...RC.wires, { a: { part: "r", pin: "a" }, b: { part: "btn", pin: "b" } }] };
  expect(capV(sim, moved)).toBeLessThan(0.1);
});
