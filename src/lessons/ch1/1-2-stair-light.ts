import type { Lesson } from "../types";
import { lckt } from "../lckt";

const AB = ["a:in", "b:in", "y:out"];

export const lesson: Lesson = {
  id: "1-2",
  chapter: 1,
  title: "계단 조명",
  emoji: "🪜",
  minutes: 12,
  client: {
    from: "인테리어 회사 ‘새집공방’",
    request: "계단 아래와 위에 스위치가 하나씩 있습니다. 어느 쪽 스위치를 바꿔도 전등이 켜졌다 꺼졌다 하게 해 주세요.",
    requirements: ["두 스위치가 같은 상태면 꺼짐", "두 스위치가 다른 상태면 켜짐", "가능하면 NAND 4개 이하로 (⭐)"],
  },
  concepts: [
    {
      title: "진리표부터 쓴다",
      body:
        "회로를 그리기 전에 [[truth-table]]부터 쓰면 헷갈리지 않는다. 아래(a)·위(b) 스위치: 00 → 꺼짐, 01 → 켜짐, 10 → 켜짐, 11 → 꺼짐. " +
        "어느 한쪽을 바꾸면 결과가 항상 뒤집힌다.",
    },
    {
      title: "‘서로 다르면 1’ = XOR",
      body:
        "이 규칙에는 이름이 있다: [[xor]]. OR와 비슷하지만 둘 다 1일 때는 0이다. " +
        "식으로 쓰면 (a AND NOT b) OR (NOT a AND b). 부품함의 NOT·AND·OR로 그대로 만들 수 있고, NAND만 4개로 더 싸게 만드는 방법도 있다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "XOR 만들기",
      goal: "두 스위치가 서로 다를 때만 전등(y)이 켜지게 하세요. 부품함의 NOT·AND·OR를 써도 되고, NAND만 4개로 도전해도 돼요(⭐). 통과하면 XOR가 저장돼요.",
      palette: [
        { id: "nand", kind: "nand", label: "NAND", multi: true },
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(AB, []),
      inputs: ["a", "b"],
      outputs: ["y"],
      labels: { a: "아래 스위치", b: "위 스위치", y: "계단 전등" },
      expect: [[0], [1], [1], [0]],
      reference: lckt(
        [...AB, "nand1:nand", "nand2:nand", "nand3:nand", "nand4:nand"],
        ["a.y~nand1.a", "b.y~nand1.b", "a.y~nand2.a", "nand1.y~nand2.b", "nand1.y~nand3.a", "b.y~nand3.b", "nand2.y~nand4.a", "nand3.y~nand4.b", "nand4.y~y.a"],
      ),
      wrong: [
        lckt([...AB, "or1:chip:or"], ["a.y~or1.a", "b.y~or1.b", "or1.y~y.a"]),
        lckt([...AB, "and1:chip:and"], ["a.y~and1.a", "b.y~and1.b", "and1.y~y.a"]),
      ],
      saveAs: "xor",
      maxCost: 4,
      hint: "쉬운 길: NOT 2개, AND 2개, OR 1개로 (a AND NOT b) OR (NOT a AND b). ⭐ 길: n1 = NAND(a,b), n2 = NAND(a,n1), n3 = NAND(n1,b), y = NAND(n2,n3).",
    },
  ],
  realWorld: [
    {
      title: "3로 스위치",
      body:
        "실제 계단·복도 조명은 ‘3로 스위치’ 두 개를 특별하게 배선해서 같은 동작을 만든다. 전선 배치만으로 XOR를 구현한 셈이다. " +
        "디지털 회로에서 XOR는 덧셈기(1-9), 오류 검출(패리티) 등 아주 많은 곳에 쓰인다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "XOR의 출력이 1이 되는 경우는?",
      choices: ["두 입력이 같을 때", "두 입력이 다를 때", "두 입력이 모두 1일 때"],
      answer: 1,
      explain: "[[xor]]는 ‘서로 다르면 1’이다.",
    },
    {
      kind: "number",
      q: "입력이 2개인 회로의 진리표는 몇 줄일까?",
      answer: 4,
      tolerance: 0.01,
      unit: "줄",
      explain: "입력마다 0/1 두 가지라 2 × 2 = 4줄. 입력이 3개면 8줄이다.",
    },
  ],
  glossary: ["truth-table", "xor"],
};
