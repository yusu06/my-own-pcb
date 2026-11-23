import type { Lesson } from "../types";

const HEAD = "module alu(input [3:0] a, input [3:0] b, input [1:0] op, output [3:0] y, output zero);\n";
const alu = (y: string, zero = "  assign zero = (y == 4'd0);\n") => HEAD + y + zero + "endmodule\n";
const yOf = (pass: string, add: string, sub: string) => `  assign y = (op == 2'd0) ? ${pass} : (op == 2'd1) ? ${add} : (op == 2'd2) ? ${sub} : a;\n`;

/** op 0 = b 그대로, 1 = a + b, 2 = a − b, 3 = a 그대로 (4비트) */
const SPEC = (a: number, b: number, op: number) => [b, (a + b) & 15, (a - b) & 15, a][op];

export const lesson: Lesson = {
  id: "3-2",
  chapter: 3,
  title: "계산 담당: ALU",
  emoji: "🧮",
  minutes: 15,
  client: {
    from: "교구 회사 ‘셈셈’",
    request:
      "어린이 계산 장난감에 칩을 하나만 넣고 싶어요. 연산 번호(op)를 바꾸면 같은 칩이 더하기도 하고 빼기도 하게요. 결과가 0이면 웃는 얼굴 LED도 켜 주세요.",
    requirements: ["op 0: y = b", "op 1: y = a + b, op 2: y = a − b (4비트, 넘치면 버림)", "op 3: y = a", "zero = 1 ↔ y가 0"],
  },
  concepts: [
    {
      title: "연산 여러 개를 한 부품에",
      body:
        "1-10에서 4비트 덧셈·뺄셈기를, 1-8에서 MUX를 만들었다. 덧셈 결과, 뺄셈 결과, 그냥 통과한 값을 모두 만들어 두고 MUX로 하나를 고르면 ‘연산 번호로 골라 쓰는 계산기’가 된다. " +
        "이것이 [[alu]](산술 논리 장치)다. CPU가 하는 계산은 대부분 ALU를 거친다.",
    },
    {
      title: "4비트 넘침은 버린다",
      body:
        "4비트는 0~15까지다. 15 + 2 = 17은 5비트가 필요하니 위 자리를 버리고 1이 된다. 3 − 5도 아래로 넘어가 14(1110)가 된다. " +
        "Verilog에서 4비트 y에 a + b를 넣으면 이렇게 자동으로 잘린다.",
    },
    {
      title: "결과가 0인가: zero 플래그",
      body:
        "ALU는 결과 말고도 ‘결과가 0이었나’ 같은 사실을 1비트로 알려 준다. 이런 신호를 플래그라고 한다. 3-5에서 CPU는 이 정보로 ‘0이면 건너뛰기’ 명령을 만든다. " +
        "assign zero = (y == 4'd0); 한 줄이면 된다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "4비트 ALU",
      goal: "op에 따라 y = b / a + b / a − b / a 를 내고, y가 0이면 zero = 1로 하세요.",
      top: "alu",
      skeleton: HEAD + "  // assign y = (op == 2'd0) ? b : …;\n  assign y = 4'd0;\n  assign zero = 1'b0;\nendmodule\n",
      inputs: [
        { name: "a", width: 4 },
        { name: "b", width: 4 },
        { name: "op", width: 2 },
      ],
      outputs: [
        { name: "y", width: 4 },
        { name: "zero", width: 1 },
      ],
      labels: { op: "연산 op", zero: "0인가" },
      spec: ({ a, b, op }) => {
        const y = SPEC(a, b, op);
        return { y, zero: y === 0 ? 1 : 0 };
      },
      reference: alu(yOf("b", "a + b", "a - b")),
      wrong: [alu(yOf("b", "a - b", "a + b")), alu(yOf("b", "a + b", "a - b"), "  assign zero = (a == 4'd0);\n"), alu(yOf("a", "a + b", "a - b"))],
      hint: "assign y = (op == 2'd0) ? b : (op == 2'd1) ? a + b : (op == 2'd2) ? a - b : a;  assign zero = (y == 4'd0);",
    },
  ],
  realWorld: [
    {
      title: "실제 ALU의 플래그",
      body:
        "실제 CPU의 ALU는 zero 말고도 자리올림(carry), 음수(negative), 넘침(overflow) 플래그를 낸다. 많은 CPU에서 프로그램의 ‘크면’, ‘같으면’ 같은 비교는 빼기를 한 뒤 이 플래그를 보는 방식으로 돈다." +
        "연산 종류도 AND·OR·시프트 등 수십 가지지만 ‘여러 결과 중 op로 고른다’는 원리는 같다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "4비트 ALU에서 a = 12, b = 7로 더하면 y는?",
      answer: 3,
      tolerance: 0.01,
      unit: "",
      explain: "12 + 7 = 19. 4비트는 16을 넘으면 버리니 19 − 16 = 3.",
    },
    {
      kind: "choice",
      q: "ALU에서 여러 연산 결과 중 하나를 고르는 데 쓰는 부품은?",
      choices: ["MUX", "플립플롭", "분주기"],
      answer: 0,
      explain: "결과를 모두 계산해 두고, op를 선택 신호로 MUX가 하나를 고른다.",
    },
  ],
  glossary: ["alu"],
};
