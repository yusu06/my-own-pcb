import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "door:button-nc", "lamp:lamp"];

export const lesson: Lesson = {
  id: "0-5",
  chapter: 0,
  title: "냉장고 실내등",
  emoji: "🧊",
  minutes: 8,
  client: {
    from: "가전 회사 ‘한빛가전’",
    request: "냉장고 문을 열면 켜지고, 닫으면 꺼지는 실내등 회로가 필요합니다.",
    requirements: ["문이 닫히면 문이 스위치를 누른다", "스위치가 눌리면(문 닫힘) 꺼지고, 떼어지면(문 열림) 켜질 것"],
  },
  concepts: [
    {
      title: "누르면 끊기는 스위치",
      body:
        "지금까지 쓴 버튼은 누르면 이어졌다. 반대로 평소에는 이어져 있다가 누르면 끊기는 스위치도 있다. " +
        "이것을 [[nc-switch]](NC, Normally Closed)라고 부른다.",
    },
    {
      title: "‘거꾸로’ = NOT",
      body:
        "입력이 1(눌림)이면 출력이 0(꺼짐), 입력이 0이면 출력이 1. 입력을 뒤집는 이 규칙을 NOT이라고 한다. " +
        "AND, OR와 함께 모든 디지털 회로의 기본 재료다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "냉장고 실내등 만들기",
      goal: "[[nc-switch]]를 [[lamp]]와 [[series]]로 연결하세요. ▶ 실험 모드에서 문 스위치를 누르고 있으면(문 닫힘) 꺼져야 해요.",
      palette: [
        { id: "door", kind: "button-nc", label: "문 스위치" },
        { id: "lamp", kind: "lamp", label: "실내등" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [{ kind: "truth", inputs: ["door"], output: "lamp", expect: [1, 0] }, { kind: "noShort" }],
      reference: ckt(P, ["bat.+~door.a", "door.b~lamp.a", "lamp.b~bat.-"]),
      wrong: [ckt(P, ["bat.+~lamp.a", "lamp.b~bat.-"])],
      hint: "0-1 손전등과 똑같이 한 줄로 이으면 돼요. 다른 점은 스위치 종류뿐이에요.",
    },
  ],
  realWorld: [
    {
      title: "문틀의 작은 버튼",
      body:
        "냉장고 문틀 안쪽을 보면 작은 버튼이 있다. 문이 닫히면 문이 이 버튼을 눌러 회로를 끊는다. " +
        "자동차 문 스위치, 세탁기 문 감지 등 ‘무엇이 닫혀 있는지’ 감지하는 곳에 이런 스위치가 아주 많이 쓰인다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "평상시 닫힘(NC) 스위치를 누르면?",
      choices: ["회로가 이어진다", "회로가 끊긴다", "아무 일도 없다"],
      answer: 1,
      explain: "[[nc-switch]]는 평소에 이어져 있고, 누르면 끊긴다.",
    },
    {
      kind: "choice",
      q: "입력을 뒤집는(1이면 0, 0이면 1) 규칙의 이름은?",
      choices: ["AND", "OR", "NOT"],
      answer: 2,
      explain: "NOT은 입력을 반대로 만든다. 냉장고 실내등은 ‘문이 닫혔다’의 NOT이다.",
    },
  ],
  glossary: ["nc-switch"],
};
