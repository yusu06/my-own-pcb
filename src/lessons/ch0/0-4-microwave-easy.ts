import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "door:switch", "start:button", "heater:lamp"];

export const lesson: Lesson = {
  id: "0-4",
  chapter: 0,
  title: "전자레인지 (쉬운 판)",
  emoji: "🍳",
  minutes: 10,
  client: {
    from: "가전 회사 ‘한빛가전’",
    request: "문이 닫혀 있고 시작 버튼을 눌렀을 때만 가열 표시등이 켜지는 회로가 필요합니다.",
    requirements: ["문이 열려 있으면 버튼을 눌러도 절대 켜지지 않을 것", "문이 닫혀 있어도 버튼을 안 누르면 꺼져 있을 것"],
  },
  concepts: [
    {
      title: "한 줄로 잇기: 직렬",
      body:
        "부품을 한 줄로 이어 붙인 연결을 [[series]]라고 한다. [[current]]는 모든 부품을 차례로 지나가야 하므로, " +
        "스위치 중 하나라도 끊겨 있으면 전체가 끊긴다.",
    },
    {
      title: "‘둘 다 참이어야’ = AND",
      body:
        "스위치 두 개를 [[series]]로 놓으면 ‘문이 닫혔고(AND) 버튼을 눌렀으면 켜짐’이 된다. " +
        "이것이 논리의 AND다. 0-3의 OR와 짝을 이루는 기본 규칙이다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "가열 표시등 회로 만들기",
      goal: "‘문 닫힘’ 스위치와 ‘시작’ 버튼을 [[series]]로 연결해서, 둘 다 눌렸을 때만 가열 표시등이 켜지게 하세요.",
      palette: [
        { id: "door", kind: "switch", label: "문 닫힘" },
        { id: "start", kind: "button", label: "시작" },
        { id: "heater", kind: "lamp", label: "가열 표시등" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [{ kind: "truth", inputs: ["door", "start"], output: "heater", expect: [0, 0, 0, 1] }, { kind: "noShort" }],
      reference: ckt(P, ["bat.+~door.a", "door.b~start.a", "start.b~heater.a", "heater.b~bat.-"]),
      wrong: [ckt(P, ["bat.+~door.a", "bat.+~start.a", "door.b~heater.a", "start.b~heater.a", "heater.b~bat.-"])],
      hint: "전지 + → 문 닫힘 스위치 → 시작 버튼 → 가열 표시등 → 전지 −. 모두 한 줄로!",
    },
  ],
  realWorld: [
    {
      title: "안전은 하드웨어로",
      body:
        "실제 전자레인지는 문이 열리면 전자파가 새어 나올 수 있어서, 문에 달린 여러 개의 스위치가 가열 회로와 [[series]]로 연결돼 있다. " +
        "프로그램이 고장 나도 문이 열리면 전기가 물리적으로 끊긴다. 이렇게 고장 나도 안전한 쪽으로 멈추게 하는 설계를 ‘페일세이프’라고 한다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "스위치 두 개를 직렬로 연결하면 어떤 규칙이 될까?",
      choices: ["둘 다 켜져야 켜짐 (AND)", "하나라도 켜지면 켜짐 (OR)", "항상 켜짐"],
      answer: 0,
      explain: "[[series]]는 길이 하나뿐이라 모든 스위치가 이어져야 전류가 흐른다.",
    },
    {
      kind: "choice",
      q: "전자레인지 문 안전 장치를 프로그램이 아니라 스위치로 만드는 이유는?",
      choices: ["더 싸서", "프로그램이 고장 나도 문이 열리면 확실히 꺼지게 하려고", "더 빨리 데우려고"],
      answer: 1,
      explain: "생명과 안전에 관한 기능은 소프트웨어가 멈춰도 동작하도록 하드웨어로 만든다(페일세이프).",
    },
  ],
  glossary: ["series"],
};
