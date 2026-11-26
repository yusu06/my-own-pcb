import { ckt } from "../../sim/electric/ckt";
import type { Lesson } from "../types";

const parts = (uf: number) => ["bat:battery:3", "btn:button", "rc:resistor:100", `cap:cap:${uf}`, "rb:resistor:10000", "q:npn", "rl:resistor:100", "led:led"];
const CHARGE = ["bat.+~btn.a", "btn.b~rc.a", "rc.b~cap.a", "cap.b~bat.-"];
const DRIVE = ["cap.a~rb.a", "rb.b~q.b", "q.e~bat.-", "bat.+~rl.a", "rl.b~led.a", "led.k~q.c"];

export const lesson: Lesson = {
  id: "4-5",
  chapter: 4,
  title: "딜레이 램프",
  emoji: "⏳",
  minutes: 20,
  client: {
    from: "아파트 관리사무소",
    request:
      "현관 센서등 대신 버튼식 복도등을 달아요. 버튼을 잠깐 누르면 불이 켜지고, 손을 뗀 뒤에도 몇 초 더 켜져 있다가 저절로 꺼지게 해 주세요. 너무 금방 꺼지거나, 계속 켜져 있으면 안 돼요.",
    requirements: ["버튼을 0.5초 누르면 LED가 켜짐", "놓은 뒤 2~5초 더 켜져 있다가 꺼짐", "어떤 순간에도 합선·탐 없이"],
  },
  concepts: [
    {
      title: "전하를 담는 물통: 커패시터",
      body:
        "[[capacitor]]는 판 두 장 사이에 전하를 담는다. 전지에 이으면 물통에 물이 차듯 전압이 오르고, 전지를 떼고 저항으로 이으면 천천히 빠져나간다. " +
        "직류에서 다 차고 나면 전류가 더 흐르지 않으니 끊긴 선처럼 보인다. 그런데 빈 커패시터를 저항 없이 바로 전지에 이으면, 채워지는 순간 엄청난 전류가 흘러 합선과 같다.",
    },
    {
      title: "얼마나 빨리 빠지나: 시간 상수",
      body:
        "커패시터가 저항을 지나 비워지는 빠르기는 저항 × 커패시터, 즉 [[time-constant]] τ로 정해진다. 10 kΩ × 220 µF = 2.2초. τ가 지날 때마다 남은 전압이 약 37%로 줄어든다. " +
        "저항이나 커패시터를 키우면 더 오래 걸린다.",
    },
    {
      title: "남은 물로 트랜지스터를 켜 둔다",
      body:
        "버튼을 누르면 작은 저항(100 Ω)을 지나 커패시터가 금방 찬다. 손을 떼면 커패시터가 베이스 저항(10 kΩ)을 지나 [[transistor]] 베이스로 천천히 비워지고, 베이스 전류가 충분한 동안 LED가 켜져 있다. " +
        "실험 모드에서 버튼을 눌렀다 떼고, 커패시터를 탭해 전압이 줄어드는 것을 지켜보자.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "몇 초 더 켜지는 복도등",
      goal: "버튼 → 100Ω → 커패시터(+쪽, a)로 채우고, 커패시터 a → 10kΩ → 트랜지스터 베이스로 비우게 하세요. LED는 100Ω과 함께 컬렉터(C) 쪽. 커패시터 값을 골라 놓은 뒤 2~5초 켜져 있게 하세요.",
      palette: [
        { id: "btn", kind: "button", label: "버튼" },
        { id: "rc", kind: "resistor", label: "충전 저항", values: [100] },
        { id: "cap", kind: "cap", label: "커패시터", values: [100, 220, 1000] },
        { id: "rb", kind: "resistor", label: "베이스 저항", values: [10000] },
        { id: "q", kind: "npn", label: "트랜지스터" },
        { id: "rl", kind: "resistor", label: "LED 저항", values: [100] },
        { id: "led", kind: "led", label: "LED" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [
        { kind: "timing", part: "led", press: "btn", holdMs: 500, onFor: [2000, 5000] },
        { kind: "noBurn" }, // 합선은 timing이 1 µs 순간까지 본다(noShort는 다 찬 커패시터만 봐서 엇갈림)
      ],
      reference: ckt(parts(220), [...CHARGE, ...DRIVE]),
      wrong: [
        ckt(parts(100), [...CHARGE, ...DRIVE]), // 너무 금방 꺼짐
        ckt(parts(1000), [...CHARGE, ...DRIVE]), // 10초가 지나도 켜짐
        ckt(parts(220), ["bat.+~btn.a", "btn.b~rc.a", "rc.b~rb.a", ...DRIVE.slice(1)]), // 커패시터 없음: 놓자마자 꺼짐
        ckt(parts(220), ["bat.+~btn.a", "btn.b~cap.a", "cap.b~bat.-", ...DRIVE]), // 충전 저항 없음: 순간 합선
      ],
      hint: "전지 + → 버튼 → 100Ω → 커패시터 a, 커패시터 b → 전지 −. 커패시터 a → 10kΩ → B, E → 전지 −. 전지 + → 100Ω → LED → C. 커패시터는 220µF.",
    },
  ],
  realWorld: [
    {
      title: "타이머 칩과 MCU 타이머",
      body:
        "계단 조명, 자동차 실내등이 문을 닫은 뒤 몇 초 켜져 있는 것도 RC 지연이 쓰였다. 다만 커패시터 값은 온도와 제품마다 ±20%쯤 달라서, 정확한 시간이 필요하면 555 같은 타이머 칩이나 MCU의 타이머를 쓴다. " +
        "그래도 버튼 디바운싱(2-4), 전원을 켤 때 잠깐 리셋을 붙잡는 회로처럼 RC는 지금도 기판 곳곳에 있다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "10 kΩ 저항과 470 µF 커패시터의 시간 상수 τ는 몇 초일까?",
      answer: 4.7,
      tolerance: 0.02,
      unit: "초",
      explain: "τ = R × C = 10 000 Ω × 0.000470 F = 4.7초.",
    },
    {
      kind: "choice",
      q: "복도등이 너무 빨리 꺼진다. 무엇을 바꾸면 더 오래 켜질까?",
      choices: ["커패시터를 더 큰 값으로", "충전 저항을 빼기", "LED 저항을 더 작게"],
      answer: 0,
      explain: "커패시터가 크면 담긴 전하가 많아 비워지는 데 오래 걸린다(τ = R × C). 충전 저항을 빼면 누르는 순간 합선이 된다.",
    },
  ],
  glossary: ["capacitor", "time-constant", "transistor"],
};
