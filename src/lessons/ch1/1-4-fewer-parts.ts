import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["a:in", "b:in", "c:in", "y:out"];

export const lesson: Lesson = {
  id: "1-4",
  chapter: 1,
  title: "부품 줄이기",
  emoji: "✂️",
  minutes: 12,
  client: {
    from: "난방기 회사 ‘따숨’",
    request:
      "보일러 제어 회로를 대량 생산합니다. 전 담당자가 ‘가동 = (전원 AND 온도 낮음) OR (전원 AND 예약 시간)’으로 만들었는데, 부품을 줄여서 원가를 낮춰 주세요. 동작은 그대로여야 합니다.",
    requirements: ["동작(진리표)은 전과 똑같을 것", "NAND 환산 5개 이하일 것"],
  },
  concepts: [
    {
      title: "불 대수: 식도 정리할 수 있다",
      body:
        "[[boolean-algebra]]에도 보통 수학처럼 규칙이 있다. 분배법칙: a·b + a·c = a·(b + c). (여기서 ·는 AND, +는 OR) " +
        "숫자 계산에서 2×3 + 2×4 = 2×(3+4)로 묶는 것과 같다.",
    },
    {
      title: "부품 수 = 원가",
      body:
        "같은 동작이면 부품이 적을수록 싸고, 작고, 고장 날 곳도 줄어든다. AND는 NAND 2개, OR는 3개, NOT은 1개다. " +
        "a·b + a·c는 AND 2개 + OR 1개 = 7개, a·(b + c)는 OR 1개 + AND 1개 = 5개.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "같은 동작, 더 적은 부품",
      goal: "가동(y) = (전원 AND 온도 낮음) OR (전원 AND 예약 시간)과 똑같이 동작하면서 NAND 환산 5개 이하로 만드세요.",
      palette: [
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["a", "b", "c"],
      outputs: ["y"],
      labels: { a: "전원", b: "온도 낮음", c: "예약 시간", y: "가동" },
      expect: [[0], [0], [0], [0], [0], [1], [1], [1]],
      reference: lckt([...IO, "or1:chip:or", "and1:chip:and"], ["b.y~or1.a", "c.y~or1.b", "a.y~and1.a", "or1.y~and1.b", "and1.y~y.a"]),
      wrong: [
        lckt(
          [...IO, "and1:chip:and", "and2:chip:and", "or1:chip:or"],
          ["a.y~and1.a", "b.y~and1.b", "a.y~and2.a", "c.y~and2.b", "and1.y~or1.a", "and2.y~or1.b", "or1.y~y.a"],
        ),
        lckt([...IO, "and1:chip:and"], ["a.y~and1.a", "b.y~and1.b", "and1.y~y.a"]),
      ],
      maxCost: 5,
      costRequired: true,
      hint: "분배법칙으로 묶으면 전원 AND (온도 낮음 OR 예약 시간). OR 1개 + AND 1개.",
    },
  ],
  realWorld: [
    {
      title: "몇 원이 수만 대가 되면",
      body:
        "부품 하나에 몇십 원이라도 수만 대를 만들면 큰돈이 된다. 그래서 의뢰를 받으면 ‘동작은 같게, 부품은 적게’가 늘 중요한 목표다. " +
        "요즘은 설계 도구가 식 정리를 자동으로 해 주지만, 원리를 알아야 도구가 만든 결과를 검토할 수 있다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "a·b + a·c 를 분배법칙으로 정리하면?",
      choices: ["a·(b + c)", "(a + b)·c", "a + b + c"],
      answer: 0,
      explain: "공통인 a를 밖으로 묶는다: a·(b + c).",
    },
    {
      kind: "number",
      q: "이 앱 기준으로 AND 2개 + OR 1개는 NAND 몇 개?",
      answer: 7,
      tolerance: 0.01,
      unit: "개",
      explain: "AND 2개 × 2 + OR 1개 × 3 = 7.",
    },
  ],
  glossary: ["boolean-algebra"],
};
