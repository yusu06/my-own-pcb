import { expect, test } from "vitest";
import { envKeys, logicSim } from "./adapter";
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
