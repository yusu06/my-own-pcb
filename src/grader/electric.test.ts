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

test("트랜지스터 회로가 수렴하지 않으면 이미터 연결을 알려 준다", () => {
  const c = ckt(
    ["bat:battery:3", "btn:button", "rb:resistor:10000", "q:npn", "r:resistor:100", "led:led"],
    ["bat.+~btn.a", "btn.b~rb.a", "rb.b~q.b", "bat.+~r.a", "r.b~q.c", "q.e~led.a", "led.k~bat.-"],
  );
  const [r] = gradeElectric(c, [{ kind: "truth", inputs: ["btn"], output: "led", expect: [0, 1] }], ["btn"]);
  expect(r.ok).toBe(false);
  expect(r.message).toContain("이미터");
});

const pull = (withR: boolean) =>
  ckt(
    ["bat:battery", "btn:button", "in:probe", ...(withR ? ["r:resistor:10000"] : [])],
    ["in.p~btn.a", "btn.b~bat.-", ...(withR ? ["r.a~bat.+", "r.b~in.p"] : [])],
  );
const HIGH: ElectricCheck = { kind: "voltage", at: { part: "in", pin: "p" }, min: 2.7, max: 3, when: {} };

test("voltage: 범위 안이면 통과, 떠 있으면 실패", () => {
  expect(gradeElectric(pull(true), [HIGH], ["btn"])[0].ok).toBe(true);
  const low = gradeElectric(pull(true), [{ ...HIGH, when: { pressed: { btn: true } } }], ["btn"])[0];
  expect(low.ok).toBe(false);
  expect(low.message).toContain("측정 핀 전압이");
  const f = gradeElectric(pull(false), [HIGH], ["btn"])[0];
  expect(f.ok).toBe(false);
  expect(f.message).toContain("정해지지 않았어요");
});

// 광센서(위)·10k(아래) 분압이 베이스를 직접 몬다: 밝으면 베이스가 높아 켜진다
const lightOn = ckt(
  ["bat:battery", "ldr:ldr", "rb:resistor:10000", "q:npn", "rl:resistor:100", "led:led"],
  ["bat.+~ldr.a", "ldr.b~q.b", "q.b~rb.a", "rb.b~bat.-", "bat.+~rl.a", "rl.b~led.a", "led.k~q.c", "q.e~bat.-"],
);

test("state: 밝기마다 켜짐·꺼짐을 본다", () => {
  const on = (light: number, want: boolean): ElectricCheck => ({ kind: "state", part: "led", on: want, when: { settings: { light } } });
  expect(gradeElectric(lightOn, [on(90, true), on(10, false)], []).map((r) => r.ok)).toEqual([true, true]);
  const bad = gradeElectric(lightOn, [on(10, true)], [])[0];
  expect(bad.ok).toBe(false);
  expect(bad.message).toContain("밝기 10");
});

test("noBurn은 손잡이 끝값까지 훑는다", () => {
  // 손잡이 0이면 a–w = 1 Ω → LED 탐. 기본 0.5(5 kΩ)만 보면 놓친다
  const bare = ckt(["bat:battery", "pot:pot", "led:led"], ["bat.+~pot.a", "pot.w~led.a", "led.k~bat.-"]);
  expect(gradeElectric(bare, [{ kind: "noBurn" }], [])[0].ok).toBe(false);
  const safe = ckt(["bat:battery", "pot:pot", "r:resistor:100", "led:led"], ["bat.+~pot.a", "pot.w~r.a", "r.b~led.a", "led.k~bat.-"]);
  expect(gradeElectric(safe, [{ kind: "noBurn" }], [])[0].ok).toBe(true);
});
