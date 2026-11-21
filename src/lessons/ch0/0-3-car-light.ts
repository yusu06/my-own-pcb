import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "d1:switch", "d2:switch", "lamp:lamp"];

export const lesson: Lesson = {
  id: "0-3",
  chapter: 0,
  title: "자동차 실내등",
  emoji: "🚗",
  minutes: 10,
  client: {
    from: "자동차 부품 회사 ‘한길모터스’",
    request: "앞문이나 뒷문 중 하나라도 열리면 실내등이 켜지는 회로가 필요합니다.",
    requirements: ["앞문만 열려도 켜질 것", "뒷문만 열려도 켜질 것", "둘 다 닫혀 있을 때만 꺼질 것"],
  },
  concepts: [
    {
      title: "길이 여러 개인 연결: 병렬",
      body:
        "부품을 나란히 이어서 [[current]]가 지나갈 길을 여러 개 만드는 연결을 [[parallel]]이라고 한다. " +
        "길 중 하나만 열려 있어도 전류는 그 길로 흐른다.",
    },
    {
      title: "‘하나라도 참이면’ = OR",
      body:
        "스위치 두 개를 [[parallel]]로 놓으면 ‘앞문이 열렸거나(OR) 뒷문이 열렸으면 켜짐’이 된다. " +
        "이런 규칙을 논리에서는 OR라고 부른다. 나중에 배울 [[logic-gate]]의 OR와 같은 동작이다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "실내등 회로 만들기",
      goal: "‘앞문 열림’, ‘뒷문 열림’ 스위치를 [[parallel]]로 연결해서, 둘 중 하나만 켜져도 [[lamp]]가 켜지게 하세요. ▶ 실험 모드에서 스위치를 탭해 확인해 보세요.",
      palette: [
        { id: "d1", kind: "switch", label: "앞문 열림" },
        { id: "d2", kind: "switch", label: "뒷문 열림" },
        { id: "lamp", kind: "lamp", label: "실내등" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [{ kind: "truth", inputs: ["d1", "d2"], output: "lamp", expect: [0, 1, 1, 1] }, { kind: "noShort" }],
      reference: ckt(P, ["bat.+~d1.a", "bat.+~d2.a", "d1.b~lamp.a", "d2.b~lamp.a", "lamp.b~bat.-"]),
      wrong: [ckt(P, ["bat.+~d1.a", "d1.b~d2.a", "d2.b~lamp.a", "lamp.b~bat.-"])],
      hint: "두 스위치의 왼쪽 핀을 모두 전지 +에, 오른쪽 핀을 모두 실내등 한쪽에 이으세요. 실내등 다른 쪽은 전지 −로.",
    },
  ],
  realWorld: [
    {
      title: "문마다 하나씩 있는 문 스위치",
      body:
        "자동차 문틀에는 문이 열리면 튀어나오는 작은 스위치가 있다. 문이 여러 개라도 실내등은 하나이므로 " +
        "문 스위치들이 [[parallel]]로 연결돼 있다. 어느 문이든 열리면 실내등 회로가 이어진다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "스위치 두 개를 병렬로 연결하면 어떤 규칙이 될까?",
      choices: ["둘 다 켜져야 켜짐 (AND)", "하나라도 켜지면 켜짐 (OR)", "켜면 꺼짐 (NOT)"],
      answer: 1,
      explain: "[[parallel]]은 길이 여러 개라서 하나만 이어져도 전류가 흐른다. 이것이 OR이다.",
    },
    {
      kind: "choice",
      q: "이 회로에서 실내등이 꺼지는 경우는?",
      choices: ["앞문만 열렸을 때", "두 문이 모두 닫혔을 때", "두 문이 모두 열렸을 때"],
      answer: 1,
      explain: "OR는 입력이 모두 0일 때만 출력이 0이다.",
    },
  ],
  glossary: ["parallel", "logic-gate"],
};
