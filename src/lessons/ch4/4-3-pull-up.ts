import { ckt } from "../../sim/electric/ckt";
import type { Lesson } from "../types";

const parts = (r: number) => ["bat:battery:3", "in:probe", "btn:button", `r:resistor:${r}`];
const PULL_UP = ["r.a~bat.+", "r.b~in.p", "in.p~btn.a", "btn.b~bat.-"];
const IN = { part: "in", pin: "p" };

export const lesson: Lesson = {
  id: "4-3",
  chapter: 4,
  title: "풀업과 풀다운",
  emoji: "🔼",
  minutes: 15,
  client: {
    from: "도어벨 회사 ‘딩동’",
    request:
      "무선 초인종 칩의 입력 핀에 버튼을 달았는데, 아무도 안 눌렀는데도 가끔 벨이 혼자 울려요. 버튼을 안 누를 때는 확실히 3V, 누를 때는 확실히 0V가 되게 고쳐 주세요. 배터리가 빨리 닳으면 안 돼요.",
    requirements: ["안 누름 → 측정 핀 2.7~3 V", "누름 → 0~0.3 V", "누를 때 버튼 전류 1 mA 이하", "합선 없이"],
  },
  concepts: [
    {
      title: "아무 데도 안 이어진 핀은 제멋대로",
      body:
        "버튼 한쪽을 입력 핀에, 다른 쪽을 −에 이으면 누를 때는 0 V다. 그런데 안 누를 때 입력 핀은 어디에도 이어지지 않는다. 이런 [[floating]]은 전압이 정해지지 않아서, 손이나 근처 전선의 잡음만으로 0과 1 사이를 오간다. " +
        "초인종이 혼자 울린 이유다. 실험 모드에서 그런 핀을 탭하면 ‘? V’로 보인다.",
    },
    {
      title: "저항 하나로 기본값 정하기",
      body:
        "입력 핀을 저항으로 +에 이어 두면, 안 누를 때는 저항을 통해 3 V가 된다. 이것이 [[pull-up]]이다. 버튼을 누르면 핀이 −에 바로 이어져 0 V가 된다. 입력 핀은 전류를 거의 안 먹으니 저항에 전압이 거의 걸리지 않는다. " +
        "반대로 저항을 −에, 버튼을 +에 달면 [[pull-down]]이다(안 누름 0 V, 누름 3 V).",
    },
    {
      title: "저항값: 너무 작으면 전지 낭비",
      body:
        "버튼을 누르고 있는 동안 전류는 + → 풀업 저항 → 버튼 → −로 흐른다. 저항이 10 Ω이면 [[ohms-law]]로 0.3 A나 흘러 전지가 금방 닳는다. 10 kΩ이면 0.3 mA뿐이다. " +
        "그래서 풀업은 보통 수 kΩ~수십 kΩ을 쓴다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "초인종 입력 고치기",
      goal: "[[pull-up]] 저항과 버튼으로 측정 핀(IN)이 안 누를 때 3 V, 누를 때 0 V가 되게 하세요. 저항을 길게 누르면 값을 바꿀 수 있어요.",
      palette: [
        { id: "btn", kind: "button", label: "버튼" },
        { id: "r", kind: "resistor", label: "저항", values: [10, 10000] },
      ],
      preset: ckt(["bat:battery:3", "in:probe"], []),
      checks: [
        { kind: "voltage", at: IN, min: 2.7, max: 3, when: {} },
        { kind: "voltage", at: IN, min: 0, max: 0.3, when: { pressed: { btn: true } } },
        { kind: "current", part: "btn", min: 0, max: 0.001, when: { pressed: { btn: true } } },
        { kind: "noShort" },
      ],
      reference: ckt(parts(10000), PULL_UP),
      wrong: [
        ckt(parts(10000), ["in.p~btn.a", "btn.b~bat.-"]), // 저항 없음: 안 누를 때 떠 있음
        ckt(parts(10), PULL_UP), // 10 Ω: 누를 때 0.3 A
        ckt(parts(10000), ["r.a~bat.-", "r.b~in.p", "in.p~btn.a", "btn.b~bat.+"]), // 풀다운: 동작이 반대
      ],
      hint: "전지 + → 10kΩ → 측정 핀, 측정 핀 → 버튼 → 전지 −.",
    },
  ],
  realWorld: [
    {
      title: "MCU 안에도 풀업이 들어 있다",
      body:
        "대부분의 MCU는 입력 핀마다 수십 kΩ짜리 풀업(또는 풀다운) 저항을 칩 안에 갖고 있어서, 펌웨어 설정 한 줄로 켤 수 있다. 5장에서 버튼을 읽을 때 ‘INPUT_PULLUP’ 같은 설정이 바로 이것이다. " +
        "그래도 선이 길거나 잡음이 많은 곳에서는 더 작은 외부 저항을 따로 달기도 한다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "풀업 저항이 달린 버튼 입력에서, 버튼을 누르면 입력 핀은?",
      choices: ["0 V(낮음)", "3 V(높음)", "정해지지 않음"],
      answer: 0,
      explain: "누르면 핀이 −에 바로 이어진다. 그래서 풀업 버튼은 ‘누르면 0’인 액티브 로우가 된다.",
    },
    {
      kind: "number",
      q: "3 V에 풀업 저항 10 kΩ을 달았다. 버튼을 누르고 있는 동안 흐르는 전류는 몇 mA일까?",
      answer: 0.3,
      tolerance: 0.05,
      unit: "mA",
      explain: "I = V ÷ R = 3 V ÷ 10 000 Ω = 0.0003 A = 0.3 mA.",
    },
  ],
  glossary: ["floating", "pull-up", "pull-down"],
};
