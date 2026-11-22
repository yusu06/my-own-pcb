import type { Lesson, PaletteItem } from "../types";
import { lckt } from "../lckt";

const NAND: PaletteItem = { id: "nand", kind: "nand", label: "NAND", multi: true };
const NOT: PaletteItem = { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true };
const AB = ["a:in", "b:in", "y:out"];

export const lesson: Lesson = {
  id: "1-1",
  chapter: 1,
  title: "전자레인지 인터록",
  emoji: "🔒",
  minutes: 15,
  client: {
    from: "가전 회사 ‘한빛가전’",
    request:
      "0-4에서 만든 가열 회로를 이제 칩으로 만들려고 합니다. 공장에 NAND 칩만 잔뜩 있어서, NAND만으로 필요한 게이트(NOT·AND·OR)를 만들어 주세요.",
    requirements: ["NAND만으로 NOT 만들기", "문 닫힘 AND 시작 → 가열 (인터록)", "비상정지 버튼 둘 중 하나라도 눌리면 정지 표시 (OR)"],
  },
  concepts: [
    {
      title: "NAND 하나로 다 된다",
      body:
        "[[nand]]는 ‘둘 다 1이면 0, 아니면 1’인 게이트다. 신기하게도 NAND만 여러 개 있으면 NOT, AND, OR를 포함한 모든 [[logic-gate]]를 만들 수 있다. " +
        "그래서 실제 칩 공장에서도 NAND를 기본 벽돌처럼 쓴다. 이 앱의 ‘부품 원가’도 NAND 몇 개가 들었는지로 센다.",
    },
    {
      title: "만든 회로는 부품이 된다",
      body:
        "과제를 통과하면 그 회로가 [[custom-part]]으로 저장된다. 다음 과제에서는 NAND 여러 개를 다시 그릴 필요 없이 ‘NOT’ 상자 하나로 꺼내 쓴다. " +
        "큰 회로를 작은 부품으로 나눠 만드는 이 방식을 ‘계층 설계’라고 부른다.",
    },
    {
      title: "선 색 읽기",
      body: "논리 회로에서는 선 색이 값을 보여 준다. 밝은 선 = 1, 흐린 선 = 0, 빨간 점선 = X(어디에도 연결되지 않아 값이 정해지지 않음).",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "① NAND로 NOT 만들기",
      goal: "NAND의 두 입력을 모두 같은 신호(a)에 이으면 어떻게 될까요? 입력 a를 뒤집어 y로 내보내세요. 통과하면 부품함에 NOT이 저장돼요.",
      palette: [NAND],
      preset: lckt(["a:in", "y:out"], []),
      inputs: ["a"],
      outputs: ["y"],
      expect: [[1], [0]],
      reference: lckt(["a:in", "y:out", "nand1:nand"], ["a.y~nand1.a", "a.y~nand1.b", "nand1.y~y.a"]),
      wrong: [lckt(["a:in", "y:out"], ["a.y~y.a"]), lckt(["a:in", "y:out", "nand1:nand"], ["a.y~nand1.a", "nand1.y~y.a"])],
      saveAs: "not",
      maxCost: 1,
      hint: "NAND의 a와 b를 둘 다 입력 a에 이으세요. 둘 다 1이면 0, 둘 다 0이면 1이 나와요.",
    },
    {
      kind: "logic",
      title: "② 인터록: AND 만들기",
      goal: "문이 닫혀 있고(a) 시작 버튼을 눌렀을 때(b)만 가열(y). NAND 결과를 방금 만든 NOT으로 뒤집으면 AND가 돼요. 통과하면 AND가 저장돼요.",
      palette: [NAND, NOT],
      preset: lckt(AB, []),
      inputs: ["a", "b"],
      outputs: ["y"],
      labels: { a: "문 닫힘", b: "시작", y: "가열" },
      expect: [[0], [0], [0], [1]],
      reference: lckt([...AB, "nand1:nand", "not1:chip:not"], ["a.y~nand1.a", "b.y~nand1.b", "nand1.y~not1.a", "not1.y~y.a"]),
      wrong: [lckt([...AB, "nand1:nand"], ["a.y~nand1.a", "b.y~nand1.b", "nand1.y~y.a"])],
      saveAs: "and",
      maxCost: 2,
      hint: "문 닫힘 → NAND a, 시작 → NAND b, NAND y → NOT a, NOT y → 가열.",
    },
    {
      kind: "logic",
      title: "③ 비상정지: OR 만들기",
      goal: "비상정지 버튼 1(a)이나 2(b) 중 하나라도 눌리면 정지 표시(y). 입력을 각각 NOT으로 뒤집은 뒤 NAND에 넣어 보세요. 통과하면 OR가 저장돼요.",
      palette: [NAND, NOT],
      preset: lckt(AB, []),
      inputs: ["a", "b"],
      outputs: ["y"],
      labels: { a: "비상정지 1", b: "비상정지 2", y: "정지 표시" },
      expect: [[0], [1], [1], [1]],
      reference: lckt(
        [...AB, "not1:chip:not", "not2:chip:not", "nand1:nand"],
        ["a.y~not1.a", "b.y~not2.a", "not1.y~nand1.a", "not2.y~nand1.b", "nand1.y~y.a"],
      ),
      wrong: [
        lckt([...AB, "nand1:nand", "not1:chip:not"], ["a.y~nand1.a", "b.y~nand1.b", "nand1.y~not1.a", "not1.y~y.a"]),
        lckt([...AB, "nand1:nand"], ["a.y~nand1.a", "b.y~nand1.b", "nand1.y~y.a"]),
      ],
      saveAs: "or",
      maxCost: 3,
      hint: "a → NOT → NAND a, b → NOT → NAND b, NAND y → 정지 표시. ‘둘 다 안 눌림’의 반대가 ‘하나라도 눌림’이에요.",
    },
  ],
  realWorld: [
    {
      title: "왜 NAND로 통일할까",
      body:
        "칩을 만들 때 게이트 종류가 적을수록 설계·검증·제조가 단순해진다. 그래서 디지털 칩의 기본 블록은 NAND(또는 NOR) 위주로 구성되는 경우가 많다. " +
        "[[interlock]] 같은 안전 기능은 이렇게 단순한 게이트 몇 개로 만들어, 프로그램과 상관없이 동작하게 한다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "NAND의 두 입력을 하나로 묶으면 무엇이 될까?",
      choices: ["AND", "NOT", "OR"],
      answer: 1,
      explain: "입력이 둘 다 같으니 ‘둘 다 1이면 0, 둘 다 0이면 1’ — 입력을 뒤집는 NOT이다.",
    },
    {
      kind: "number",
      q: "NAND로 만든 AND에는 NAND가 몇 개 들어갈까?",
      answer: 2,
      tolerance: 0.01,
      unit: "개",
      explain: "NAND 1개 + 결과를 뒤집는 NOT(NAND 1개) = 2개.",
    },
    {
      kind: "choice",
      q: "과제를 통과한 회로는 어떻게 될까?",
      choices: ["사라진다", "부품함에 부품으로 저장돼 다음 과제에서 쓸 수 있다", "인쇄된다"],
      answer: 1,
      explain: "[[custom-part]]으로 저장된다. 고쳐서 다시 통과하면 새 버전이 생긴다.",
    },
  ],
  glossary: ["nand", "custom-part", "interlock"],
};
