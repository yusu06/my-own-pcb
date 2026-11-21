import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const WIRES = ["bat.+~btn.a", "btn.b~lamp.a", "lamp.b~bat.-"];

export const lesson: Lesson = {
  id: "0-1",
  chapter: 0,
  title: "손전등",
  emoji: "🔦",
  minutes: 8,
  client: {
    from: "캠핑용품점 ‘별빛캠프’",
    request: "버튼을 누르면 켜지는 아주 간단한 손전등 [[circuit]]가 필요합니다.",
    requirements: [
      "[[battery]] 1개, 버튼 1개, [[lamp]] 1개를 쓸 것",
      "버튼을 누르고 있으면 켜지고, 떼면 꺼질 것",
    ],
  },
  concepts: [
    {
      title: "전기는 고리를 따라 돈다",
      body:
        "[[current]]는 [[battery]]의 + 극에서 나와 부품을 지나 − 극으로 돌아온다. " +
        "이 고리가 한 군데도 끊기지 않은 상태를 [[closed-circuit]]라고 한다. " +
        "고리가 어디 한 곳이라도 끊기면 전류는 전혀 흐르지 않는다.",
    },
    {
      title: "스위치는 고리를 잇고 끊는다",
      body:
        "[[switch]]는 고리 중간에 끼워 둔 ‘다리’다. 다리를 내리면(누르면) 고리가 이어져서 불이 켜지고, " +
        "다리를 올리면(떼면) 고리가 끊겨서 꺼진다. 복잡한 기기도 결국 이 ‘잇기/끊기’를 아주 많이 조합한 것이다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "손전등 회로 만들기",
      goal: "[[battery]] → 버튼 → [[lamp]] → 다시 [[battery]]로 돌아오는 고리를 만드세요. 핀(작은 동그라미)을 탭하고 다른 핀을 탭하면 선이 이어져요.",
      palette: [
        { id: "btn", kind: "button", label: "버튼" },
        { id: "lamp", kind: "lamp", label: "전구" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [{ kind: "truth", inputs: ["btn"], output: "lamp", expect: [0, 1] }, { kind: "noShort" }],
      reference: ckt(["bat:battery:3", "btn:button", "lamp:lamp"], WIRES),
      wrong: [ckt(["bat:battery:3", "btn:button", "lamp:lamp"], ["bat.+~lamp.a", "lamp.b~bat.-"])],
      hint: "선은 3개면 충분해요. 전지 + 핀 → 버튼 한쪽, 버튼 다른 쪽 → 전구, 전구 다른 쪽 → 전지 − 핀.",
    },
  ],
  realWorld: [
    {
      title: "진짜 손전등 속 버튼",
      body:
        "손전등 버튼 안에는 금속 조각 두 개가 있다. 누르면 두 조각이 맞닿아 고리가 이어진다. 그게 전부다. " +
        "오래된 손전등이 깜빡이는 흔한 이유는 이 금속 접점이 녹슬거나 더러워져서, 맞닿았다 떨어졌다를 반복하기 때문이다. " +
        "그래서 실제 제품을 설계할 때는 ‘접점이 몇 번 눌려도 버티는지’(수명)도 부품을 고르는 기준이 된다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "버튼을 누르기 전에 전구가 꺼져 있는 이유는?",
      choices: ["전지가 아직 충전되지 않아서", "전류가 돌아올 고리가 끊겨 있어서", "전구가 예열되지 않아서"],
      answer: 1,
      explain: "버튼이 고리를 끊고 있어서 [[closed-circuit]]가 아니다. 누르는 순간 고리가 이어지며 전류가 흐른다.",
    },
    {
      kind: "choice",
      q: "손전등 안의 전선 하나가 끊어지면 어떻게 될까?",
      choices: ["전구가 조금 어두워진다", "전구가 꺼진다", "아무 변화가 없다"],
      answer: 1,
      explain: "고리가 한 곳이라도 끊기면 전류는 전혀 흐르지 않는다. ‘조금 덜 흐르는’ 것이 아니다.",
    },
    {
      kind: "choice",
      q: "전류는 전지의 어느 쪽에서 나와서 회로를 돈다고 약속할까?",
      choices: ["+ 극", "− 극", "가운데"],
      answer: 0,
      explain:
        "회로를 설명할 때는 ‘전류는 + 극에서 나와 − 극으로 돌아온다’고 약속한다(전류의 방향). " +
        "실제로 움직이는 전자는 반대 방향으로 가지만, 회로도와 계산은 모두 이 약속을 따른다.",
    },
  ],
  glossary: ["circuit", "closed-circuit", "current", "battery", "switch", "lamp"],
};
