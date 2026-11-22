import type { Lesson } from "../types";
import { lckt } from "../lckt";

const HA_IO = ["a:in", "b:in", "s:out", "c:out"];
const FA_IO = ["a:in", "b:in", "cin:in", "s:out", "cout:out"];
const FA_HEAD = "module full_adder(input a, input b, input cin, output s, output cout);\n";
const bits3 = (n: number) => [(n >> 2) & 1, (n >> 1) & 1, n & 1];

export const lesson: Lesson = {
  id: "1-9",
  chapter: 1,
  title: "간이 계산기",
  emoji: "🧮",
  minutes: 18,
  client: {
    from: "교구 회사 ‘셈셈교구’",
    request:
      "아이들이 스위치로 2진수 덧셈을 해 보는 교구를 만들려고 합니다. 먼저 한 자리(1비트) 덧셈기를 만들어 주세요. 나중에 이어 붙여 큰 수도 더할 수 있게요.",
    requirements: ["반가산기: a + b → 합 s, 올림 c", "전가산기: a + b + 아랫자리 올림 cin → s, cout", "둘 다 부품함에 저장"],
  },
  concepts: [
    {
      title: "2진수 한 자리 덧셈",
      body:
        "0+0=0, 0+1=1, 1+0=1, 1+1=10(2진수로 ‘일영’). 마지막 경우는 자리가 넘쳐서 윗자리로 1을 올린다. 이 1이 [[carry]]다. " +
        "그러니 한 자리 덧셈의 결과는 두 비트: 합 s와 올림 c. 진리표를 보면 s는 XOR, c는 AND와 똑같다. 이 회로가 [[half-adder]]다.",
    },
    {
      title: "아랫자리 올림까지: 전가산기",
      body:
        "여러 자리를 더하려면 아랫자리에서 올라온 올림 cin까지 세 개를 더해야 한다. 이것이 [[full-adder]]다. " +
        "반가산기 두 개로 만들 수 있다: 먼저 a+b, 그 합에 cin을 더하고, 두 번 중 한 번이라도 올림이 생기면 cout = 1(OR).",
    },
    {
      title: "Verilog에서는 +",
      body:
        "Verilog에서 덧셈은 그냥 + 다. 결과가 넘칠 수 있으니 받는 쪽을 넓게 잡는다: assign {cout, s} = a + b + cin; " +
        "{cout, s}는 두 신호를 이어 붙인 2비트 묶음(연결)이라, 위 비트에 올림이, 아래 비트에 합이 들어간다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "반가산기 그리기",
      goal: "a + b의 합(s)과 올림(c)을 만드세요. 부품함 XOR·AND를 써도 되고, NAND 5개로 도전하면 ⭐. 통과하면 반가산기가 저장돼요.",
      palette: [
        { id: "nand", kind: "nand", label: "NAND", multi: true },
        { id: "xor", kind: "chip", chip: "xor", label: "XOR", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
      ],
      preset: lckt(HA_IO, []),
      inputs: ["a", "b"],
      outputs: ["s", "c"],
      labels: { a: "a", b: "b", s: "합 s", c: "올림 c" },
      expect: [
        [0, 0],
        [1, 0],
        [1, 0],
        [0, 1],
      ],
      reference: lckt(
        [...HA_IO, "nand1:nand", "nand2:nand", "nand3:nand", "nand4:nand", "nand5:nand"],
        ["a.y~nand1.a", "b.y~nand1.b", "a.y~nand2.a", "nand1.y~nand2.b", "nand1.y~nand3.a", "b.y~nand3.b", "nand2.y~nand4.a", "nand3.y~nand4.b", "nand4.y~s.a", "nand1.y~nand5.a", "nand1.y~nand5.b", "nand5.y~c.a"],
      ),
      wrong: [
        lckt([...HA_IO, "xor1:chip:xor", "and1:chip:and"], ["a.y~xor1.a", "b.y~xor1.b", "xor1.y~c.a", "a.y~and1.a", "b.y~and1.b", "and1.y~s.a"]),
        lckt([...HA_IO, "xor1:chip:xor"], ["a.y~xor1.a", "b.y~xor1.b", "xor1.y~s.a"]),
      ],
      saveAs: "ha",
      maxCost: 5,
      hint: "쉬운 길: s = XOR(a,b), c = AND(a,b). ⭐ 길: XOR를 NAND 4개로 만들 때 첫 NAND(a,b)의 출력을 NOT(=NAND 자기 자신)하면 AND가 공짜에 가까워요.",
    },
    {
      kind: "logic",
      title: "반가산기 두 개로 전가산기",
      goal: "부품함의 반가산기 2개와 OR로 a + b + cin을 계산하세요. 통과하면 전가산기가 저장돼요.",
      palette: [
        { id: "ha", kind: "chip", chip: "ha", label: "반가산기", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(FA_IO, []),
      inputs: ["a", "b", "cin"],
      outputs: ["s", "cout"],
      labels: { a: "a", b: "b", cin: "아랫자리 올림", s: "합 s", cout: "올림 cout" },
      expect: Array.from({ length: 8 }, (_, n) => {
        const sum = bits3(n).reduce((x, y) => x + y, 0);
        return [(sum & 1) as 0 | 1, (sum >> 1) as 0 | 1];
      }),
      reference: lckt(
        [...FA_IO, "ha1:chip:ha", "ha2:chip:ha", "or1:chip:or"],
        ["a.y~ha1.a", "b.y~ha1.b", "ha1.s~ha2.a", "cin.y~ha2.b", "ha2.s~s.a", "ha1.c~or1.a", "ha2.c~or1.b", "or1.y~cout.a"],
      ),
      wrong: [
        lckt([...FA_IO, "ha1:chip:ha", "ha2:chip:ha"], ["a.y~ha1.a", "b.y~ha1.b", "ha1.s~ha2.a", "cin.y~ha2.b", "ha2.s~s.a", "ha2.c~cout.a"]),
        lckt([...FA_IO, "ha1:chip:ha", "or1:chip:or"], ["a.y~ha1.a", "b.y~ha1.b", "ha1.s~s.a", "ha1.c~or1.a", "cin.y~or1.b", "or1.y~cout.a"]),
      ],
      saveAs: "fa",
      hint: "반가산기1에 a, b. 반가산기2에 (반가산기1의 s)와 cin. 반가산기2의 s가 합, 두 반가산기의 c를 OR하면 cout.",
    },
    {
      kind: "verilog",
      title: "전가산기를 Verilog로",
      goal: "a + b + cin을 계산하는 전가산기를 쓰세요. + 를 써도 되고, ^ & | 로 식을 써도 돼요.",
      top: "full_adder",
      skeleton: FA_HEAD + "\nendmodule\n",
      inputs: [
        { name: "a", width: 1 },
        { name: "b", width: 1 },
        { name: "cin", width: 1 },
      ],
      outputs: [
        { name: "s", width: 1 },
        { name: "cout", width: 1 },
      ],
      spec: ({ a, b, cin }) => ({ s: (a + b + cin) & 1, cout: (a + b + cin) >> 1 }),
      reference: FA_HEAD + "  assign {cout, s} = a + b + cin;\nendmodule\n",
      wrong: [
        FA_HEAD + "  assign s = a ^ b ^ cin;\n  assign cout = a & b;\nendmodule\n",
        FA_HEAD + "  assign {cout, s} = a + b;\nendmodule\n",
      ],
      hint: "assign {cout, s} = a + b + cin; 한 줄. 식으로는 s = a ^ b ^ cin, cout = (a & b) | (cin & (a ^ b)).",
    },
  ],
  realWorld: [
    {
      title: "CPU 속 계산기",
      body:
        "CPU 안의 계산 장치(ALU)도 결국 전가산기를 여러 개 이어 붙인 것에서 시작한다. 이어 붙이면 올림이 아랫자리부터 차례로 전달되는데, 자리가 많으면 이게 느려서 " +
        "실제 CPU는 올림을 미리 계산하는 더 복잡한 덧셈기를 쓴다. 원리는 지금 만든 것과 같다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "반가산기의 합 s와 올림 c는 각각 어떤 게이트와 같을까?",
      choices: ["s = AND, c = OR", "s = XOR, c = AND", "s = OR, c = XOR"],
      answer: 1,
      explain: "1+1=10이라 합은 0, 올림은 1. 합은 ‘서로 다르면 1’(XOR), 올림은 ‘둘 다 1’(AND).",
    },
    {
      kind: "number",
      q: "2진수 1 + 1 + 1(cin)의 결과를 2비트 {cout, s}로 쓰면 10진수로 얼마일까?",
      answer: 3,
      tolerance: 0.01,
      unit: "",
      explain: "1+1+1 = 3 = 2진수 11. cout = 1, s = 1.",
    },
  ],
  glossary: ["carry", "half-adder", "full-adder"],
};
