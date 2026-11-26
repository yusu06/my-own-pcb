import type { ElectricCheck } from "../../grader/electric";
import { ckt } from "../../sim/electric/ckt";
import type { Lesson } from "../types";

const PARTS = ["bat:battery:3", "ax:probe", "ay:probe", "potx:pot:10000", "poty:pot:10000"];
const X = ["potx.a~bat.-", "potx.b~bat.+", "potx.w~ax.p"];
const Y = ["poty.a~bat.-", "poty.b~bat.+", "poty.w~ay.p"];

/** 스틱 위치(x, y: 0~1)에서 두 측정 핀 전압이 3 V × 위치 (±0.15 V) */
const stick = (x: number, y: number): ElectricCheck[] =>
  (
    [
      ["ax", x],
      ["ay", y],
    ] as const
  ).map(([id, pos]) => ({
    kind: "voltage",
    at: { part: id, pin: "p" },
    min: Math.max(0, 3 * pos - 0.15),
    max: 3 * pos + 0.15,
    when: { settings: { potx: x, poty: y } },
  }));

export const lesson: Lesson = {
  id: "4-2",
  chapter: 4,
  title: "아날로그 스틱",
  emoji: "🕹️",
  minutes: 15,
  client: {
    from: "게임패드 회사 ‘엄지’",
    request:
      "새 게임패드의 아날로그 스틱을 만들어요. 스틱을 좌우로 밀면 X 가변저항이, 앞뒤로 밀면 Y 가변저항이 돌아가요. 두 방향을 각각 다른 측정 핀에서 0~3V로 읽게 해 주세요.",
    requirements: ["X 손잡이 → 측정 핀 ax, Y 손잡이 → 측정 핀 ay", "손잡이 0 % → 0 V, 100 % → 3 V", "한쪽을 움직여도 다른 쪽 전압은 그대로"],
  },
  concepts: [
    {
      title: "방향 하나에 가변저항 하나",
      body:
        "아날로그 스틱은 서로 직각으로 놓인 [[potentiometer]] 두 개다. 스틱을 기울이면 X축과 Y축 손잡이가 각각 돌아간다. 가운데에 두면 둘 다 50 %, 즉 1.5 V다. " +
        "그러니 4-1의 [[voltage-divider]]를 두 번 만들면 된다. 두 분압기는 전지만 같이 쓰고 서로 독립이다.",
    },
    {
      title: "측정 핀이 둘이면 ADC 채널도 둘",
      body:
        "MCU는 [[adc]] 입력 핀(채널)을 여러 개 갖고 있어서, X는 1번 채널, Y는 2번 채널로 따로 읽는다. 측정 핀을 서로 이으면 두 전압이 섞여서 어느 방향인지 알 수 없게 된다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "2축 스틱",
      goal: "X 가변저항의 손잡이 핀은 측정 핀 ax에, Y 가변저항의 손잡이 핀은 ay에 이으세요. 두 가변저항 모두 a는 전지 −, b는 전지 +에요.",
      palette: [
        { id: "potx", kind: "pot", label: "X 가변저항" },
        { id: "poty", kind: "pot", label: "Y 가변저항" },
      ],
      preset: ckt(["bat:battery:3", "ax:probe", "ay:probe"], []),
      checks: [...stick(0, 1), ...stick(1, 0), ...stick(0.5, 0.5), { kind: "noShort" }],
      reference: ckt(PARTS, [...X, ...Y]),
      wrong: [
        ckt(PARTS, [...X.slice(0, 2), ...Y.slice(0, 2), "potx.w~ay.p", "poty.w~ax.p"]), // X·Y를 바꿔 이음
        ckt(PARTS, [...X, "poty.a~bat.-", "poty.w~ay.p"]), // Y의 b가 빠져 Y가 늘 0 V
        ckt(PARTS, [...X, ...Y, "ax.p~ay.p"]), // 두 측정 핀을 이어 전압이 섞임
      ],
      hint: "4-1 분압기를 두 번: potx a→−, b→+, w→ax / poty a→−, b→+, w→ay.",
    },
  ],
  realWorld: [
    {
      title: "가운데가 정확히 1.5 V는 아니다",
      body:
        "실제 스틱은 손을 떼도 손잡이가 정확히 50 %로 돌아오지 않아 1.45 V나 1.55 V쯤에 멈춘다. 그래서 펌웨어는 가운데 근처 작은 범위를 ‘0’으로 치는 데드존을 둔다. " +
        "게임에서 스틱을 안 만졌는데 캐릭터가 조금씩 움직이는 ‘쏠림’은 이 값이 어긋나서 생긴다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "3 V 스틱에서 X 손잡이가 20 %면 측정 핀 ax의 전압은 몇 V일까?",
      answer: 0.6,
      tolerance: 0.02,
      unit: "V",
      explain: "손잡이 비율만큼 전압이 나뉜다: 3 V × 0.2 = 0.6 V.",
    },
    {
      kind: "choice",
      q: "스틱을 손에서 놓으면 두 측정 핀은 대략 몇 V일까?",
      choices: ["둘 다 약 1.5 V", "둘 다 0 V", "X는 3 V, Y는 0 V"],
      answer: 0,
      explain: "가운데로 돌아오면 두 손잡이가 50 %라 둘 다 3 V의 절반쯤이다.",
    },
  ],
  glossary: ["potentiometer", "adc"],
};
