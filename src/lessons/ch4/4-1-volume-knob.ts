import type { ElectricCheck } from "../../grader/electric";
import { ckt } from "../../sim/electric/ckt";
import type { Lesson } from "../types";

const PARTS = ["bat:battery:3", "adc:probe", "pot:pot:10000"];
/** 손잡이 0 % = 손잡이 핀이 a 쪽. a를 −에, b를 +에 이으면 0 % → 0 V, 100 % → 3 V */
const OK = ["pot.a~bat.-", "pot.b~bat.+", "pot.w~adc.p"];

const at = (pos: number, v: number): ElectricCheck => ({
  kind: "voltage",
  at: { part: "adc", pin: "p" },
  min: Math.max(0, v - 0.15),
  max: v + 0.15,
  when: { settings: { pot: pos } },
});

export const lesson: Lesson = {
  id: "4-1",
  chapter: 4,
  title: "볼륨 노브",
  emoji: "🎚️",
  minutes: 15,
  client: {
    from: "소형 스피커 회사 ‘둥둥’",
    request:
      "블루투스 스피커에 볼륨 노브를 달아요. 스피커 칩의 입력 핀은 0~3V 전압을 읽어서 소리 크기를 정해요. 노브를 끝까지 내리면 0V, 끝까지 올리면 3V가 들어가게 해 주세요.",
    requirements: ["손잡이 0 % → 측정 핀 0 V", "손잡이 50 % → 1.5 V", "손잡이 100 % → 3 V (각 ±0.15 V)", "합선 없이"],
  },
  concepts: [
    {
      title: "0과 1 사이의 값: 아날로그",
      body:
        "지금까지 다룬 신호는 켜짐(1)과 꺼짐(0) 두 가지였다. 하지만 볼륨, 밝기, 온도는 그 사이 아무 값이나 된다. 이런 신호가 [[analog]]다. " +
        "MCU는 [[adc]]로 핀에 들어온 전압을 숫자로 바꿔 읽는다. 그러니 ‘노브 위치’를 ‘전압’으로 바꿔 주면 된다.",
    },
    {
      title: "저항 두 개로 전압 나누기",
      body:
        "저항 두 개를 [[series]]로 전지에 이으면, 그 사이 점의 전압은 두 저항의 비율로 정해진다: 가운데 전압 = 3V × 아래 저항 ÷ (위 + 아래). 이것이 [[voltage-divider]]다. " +
        "아래 저항이 클수록 가운데 전압이 높다. 0장 손전등 회로에서 배운 [[ohms-law]] 하나로 나온다.",
    },
    {
      title: "가변저항 = 비율을 손으로 바꾸는 분압기",
      body:
        "[[potentiometer]]는 핀이 셋이다. 양 끝 핀(a, b) 사이는 늘 같은 저항이고, 가운데 손잡이 핀(w)이 그 위를 미끄러진다. 손잡이 0 %면 손잡이 핀이 a 쪽 끝, 100 %면 b 쪽 끝에 붙는다. " +
        "양 끝을 전지 −와 +에 잇고 손잡이 핀을 측정 핀에 이으면 0 V부터 3 V까지 돌려 고를 수 있다. 실험 모드의 슬라이더로 직접 돌려 보자.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "볼륨 노브 분압기",
      goal: "[[potentiometer]]의 양 끝을 전지에, 손잡이 핀(w)을 측정 핀(IN)에 이으세요. 손잡이 0 %에서 0 V, 100 %에서 3 V가 되어야 해요. 실험 모드에서 슬라이더를 움직이고 측정 핀을 탭하면 전압이 보여요.",
      palette: [{ id: "pot", kind: "pot", label: "가변저항 10kΩ" }],
      preset: ckt(["bat:battery:3", "adc:probe"], []),
      checks: [at(0, 0), at(0.5, 1.5), at(1, 3), { kind: "noShort" }],
      reference: ckt(PARTS, OK),
      wrong: [
        ckt(PARTS, ["pot.a~bat.+", "pot.b~bat.-", "pot.w~adc.p"]), // 방향이 반대: 0 %에서 3 V
        ckt(PARTS, ["pot.a~bat.-", "pot.b~bat.+", "pot.a~adc.p"]), // 끝 핀을 재면 손잡이와 상관없이 0 V
        ckt(PARTS, ["pot.a~bat.-", "pot.w~adc.p"]), // b가 안 이어지면 손잡이 핀이 0 V에 머문다
      ],
      hint: "a → 전지 −, b → 전지 +, w(손잡이) → 측정 핀. 0 %에서 3 V가 나오면 a와 b를 바꿔 보세요.",
    },
  ],
  realWorld: [
    {
      title: "노브, 슬라이더, 조이스틱 속에는 가변저항",
      body:
        "오디오 볼륨 노브, 조명 밝기 슬라이더, 게임패드의 아날로그 스틱 안에는 대부분 가변저항이 들어 있다. MCU는 그 손잡이 핀 전압을 ADC로 읽는다. " +
        "가변저항은 오래 쓰면 표면이 닳아 소리가 지직거리기도 해서, 비싼 제품은 닳지 않는 회전 센서를 쓰기도 한다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "3 V 분압기에서 위 저항 2 kΩ, 아래 저항 1 kΩ이면 가운데 전압은 몇 V일까?",
      answer: 1,
      tolerance: 0.02,
      unit: "V",
      explain: "3 V × 1k ÷ (2k + 1k) = 1 V. 아래 저항이 전체의 1/3이라 전압도 1/3.",
    },
    {
      kind: "choice",
      q: "가변저항을 이었더니 손잡이를 0 %로 하면 3 V, 100 %로 하면 0 V가 나온다. 어떻게 고칠까?",
      choices: ["양 끝 핀(a, b)을 서로 바꿔 잇는다", "손잡이 핀을 전지 +에 잇는다", "저항을 하나 더 직렬로 단다"],
      answer: 0,
      explain: "방향만 반대다. 양 끝 핀을 바꾸면 손잡이가 움직이는 방향과 전압이 오르는 방향이 맞는다.",
    },
  ],
  glossary: ["analog", "adc", "voltage-divider", "potentiometer"],
};
