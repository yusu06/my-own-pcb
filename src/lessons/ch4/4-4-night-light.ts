import type { ElectricCheck } from "../../grader/electric";
import { ckt } from "../../sim/electric/ckt";
import type { Lesson } from "../types";

const parts = (r: number) => ["bat:battery:3", "ldr:ldr", `r:resistor:${r}`, "q:npn", "rl:resistor:100", "led:led"];
const LED = ["bat.+~rl.a", "rl.b~led.a", "led.k~q.c", "q.e~bat.-"];
/** 위는 고정 저항, 아래는 광센서: 어두우면 광센서 저항이 커서 베이스 전압이 오른다 */
const DARK_ON = ["bat.+~r.a", "r.b~q.b", "q.b~ldr.a", "ldr.b~bat.-"];

const at = (light: number, on: boolean): ElectricCheck => ({ kind: "state", part: "led", on, when: { settings: { light } } });

export const lesson: Lesson = {
  id: "4-4",
  chapter: 4,
  title: "자동 야간등",
  emoji: "🌙",
  minutes: 20,
  client: {
    from: "육아용품점 ‘포근’",
    request:
      "아기 방 콘센트 옆에 다는 작은 야간등을 만들어요. 불을 끄고 방이 어두워지면 저절로 켜지고, 아침에 밝아지면 저절로 꺼지게 해 주세요.",
    requirements: ["밝기 10(어두움) → LED 켜짐", "밝기 90(밝음) → LED 꺼짐", "어떤 밝기에서도 LED가 타지 않게"],
  },
  concepts: [
    {
      title: "빛에 따라 바뀌는 저항",
      body:
        "[[ldr]]는 빛을 받을수록 저항이 작아진다. 어두우면 100 kΩ이 넘고, 밝으면 1~2 kΩ쯤이다. 실험 모드에서 밝기 슬라이더를 움직이고 광센서를 탭하면 저항값이 보인다.",
    },
    {
      title: "저항 변화를 전압으로: 다시 분압기",
      body:
        "고정 저항 하나와 광센서를 [[series]]로 이으면 [[voltage-divider]]가 된다. 광센서를 아래(− 쪽)에 두면, 어두울 때 아래 저항이 커져 가운데 전압이 오른다. " +
        "이 가운데 점을 [[transistor]]의 베이스에 이으면, 전압이 0.7 V를 넘을 때 트랜지스터가 켜져 LED를 켠다. 0-7에서 버튼 대신 빛이 스위치를 누르는 셈이다.",
    },
    {
      title: "고정 저항이 문턱을 정한다",
      body:
        "고정 저항이 너무 작으면 밝아도 베이스 전압이 높아 늘 켜지고, 너무 크면 어두워도 베이스 전류가 모자라 안 켜진다. 알맞은 값은 광센서의 ‘어두울 때’와 ‘밝을 때’ 저항 사이쯤이다. " +
        "저항을 바꿔 가며 실험 모드에서 밝기를 움직여 보자.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "어두우면 켜지는 야간등",
      goal: "고정 저항과 [[ldr]]로 분압기를 만들어 트랜지스터 베이스(B)에 이으세요. LED는 100Ω 저항과 함께 트랜지스터 컬렉터(C) 쪽에, 이미터(E)는 전지 −에. 고정 저항값을 골라 어두우면 켜지고 밝으면 꺼지게 하세요.",
      palette: [
        { id: "ldr", kind: "ldr", label: "광센서" },
        { id: "r", kind: "resistor", label: "고정 저항", values: [1000, 10000, 100000] },
        { id: "q", kind: "npn", label: "트랜지스터" },
        { id: "rl", kind: "resistor", label: "LED 저항", values: [100] },
        { id: "led", kind: "led", label: "LED" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [at(10, true), at(90, false), { kind: "noBurn" }, { kind: "noShort" }],
      reference: ckt(parts(10000), [...DARK_ON, ...LED]),
      wrong: [
        ckt(parts(10000), ["bat.+~ldr.a", "ldr.b~q.b", "q.b~r.a", "r.b~bat.-", ...LED]), // 자리를 바꾸면 밝을 때 켜짐
        ckt(parts(1000), [...DARK_ON, ...LED]), // 1 kΩ: 밝아도 켜짐
        ckt(parts(100000), [...DARK_ON, ...LED]), // 100 kΩ: 어두워도 베이스 전류 부족
      ],
      hint: "전지 + → 고정 저항 10kΩ → 베이스(B), 베이스 → 광센서 → 전지 −. LED 쪽: 전지 + → 100Ω → LED → C, E → 전지 −.",
    },
  ],
  realWorld: [
    {
      title: "가로등과 휴대폰 화면 밝기",
      body:
        "가로등의 자동 점등, 휴대폰 화면 자동 밝기도 같은 원리다. 다만 실제 제품은 해 질 녘에 켜졌다 꺼졌다 깜빡이지 않도록, 켜지는 밝기와 꺼지는 밝기를 조금 다르게 둔다(히스테리시스). " +
        "요즘은 CdS 대신 빛의 양을 숫자로 바로 알려 주는 조도 센서 칩을 MCU에 이어 쓰는 경우가 많다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "광센서를 분압기 위(+ 쪽)로, 고정 저항을 아래로 바꾸면 어떻게 될까?",
      choices: ["밝을 때 켜지고 어두울 때 꺼진다", "늘 켜진다", "아무 차이 없다"],
      answer: 0,
      explain: "밝으면 위 저항이 작아져 가운데 전압이 오른다. 동작이 정확히 반대가 된다.",
    },
    {
      kind: "choice",
      q: "밝은 방에서도 야간등이 꺼지지 않는다. 고정 저항을 어떻게 바꿔야 할까?",
      choices: ["더 큰 값으로", "더 작은 값으로", "LED 저항을 빼기"],
      answer: 0,
      explain: "고정 저항이 작으면 밝아도 베이스 전압이 높다. 키우면 같은 밝기에서 가운데 전압이 내려가 트랜지스터가 꺼진다.",
    },
  ],
  glossary: ["ldr", "voltage-divider", "transistor"],
};
