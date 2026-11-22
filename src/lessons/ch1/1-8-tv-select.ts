import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["a:in", "b:in", "s:in", "y:out"];
const HEAD = "module tv_select(input a, input b, input c, input d, input [1:0] sel, output reg y);\n";
const caseBody = (arms: string) => HEAD + "  always @(*) begin\n    case (sel)\n" + arms + "    endcase\n  end\nendmodule\n";

export const lesson: Lesson = {
  id: "1-8",
  chapter: 1,
  title: "TV 입력 선택",
  emoji: "📺",
  minutes: 15,
  client: {
    from: "모니터 회사 ‘선명전자’",
    request:
      "모니터에 영상 입력이 여러 개 있습니다. 리모컨 선택 신호에 따라 그중 하나만 화면으로 보내는 회로를 만들어 주세요. 우선 2개짜리, 그다음 4개짜리가 필요합니다.",
    requirements: ["2:1 — 선택 s가 0이면 A, 1이면 B", "4:1 — 2비트 sel로 a·b·c·d 중 하나", "2:1은 부품함에 저장해 두기"],
  },
  concepts: [
    {
      title: "길을 골라 주는 회로: MUX",
      body:
        "[[mux]](멀티플렉서)는 입력 여러 개 중 하나를 골라 출력으로 보내는 회로다. 철도의 선로 전환기처럼 선택 신호 s가 어느 길을 열지 정한다. " +
        "2:1 MUX의 식: y = (a AND NOT s) OR (b AND s). s가 0이면 앞쪽 AND만 살아서 a가, 1이면 b가 나온다.",
    },
    {
      title: "NAND 4개로 줄이기",
      body:
        "위 식을 NOT·AND·OR로 그리면 NAND 환산 원가가 꽤 나온다. 1-4에서 본 것처럼 AND-OR 모양은 NAND-NAND로 바꿀 수 있다: " +
        "ns = NAND(s, s), n1 = NAND(a, ns), n2 = NAND(b, s), y = NAND(n1, n2). NAND 4개면 된다.",
    },
    {
      title: "Verilog: ?:와 case",
      body:
        "2:1 MUX는 Verilog로 assign y = s ? b : a; 한 줄이다(조건 ? 참일 때 : 거짓일 때). " +
        "입력이 4개면 2비트 선택 신호 sel로 case를 쓴다: 2'd0이면 a, 2'd1이면 b … 이렇게 표처럼 쓰면 실수가 적다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "2:1 MUX 그리기",
      goal: "선택(s)이 0이면 입력 A, 1이면 입력 B가 화면(y)으로 가게 하세요. NAND 4개 이하면 ⭐. 통과하면 MUX가 부품함에 저장돼요.",
      palette: [
        { id: "nand", kind: "nand", label: "NAND", multi: true },
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["a", "b", "s"],
      outputs: ["y"],
      labels: { a: "입력 A", b: "입력 B", s: "선택", y: "화면" },
      expect: [[0], [0], [0], [1], [1], [0], [1], [1]],
      reference: lckt(
        [...IO, "nand1:nand", "nand2:nand", "nand3:nand", "nand4:nand"],
        ["s.y~nand1.a", "s.y~nand1.b", "a.y~nand2.a", "nand1.y~nand2.b", "b.y~nand3.a", "s.y~nand3.b", "nand2.y~nand4.a", "nand3.y~nand4.b", "nand4.y~y.a"],
      ),
      wrong: [
        // 선택이 반대
        lckt(
          [...IO, "nand1:nand", "nand2:nand", "nand3:nand", "nand4:nand"],
          ["s.y~nand1.a", "s.y~nand1.b", "a.y~nand2.a", "s.y~nand2.b", "b.y~nand3.a", "nand1.y~nand3.b", "nand2.y~nand4.a", "nand3.y~nand4.b", "nand4.y~y.a"],
        ),
        lckt([...IO, "or1:chip:or"], ["a.y~or1.a", "b.y~or1.b", "or1.y~y.a"]),
      ],
      saveAs: "mux",
      maxCost: 4,
      hint: "쉬운 길: NOT 1, AND 2, OR 1로 (a AND NOT s) OR (b AND s). ⭐ 길: ns = NAND(s,s), n1 = NAND(a,ns), n2 = NAND(b,s), y = NAND(n1,n2).",
    },
    {
      kind: "verilog",
      title: "4:1 MUX를 Verilog로",
      goal: "sel이 0·1·2·3이면 각각 a·b·c·d가 y로 나가게 case로 쓰세요.",
      top: "tv_select",
      skeleton: caseBody("      2'd0: y = a;\n      // 나머지를 채워 주세요\n      default: y = 0;\n"),
      inputs: [
        { name: "a", width: 1 },
        { name: "b", width: 1 },
        { name: "c", width: 1 },
        { name: "d", width: 1 },
        { name: "sel", width: 2 },
      ],
      outputs: [{ name: "y", width: 1 }],
      spec: (i) => ({ y: [i.a, i.b, i.c, i.d][i.sel] }),
      reference: caseBody("      2'd0: y = a;\n      2'd1: y = b;\n      2'd2: y = c;\n      default: y = d;\n"),
      wrong: [
        caseBody("      2'd0: y = a;\n      2'd1: y = c;\n      2'd2: y = b;\n      default: y = d;\n"),
        HEAD.replace("output reg y", "output y") + "  assign y = sel[0] ? b : a;\nendmodule\n",
      ],
      hint: "2'd0: y = a; 2'd1: y = b; 2'd2: y = c; default: y = d; — 2'd3을 default로 써도 돼요.",
    },
  ],
  realWorld: [
    {
      title: "MUX는 어디에나",
      body:
        "실제 모니터·TV의 입력 전환, 스마트폰 안에서 여러 센서를 ADC 하나로 번갈아 읽는 아날로그 MUX 칩, CPU 안에서 ‘어느 값을 계산기에 넣을지’ 고르는 길 모두 MUX다. " +
        "3장에서 작은 CPU를 만들 때 MUX를 아주 많이 쓰게 된다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "assign y = s ? b : a; 에서 s가 0이면 y는?",
      choices: ["a", "b", "0"],
      answer: 0,
      explain: "조건 ? 참 : 거짓. s가 0(거짓)이면 콜론 뒤의 a.",
    },
    {
      kind: "number",
      q: "입력 8개 중 하나를 고르는 8:1 MUX의 선택 신호는 몇 비트일까?",
      answer: 3,
      tolerance: 0.01,
      unit: "비트",
      explain: "선택 신호로 8가지를 구분해야 하니 3비트(000~111).",
    },
  ],
  glossary: ["mux"],
};
