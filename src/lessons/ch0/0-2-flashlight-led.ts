import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "btn:button", "r:resistor:100", "led:led"];
const W = ["bat.+~btn.a", "btn.b~r.a", "r.b~led.a", "led.k~bat.-"];
const withR = (v: number) => ckt(["bat:battery:3", "btn:button", `r:resistor:${v}`, "led:led"], W);

export const lesson: Lesson = {
  id: "0-2",
  chapter: 0,
  title: "손전등 v2",
  emoji: "💡",
  minutes: 12,
  client: {
    from: "캠핑용품점 ‘별빛캠프’",
    request: "전구 손전등은 전지가 금방 닳는다는 불만이 많아요. [[led]]로 바꿔서 오래 쓰게 해 주세요.",
    requirements: ["버튼을 누르면 [[led]]가 켜질 것", "[[led]]가 타지 않고 알맞은 밝기(4~20mA)일 것"],
  },
  concepts: [
    {
      title: "LED는 전구보다 효율이 좋다",
      body:
        "전구는 필라멘트를 뜨겁게 달궈서 빛을 낸다. 전기의 대부분이 열로 버려진다. " +
        "[[led]]는 같은 밝기를 훨씬 적은 [[current]]로 낸다. 그래서 요즘 손전등은 거의 다 LED다.",
    },
    {
      title: "LED는 혼자 두면 탄다",
      body:
        "[[led]]는 약 2V를 넘는 순간부터 [[current]]가 갑자기 엄청나게 늘어난다. 스스로 전류를 막지 못한다. " +
        "그래서 [[resistor]]를 [[series]]로 달아서 전류를 정해 줘야 한다. 이게 LED 회로의 첫 번째 규칙이다.",
    },
    {
      title: "옴의 법칙으로 저항 고르기",
      body:
        "[[ohms-law]]: V = I × R. 전지 3V에서 LED가 2V를 쓰면 저항에는 남은 1V가 걸린다. " +
        "전류를 10mA(0.01A)로 하고 싶으면 R = 1V ÷ 0.01A = 100Ω. 저항이 작으면 전류가 많아져 LED가 타고, 크면 너무 어둡다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "LED 손전등 만들기",
      goal: "버튼·[[resistor]]·[[led]]를 [[series]]로 이으세요. 저항을 길게 누르면 값을 바꿀 수 있어요. [[led]]는 + 표시가 있는 핀이 전지 + 쪽을 향해야 해요.",
      palette: [
        { id: "btn", kind: "button", label: "버튼" },
        { id: "r", kind: "resistor", label: "저항", values: [10, 47, 100, 220] },
        { id: "led", kind: "led", label: "LED" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [
        { kind: "truth", inputs: ["btn"], output: "led", expect: [0, 1] },
        { kind: "current", part: "led", min: 0.004, max: 0.02, when: { btn: true } },
        { kind: "noBurn" },
        { kind: "noShort" },
      ],
      reference: ckt(P, W),
      wrong: [
        withR(10),
        ckt(P, ["bat.+~btn.a", "btn.b~r.a", "r.b~led.k", "led.a~bat.-"]),
      ],
      hint: "순서는 전지 + → 버튼 → 저항 → LED + → LED − → 전지 −. 저항은 47Ω~220Ω이 알맞아요. 작을수록 밝지만 너무 작으면 타요.",
    },
  ],
  realWorld: [
    {
      title: "모든 LED 옆에는 저항이 있다",
      body:
        "전자제품 기판을 보면 작은 표시등 LED 바로 옆에 거의 항상 작은 저항이 붙어 있다. 바로 이 전류 제한 저항이다. " +
        "프로젝트에서 LED를 쓸 때 저항값을 계산하는 일은 가장 자주 하는 계산 중 하나다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "전지 3V, LED가 쓰는 전압 2V, 원하는 전류 10mA일 때 저항은 몇 Ω?",
      answer: 100,
      tolerance: 0.05,
      unit: "Ω",
      explain: "저항에 걸리는 전압은 3 − 2 = 1V. [[ohms-law]]로 R = 1V ÷ 0.01A = 100Ω.",
    },
    {
      kind: "choice",
      q: "LED 회로에서 저항을 빼 버리면?",
      choices: ["더 밝고 오래 간다", "전류가 너무 많이 흘러 LED가 탄다", "아무 변화 없다"],
      answer: 1,
      explain: "LED는 스스로 전류를 제한하지 못한다. 저항이 없으면 전류가 폭주해 탄다.",
    },
    {
      kind: "choice",
      q: "LED를 반대 방향으로 꽂으면?",
      choices: ["켜지지 않는다", "더 밝게 켜진다", "바로 탄다"],
      answer: 0,
      explain: "[[led]]는 한쪽 방향으로만 전류가 흐른다. 거꾸로 꽂으면 그냥 꺼져 있다(전압이 아주 크지 않다면 망가지지도 않는다).",
    },
  ],
  glossary: ["led", "resistor", "series", "ohms-law"],
};
