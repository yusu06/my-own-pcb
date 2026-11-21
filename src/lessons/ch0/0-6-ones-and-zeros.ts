import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "a:switch", "b:switch", "r:resistor:100", "led:led"];

export const lesson: Lesson = {
  id: "0-6",
  chapter: 0,
  title: "1과 0의 정체",
  emoji: "⚡",
  minutes: 12,
  client: {
    from: "공장 자동화 회사 ‘바른자동화’",
    request: "두 조건(A, B)이 모두 참일 때만 LED로 ‘준비 완료’를 알려 주는 표시기가 필요합니다.",
    requirements: ["A와 B가 모두 켜졌을 때만 LED가 켜질 것", "LED는 알맞은 밝기(5~20mA)이고 타지 않을 것"],
  },
  concepts: [
    {
      title: "1과 0은 전압이다",
      body:
        "디지털 회로에서 ‘1’과 ‘0’은 특별한 물건이 아니라 [[voltage]]의 높고 낮음이다. " +
        "예를 들어 3V 회로라면 거의 3V면 1(High), 거의 0V면 0(Low)으로 약속한다. 스위치가 켜져 전압이 걸리면 1인 셈이다.",
    },
    {
      title: "스위치 그림을 기호로",
      body:
        "0-3~0-5에서 만든 OR, AND, NOT은 너무 자주 쓰여서 그림 기호가 정해져 있다. 이 기호들을 [[logic-gate]]라고 부른다. " +
        "AND는 D자 모양, OR는 화살촉 모양, NOT은 삼각형 끝에 작은 동그라미가 붙은 모양이다.",
      figure: "and",
    },
    {
      title: "OR와 NOT의 기호",
      body: "작은 동그라미는 ‘뒤집기(NOT)’를 뜻한다. 다른 기호 끝에 붙으면 그 결과를 뒤집는다는 뜻이 된다.",
      figure: "or",
    },
    { title: "NOT 기호", body: "입력이 1이면 0, 0이면 1을 내보낸다.", figure: "not" },
  ],
  tasks: [
    {
      kind: "electric",
      title: "AND 표시기 만들기",
      goal: "스위치 A·B를 [[series]]로 잇고, [[resistor]]와 [[led]]로 결과를 표시하세요. 두 스위치가 모두 켜졌을 때만 LED가 켜져야 해요.",
      palette: [
        { id: "a", kind: "switch", label: "A" },
        { id: "b", kind: "switch", label: "B" },
        { id: "r", kind: "resistor", label: "저항", values: [100] },
        { id: "led", kind: "led", label: "LED" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [
        { kind: "truth", inputs: ["a", "b"], output: "led", expect: [0, 0, 0, 1] },
        { kind: "current", part: "led", min: 0.005, max: 0.02, when: { a: true, b: true } },
        { kind: "noBurn" },
      ],
      reference: ckt(P, ["bat.+~a.a", "a.b~b.a", "b.b~r.a", "r.b~led.a", "led.k~bat.-"]),
      wrong: [ckt(P, ["bat.+~a.a", "bat.+~b.a", "a.b~r.a", "b.b~r.a", "r.b~led.a", "led.k~bat.-"])],
      hint: "0-4 전자레인지(AND)와 0-2 LED 손전등을 합친 회로예요: 전지 + → A → B → 저항 → LED → 전지 −.",
    },
  ],
  realWorld: [
    {
      title: "칩 안의 수억 개 스위치",
      body:
        "컴퓨터 칩 안에서는 손가락 대신 전기로 켜고 끄는 아주 작은 스위치(트랜지스터)가 수억 개 모여 AND, OR, NOT을 만든다. " +
        "회로를 설계할 때는 스위치 하나하나를 그리지 않고 이 [[logic-gate]] 기호로 생각한다. 다음 장부터 이 기호로 회로를 만든다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "3V 디지털 회로에서 ‘1’은 보통 무엇을 뜻할까?",
      choices: ["전압이 높은 상태(3V 근처)", "전류가 1A", "스위치가 1개"],
      answer: 0,
      explain: "1과 0은 [[voltage]]의 높고 낮음을 약속한 것이다.",
    },
    {
      kind: "choice",
      q: "기호 끝에 붙은 작은 동그라미의 뜻은?",
      choices: ["전원", "뒤집기(NOT)", "접지"],
      answer: 1,
      explain: "작은 동그라미는 출력을 뒤집는다는 표시다.",
    },
    {
      kind: "choice",
      q: "스위치 두 개를 직렬로 이은 회로는 어떤 게이트와 같을까?",
      choices: ["AND", "OR", "NOT"],
      answer: 0,
      explain: "둘 다 켜져야 전류가 흐르므로 AND다.",
    },
  ],
  glossary: ["voltage", "logic-gate"],
};
