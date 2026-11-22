import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["a1:in", "a0:in", "b1:in", "b0:in", "c:out", "s1:out", "s0:out"];
const HEAD = "module calc(input [3:0] a, input [3:0] b, input sub, output [3:0] s, output c);\n";

export const lesson: Lesson = {
  id: "1-10",
  chapter: 1,
  title: "계산기 v2",
  emoji: "➕",
  minutes: 18,
  client: {
    from: "교구 회사 ‘셈셈교구’",
    request:
      "1자리 덧셈 교구가 반응이 좋았어요! 이번에는 4비트(0~15) 두 수를 더하고 빼는 계산기를 만들어 주세요. 빼기 스위치(sub)를 켜면 뺄셈입니다.",
    requirements: ["sub = 0 → s = a + b, c = 올림", "sub = 1 → s = a − b, c = 빌림(a보다 b가 크면 1)", "블록 연습: 반가산기·전가산기로 2비트 덧셈기 조립"],
  },
  concepts: [
    {
      title: "전가산기를 줄줄이",
      body:
        "여러 자리 덧셈은 손으로 하던 세로 덧셈과 같다. 맨 아랫자리부터 더하고, 올림을 윗자리 전가산기의 cin으로 넘긴다. " +
        "이렇게 이어 붙인 것을 리플 캐리 덧셈기라고 한다(올림이 물결처럼 번져 간다). 맨 아랫자리는 올라올 올림이 없으니 반가산기로 충분하다.",
    },
    {
      title: "뺄셈은 더하기로: 2의 보수",
      body:
        "회로에서 뺄셈은 따로 만들지 않는다. [[twos-complement]]를 쓰면 a − b = a + (b를 모두 뒤집은 것) + 1 이 된다. " +
        "4비트에서 3 − 5를 하면 −2 대신 14(1110)가 나오고 빌림이 생기는데, 1110을 ‘음수 −2’로 읽기로 약속하는 것이 2의 보수다.",
    },
    {
      title: "Verilog: 넓게 받고 고르기",
      body:
        "assign {c, s} = sub ? a - b : a + b; 처럼 쓰면 된다. 받는 쪽 {c, s}가 5비트라서 계산도 5비트로 하고, 덧셈이면 넘친 올림이, 뺄셈이면 빌림이 c로 나온다. " +
        "Verilog 덧셈기 안을 직접 그리지 않아도 합성 도구가 알아서 덧셈 회로로 바꿔 준다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "4비트 덧셈·뺄셈기",
      goal: "sub가 0이면 a + b, 1이면 a − b를 s로 내세요. c는 덧셈이면 올림, 뺄셈이면 빌림(a < b면 1)이에요.",
      top: "calc",
      skeleton: HEAD + "\nendmodule\n",
      inputs: [
        { name: "a", width: 4 },
        { name: "b", width: 4 },
        { name: "sub", width: 1 },
      ],
      outputs: [
        { name: "s", width: 4 },
        { name: "c", width: 1 },
      ],
      labels: { sub: "빼기" },
      spec: ({ a, b, sub }) => (sub ? { s: (a - b) & 15, c: a < b ? 1 : 0 } : { s: (a + b) & 15, c: (a + b) >> 4 }),
      reference: HEAD + "  assign {c, s} = sub ? a - b : a + b;\nendmodule\n",
      wrong: [HEAD + "  assign {c, s} = a + b;\nendmodule\n", HEAD + "  assign s = sub ? a - b : a + b;\n  assign c = 0;\nendmodule\n"],
      hint: "assign {c, s} = sub ? a - b : a + b; — 왼쪽을 {c, s}로 이어 붙이면 5비트로 계산해서 넘침·빌림이 c로 들어가요.",
    },
    {
      kind: "logic",
      title: "블록으로 2비트 덧셈기",
      goal: "부품함의 반가산기·전가산기로 2비트 수 a1a0 + b1b0을 계산하세요. 아랫자리 올림을 윗자리로 넘기는 게 핵심이에요.",
      palette: [
        { id: "ha", kind: "chip", chip: "ha", label: "반가산기", multi: true },
        { id: "fa", kind: "chip", chip: "fa", label: "전가산기", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["a1", "a0", "b1", "b0"],
      outputs: ["c", "s1", "s0"],
      labels: { a1: "a1", a0: "a0", b1: "b1", b0: "b0", c: "올림", s1: "s1", s0: "s0" },
      expect: Array.from({ length: 16 }, (_, n) => {
        const sum = (n >> 2) + (n & 3);
        return [(sum >> 2) as 0 | 1, ((sum >> 1) & 1) as 0 | 1, (sum & 1) as 0 | 1];
      }),
      reference: lckt(
        [...IO, "ha1:chip:ha", "fa1:chip:fa"],
        ["a0.y~ha1.a", "b0.y~ha1.b", "ha1.s~s0.a", "ha1.c~fa1.cin", "a1.y~fa1.a", "b1.y~fa1.b", "fa1.s~s1.a", "fa1.cout~c.a"],
      ),
      wrong: [
        lckt([...IO, "ha1:chip:ha", "ha2:chip:ha"], ["a0.y~ha1.a", "b0.y~ha1.b", "ha1.s~s0.a", "a1.y~ha2.a", "b1.y~ha2.b", "ha2.s~s1.a", "ha2.c~c.a"]),
        lckt(
          [...IO, "ha1:chip:ha", "fa1:chip:fa"],
          ["a0.y~ha1.a", "b0.y~ha1.b", "ha1.s~s0.a", "ha1.c~c.a", "a1.y~fa1.a", "b1.y~fa1.b", "ha1.c~fa1.cin", "fa1.s~s1.a"],
        ),
      ],
      hint: "아랫자리: 반가산기(a0, b0) → s0, 올림은 전가산기의 cin으로. 윗자리: 전가산기(a1, b1, cin) → s1, cout은 올림 출력으로.",
    },
  ],
  realWorld: [
    {
      title: "CPU의 플래그",
      body:
        "실제 CPU는 계산할 때마다 ‘올림이 생겼나’, ‘결과가 0인가’ 같은 표시(플래그)를 남기고, 프로그램은 이걸 보고 분기한다. " +
        "뺄셈의 올림 플래그를 ‘빌림’으로 쓰는 CPU도 있고 반대로 쓰는 CPU도 있어서, 데이터시트를 꼭 확인해야 한다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "4비트 덧셈기에서 9 + 8을 하면 s(4비트)는 10진수로 얼마일까?",
      answer: 1,
      tolerance: 0.01,
      unit: "",
      explain: "9 + 8 = 17 = 1_0001. 4비트에는 0001(=1)만 남고 넘친 1은 올림 c로 나간다.",
    },
    {
      kind: "choice",
      q: "2의 보수로 a − b를 계산하는 방법은?",
      choices: ["a + b + 1", "a + (b를 모두 뒤집은 것) + 1", "a를 모두 뒤집고 b를 더한다"],
      answer: 1,
      explain: "b를 뒤집고 1을 더한 것이 −b다. 그래서 덧셈기 하나로 뺄셈까지 한다.",
    },
  ],
  glossary: ["twos-complement"],
};
