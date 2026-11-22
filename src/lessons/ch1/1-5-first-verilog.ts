import type { Lesson } from "../types";
import { lckt } from "../lckt";

const ABC = ["a:in", "b:in", "c:in", "y:out"];
const IN3 = [
  { name: "a", width: 1 },
  { name: "b", width: 1 },
  { name: "c", width: 1 },
];
const Y = [{ name: "y", width: 1 }];
const LABELS = { a: "문 열림", b: "야간 모드", c: "비상 버튼", y: "경보" };

export const lesson: Lesson = {
  id: "1-5",
  chapter: 1,
  title: "첫 Verilog",
  emoji: "⌨️",
  minutes: 15,
  client: {
    from: "창고 관리 회사 ‘든든창고’",
    request:
      "야간 모드일 때 문이 열리면 경보가 울리고, 비상 버튼은 언제든 경보를 울리게 해 주세요. 앞으로 회로가 커질 테니 그림과 함께 ‘글로 쓴 회로’도 남겨 주세요.",
    requirements: ["경보 = (문 열림 AND 야간 모드) OR 비상 버튼", "부품함 부품으로 그리기", "같은 회로를 Verilog로 쓰기"],
  },
  concepts: [
    {
      title: "회로를 글로 쓰기",
      body:
        "게이트가 수십·수백 개가 되면 하나씩 그리기 어렵다. 그래서 실제 설계자는 [[hdl]]로 회로를 글로 쓴다. 이 앱에서 쓰는 것은 그중 가장 많이 쓰이는 Verilog다. " +
        "프로그램처럼 생겼지만 ‘차례로 실행할 명령’이 아니라 ‘무엇이 무엇과 연결되는지’를 적는다는 점이 다르다.",
    },
    {
      title: "module = 입출력이 있는 상자",
      body:
        "Verilog 회로 한 덩어리를 [[module]]이라고 한다. module alarm(input a, input b, input c, output y); 로 시작해 endmodule로 끝난다. " +
        "괄호 안은 상자의 핀(포트) 목록이다. 이 앱에서는 뼈대 코드가 미리 주어지니 포트 이름은 바꾸지 말고 가운데만 채우면 된다.",
    },
    {
      title: "assign과 게이트 기호",
      body:
        "assign y = a & b; 는 ‘y는 항상 a AND b와 연결돼 있다’는 뜻이다. 기호: & = AND, | = OR, ^ = XOR, ~ = NOT. " +
        "괄호로 묶는 순서를 정할 수 있고, 문장 끝에는 세미콜론(;)을 꼭 붙인다. 폰에서는 편집기 아래 기호 버튼을 쓰면 편하다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "경보 회로 그리기",
      goal: "부품함의 AND·OR로 경보 회로를 그리세요. 경보 = (문 열림 AND 야간 모드) OR 비상 버튼.",
      palette: [
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(ABC, []),
      inputs: ["a", "b", "c"],
      outputs: ["y"],
      labels: LABELS,
      expect: [[0], [1], [0], [1], [0], [1], [1], [1]],
      reference: lckt([...ABC, "and1:chip:and", "or1:chip:or"], ["a.y~and1.a", "b.y~and1.b", "and1.y~or1.a", "c.y~or1.b", "or1.y~y.a"]),
      wrong: [
        lckt([...ABC, "and1:chip:and"], ["a.y~and1.a", "b.y~and1.b", "and1.y~y.a"]),
        lckt([...ABC, "or1:chip:or"], ["a.y~or1.a", "c.y~or1.b", "or1.y~y.a"]),
      ],
      hint: "AND 하나에 문 열림·야간 모드를 넣고, 그 출력과 비상 버튼을 OR에 넣어요.",
    },
    {
      kind: "verilog",
      title: "같은 회로를 Verilog로",
      goal: "방금 그린 경보 회로를 assign 한 줄로 쓰세요. 다 쓰면 🧪 테스트 실행(PC는 Ctrl+Enter).",
      top: "alarm",
      skeleton: "module alarm(input a, input b, input c, output y);\n  // 여기에 assign 한 줄을 써 보세요\n\nendmodule\n",
      inputs: IN3,
      outputs: Y,
      labels: LABELS,
      spec: ({ a, b, c }) => ({ y: (a & b) | c }),
      reference: "module alarm(input a, input b, input c, output y);\n  assign y = (a & b) | c;\nendmodule\n",
      wrong: [
        "module alarm(input a, input b, input c, output y);\n  assign y = a & (b | c);\nendmodule\n",
        "module alarm(input a, input b, input c, output y);\n  assign y = a | b | c;\nendmodule\n",
      ],
      hint: "assign y = (a & b) | c; — 괄호 안이 먼저 계산돼요. 줄 끝의 세미콜론(;)을 잊지 마세요.",
    },
    {
      kind: "verilog",
      title: "계단 조명을 Verilog로",
      goal: "1-2의 계단 조명(두 스위치가 다르면 켜짐)을 Verilog로 쓰세요. ^ 한 글자로도 되고, & | ~로 풀어 써도 돼요.",
      top: "stair",
      skeleton: "module stair(input a, input b, output y);\n\nendmodule\n",
      inputs: [
        { name: "a", width: 1 },
        { name: "b", width: 1 },
      ],
      outputs: Y,
      labels: { a: "아래 스위치", b: "위 스위치", y: "전등" },
      spec: ({ a, b }) => ({ y: a ^ b }),
      reference: "module stair(input a, input b, output y);\n  assign y = (a & ~b) | (~a & b);\nendmodule\n",
      wrong: ["module stair(input a, input b, output y);\n  assign y = a | b;\nendmodule\n", "module stair(input a, input b, output y);\n  assign y = ~(a & b);\nendmodule\n"],
      hint: "assign y = a ^ b; 또는 assign y = (a & ~b) | (~a & b);",
    },
  ],
  realWorld: [
    {
      title: "글로 쓴 회로가 칩이 되기까지",
      body:
        "회사에서는 Verilog로 쓴 회로를 ‘합성’ 도구에 넣는다. 도구가 글을 실제 게이트 연결로 바꿔 주고, 그 결과를 [[fpga]]에 넣어 바로 돌려 보거나 공장에 보내 칩(ASIC)으로 만든다. " +
        "그래서 하드웨어 엔지니어 채용 공고에 Verilog가 거의 항상 들어 있다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "assign y = a | b; 에서 | 는 어떤 게이트일까?",
      choices: ["AND", "OR", "XOR", "NOT"],
      answer: 1,
      explain: "& = AND, | = OR, ^ = XOR, ~ = NOT.",
    },
    {
      kind: "choice",
      q: "Verilog 문장 끝에 꼭 붙여야 하는 기호는?",
      choices: ["세미콜론 ;", "콜론 :", "마침표 ."],
      answer: 0,
      explain: "빠뜨리면 ‘세미콜론(;)이 빠졌어요’ 오류가 나요. 가장 흔한 실수다.",
    },
    {
      kind: "choice",
      q: "Verilog가 일반 프로그래밍 언어와 가장 다른 점은?",
      choices: ["영어로 쓴다", "명령의 순서가 아니라 연결을 적는다", "숫자를 쓸 수 없다"],
      answer: 1,
      explain: "[[hdl]]은 회로의 연결을 적는다. assign 문 여러 개는 순서와 상관없이 동시에 성립한다.",
    },
  ],
  glossary: ["hdl", "module", "fpga"],
};
