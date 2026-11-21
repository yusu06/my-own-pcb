import { expect, test } from "vitest";
import { gradeElectric, type ElectricCheck } from "./electric";
import { ckt } from "../sim/electric/ckt";

const LAMP_TRUTH: ElectricCheck[] = [{ kind: "truth", inputs: ["btn"], output: "lamp", expect: [0, 1] }, { kind: "noShort" }];

test("맞는 손전등 회로는 통과", () => {
  const c = ckt(["bat:battery", "btn:button", "lamp:lamp"], ["bat.+~btn.a", "btn.b~lamp.a", "lamp.b~bat.-"]);
  const r = gradeElectric(c, LAMP_TRUTH, ["btn"]);
  expect(r.map((x) => x.ok)).toEqual([true, true]);
});

test("버튼을 건너뛰면 항상 켜져서 실패", () => {
  const c = ckt(["bat:battery", "btn:button", "lamp:lamp"], ["bat.+~lamp.a", "lamp.b~bat.-"]);
  const [truth] = gradeElectric(c, LAMP_TRUTH, ["btn"]);
  expect(truth.ok).toBe(false);
  expect(truth.rows![0]).toEqual({ inputs: [0], expect: 0, got: 1 });
  expect(truth.message).toContain("누르지 않았는데");
});

test("전구가 회로에 안 이어지면 그렇게 알려 준다", () => {
  const c = ckt(["bat:battery", "btn:button", "lamp:lamp"], ["bat.+~btn.a", "btn.b~bat.-"]);
  const [truth] = gradeElectric(c, LAMP_TRUTH, ["btn"]);
  expect(truth.ok).toBe(false);
  expect(truth.message).toContain("전구가 회로에 연결되지 않았어요");
});

const ledCkt = (r: number) => ckt(["bat:battery", `r:resistor:${r}`, "led:led"], ["bat.+~r.a", "r.b~led.a", "led.k~bat.-"]);
const CURRENT: ElectricCheck = { kind: "current", part: "led", min: 0.005, max: 0.02, when: {} };

test("전류 범위", () => {
  expect(gradeElectric(ledCkt(100), [CURRENT], [])[0].ok).toBe(true);
  const dim = gradeElectric(ledCkt(220), [CURRENT], [])[0];
  expect(dim.ok).toBe(false);
  expect(dim.message).toContain("너무 어두워요");
  const bright = gradeElectric(ledCkt(33), [CURRENT], [])[0]; // 약 26mA: 타지는 않지만 20mA 초과
  expect(bright.ok).toBe(false);
  expect(bright.message).toContain("너무 밝아요");
});

test("LED가 타면 noBurn 실패", () => {
  const r = gradeElectric(ledCkt(10), [{ kind: "noBurn" }], [])[0];
  expect(r.ok).toBe(false);
  expect(r.message).toContain("LED가 탔어요");
});

test("모든 스위치 조합에서 합선을 찾는다", () => {
  const c = ckt(["bat:battery", "btn:button"], ["bat.+~btn.a", "btn.b~bat.-"]);
  const r = gradeElectric(c, [{ kind: "noShort" }], ["btn"])[0];
  expect(r.ok).toBe(false);
  expect(r.message).toContain("합선");
});

test("전지가 없는 회로도 친절하게 실패", () => {
  const c = ckt(["btn:button", "lamp:lamp"], ["btn.b~lamp.a"]);
  const r = gradeElectric(c, LAMP_TRUTH, ["btn"]);
  expect(r[0].ok).toBe(false);
  expect(typeof r[0].message).toBe("string");
});
