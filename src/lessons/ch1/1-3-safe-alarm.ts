import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["d:in", "v:in", "k:in", "y:out"];

export const lesson: Lesson = {
  id: "1-3",
  chapter: 1,
  title: "금고 경보기",
  emoji: "🚨",
  minutes: 14,
  client: {
    from: "보안 회사 ‘든든시큐리티’",
    request:
      "금고 경보기 회로가 필요합니다. 동작 규칙은 아래 진리표로 정리했습니다. (d = 문 열림, v = 진동 감지, k = 해제 키) " +
      "d v k → 경보: 000→0, 001→0, 010→1, 011→0, 100→1, 101→0, 110→1, 111→0",
    requirements: ["진리표와 똑같이 동작할 것", "해제 키가 꽂혀 있으면 절대 울리지 않을 것"],
  },
  concepts: [
    {
      title: "진리표에서 식 세우기: 곱의 합",
      body:
        "[[sop]] 방법: 출력이 1인 줄만 골라, 각 줄을 AND 식으로 쓴다(0인 입력은 NOT을 붙임). 그 식들을 모두 OR로 묶으면 끝. " +
        "예: 010 → (NOT d AND v AND NOT k). 이렇게 하면 어떤 진리표든 회로로 바꿀 수 있다.",
    },
    {
      title: "식을 말로 읽어 보기",
      body:
        "1이 되는 줄을 보면 k는 항상 0이고, d나 v 중 하나 이상이 1이다. 그래서 식을 짧게 쓰면: 경보 = (d OR v) AND NOT k. " +
        "곱의 합으로 길게 만든 회로와 결과는 같지만 부품이 훨씬 적다. 이렇게 줄이는 방법은 1-4에서 더 배운다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "경보기 회로 만들기",
      goal: "의뢰서의 [[truth-table]]과 똑같이 동작하는 회로를 부품함의 NOT·AND·OR로 만드세요.",
      palette: [
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["d", "v", "k"],
      outputs: ["y"],
      labels: { d: "문 열림", v: "진동", k: "해제 키", y: "경보" },
      expect: [[0], [0], [1], [0], [1], [0], [1], [0]],
      reference: lckt(
        [...IO, "or1:chip:or", "not1:chip:not", "and1:chip:and"],
        ["d.y~or1.a", "v.y~or1.b", "k.y~not1.a", "or1.y~and1.a", "not1.y~and1.b", "and1.y~y.a"],
      ),
      wrong: [
        lckt([...IO, "or1:chip:or"], ["d.y~or1.a", "v.y~or1.b", "or1.y~y.a"]),
        lckt(
          [...IO, "and2:chip:and", "not1:chip:not", "and1:chip:and"],
          ["d.y~and2.a", "v.y~and2.b", "k.y~not1.a", "and2.y~and1.a", "not1.y~and1.b", "and1.y~y.a"],
        ),
      ],
      hint: "경보 = (문 열림 OR 진동) AND (NOT 해제 키). OR 1개, NOT 1개, AND 1개면 돼요.",
    },
  ],
  realWorld: [
    {
      title: "요구사항 → 진리표 → 회로",
      body:
        "실제 의뢰도 대부분 말로 온다. ‘이럴 때 울리고, 저럴 때는 울리면 안 돼요’. 엔지니어는 이것을 먼저 진리표로 정리해 고객과 확인한 뒤 회로를 만든다. " +
        "진리표가 맞으면 회로가 틀릴 수는 있어도 요구사항을 오해할 일은 줄어든다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "곱의 합 방법에서 사용하는 줄은?",
      choices: ["출력이 0인 줄", "출력이 1인 줄", "모든 줄"],
      answer: 1,
      explain: "출력이 1인 줄마다 AND 식을 만들고 OR로 묶는다.",
    },
    {
      kind: "number",
      q: "입력이 3개인 회로의 진리표는 몇 줄일까?",
      answer: 8,
      tolerance: 0.01,
      unit: "줄",
      explain: "2 × 2 × 2 = 8줄.",
    },
  ],
  glossary: ["sop"],
};
