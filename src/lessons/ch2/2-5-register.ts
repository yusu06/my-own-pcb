import type { Lesson } from "../types";
import { lckt } from "../lckt";
import { clocked } from "../seq";

const IO = ["en:in", "d1:in", "d0:in", "clk:in", "q1:out", "q0:out"];
const HEAD = "module register4(input clk, input rst, input en, input [3:0] d, output reg [3:0] q);\n";

/** 비트마다: MUX(a = 지금 q, b = 새 d, s = en) → D 플립플롭 → q (q는 다시 MUX로) */
const bit = (n: 0 | 1, flip: number, dIn: string) => [
  `mux${n + 1}.y~dff${flip}.d`, "clk.y~dff" + flip + ".clk", `dff${flip}.q~q${n}.a`, `dff${flip}.q~mux${n + 1}.a`, `${dIn}.y~mux${n + 1}.b`, `en.y~mux${n + 1}.s`,
];
const PARTS = [...IO, "mux1:chip:mux", "mux2:chip:mux", "dff1:chip:dff", "dff2:chip:dff"];

export const lesson: Lesson = {
  id: "2-5",
  chapter: 2,
  title: "값을 맡아 두는 레지스터",
  emoji: "🗄️",
  minutes: 20,
  client: {
    from: "물류 회사 ‘빠른상자’",
    request:
      "컨베이어 벨트의 상자 무게 센서 값이 계속 바뀌어요. 바코드를 찍는 순간(en = 1)의 값만 저장해 두었다가, 다음 상자를 찍을 때까지 그대로 보여 주는 칸이 필요해요.",
    requirements: ["en = 1인 상승 에지에서만 새 값 저장", "en = 0이면 클럭이 와도 유지", "Verilog 버전: 4비트, rst = 1이면 0으로"],
  },
  concepts: [
    {
      title: "플립플롭을 여러 개 묶으면 레지스터",
      body:
        "D 플립플롭 하나는 1비트를 저장한다. 같은 클럭을 받는 플립플롭 여러 개를 나란히 놓으면 여러 비트 숫자를 한꺼번에 저장할 수 있다. 이것이 [[register]]다. CPU 안의 레지스터도 이렇게 생겼다.",
    },
    {
      title: "저장할지 말지: enable",
      body:
        "플립플롭은 에지마다 무조건 d를 받는다. ‘이번엔 저장하지 마’를 만들려면 앞에 MUX를 둔다: en = 0이면 지금 q를, en = 1이면 새 d를 플립플롭에 넣는다. " +
        "en = 0일 때는 자기 값을 다시 저장하니 결과적으로 그대로다. 1-8에서 만든 MUX가 여기서 쓰인다.",
    },
    {
      title: "Verilog: if (en) q <= d;",
      body:
        "Verilog에서는 MUX를 따로 그릴 필요가 없다: always @(posedge clk) if (en) q <= d; ‘else’를 안 쓰면 그 에지에 q에 값을 넣지 않으니 유지된다. " +
        "posedge 블록에서 값을 안 넣는 것은 버그가 아니라 ‘유지’라는 뜻이다(always @(*)와 다르다). 리셋은 en보다 먼저 확인한다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "2비트 레지스터 그리기",
      goal: "부품함의 D 플립플롭 2개와 MUX 2개로, en = 1인 상승 에지에서만 d1·d0를 q1·q0에 저장하세요.",
      palette: [
        { id: "dff", kind: "chip", chip: "dff", label: "D 플립플롭", multi: true },
        { id: "mux", kind: "chip", chip: "mux", label: "MUX", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["en", "d1", "d0", "clk"],
      outputs: ["q1", "q0"],
      labels: { en: "찍기 en", clk: "clk" },
      expect: [],
      seq: {
        steps: clocked([
          { en: 1, d1: 1, d0: 0 },
          { en: 0, d1: 0, d0: 1 },
          { en: 1, d1: 0, d0: 1 },
          { en: 0, d1: 1, d0: 0 },
          { en: 0, d1: 1, d0: 1 },
          { en: 1, d1: 1, d0: 1 },
        ]) as Record<string, 0 | 1>[],
        model() {
          let q1 = 0;
          let q0 = 0;
          let last = 0;
          return ({ en, d1, d0, clk }) => {
            if (clk && !last && en) [q1, q0] = [d1, d0];
            last = clk;
            return { q1: q1 as 0 | 1, q0: q0 as 0 | 1 };
          };
        },
        from: 1,
      },
      reference: lckt(PARTS, [...bit(1, 1, "d1"), ...bit(0, 2, "d0")]),
      wrong: [
        // MUX 없이 바로: en과 상관없이 매 에지 저장
        lckt([...IO, "dff1:chip:dff", "dff2:chip:dff"], ["d1.y~dff1.d", "clk.y~dff1.clk", "dff1.q~q1.a", "d0.y~dff2.d", "clk.y~dff2.clk", "dff2.q~q0.a"]),
        // 비트를 바꿔 연결
        lckt(PARTS, [...bit(1, 1, "d0"), ...bit(0, 2, "d1")]),
      ],
      hint: "비트마다: MUX의 a = 플립플롭 q(되먹임), b = d, s = en. MUX 출력 → 플립플롭 d, 플립플롭 clk ← clk, 플립플롭 q → 출력.",
    },
    {
      kind: "verilog",
      title: "Verilog로 4비트 레지스터",
      goal: "상승 에지에서: rst = 1이면 q <= 0, 아니고 en = 1이면 q <= d, 둘 다 아니면 그대로.",
      top: "register4",
      skeleton: HEAD + "  always @(posedge clk) begin\n    // rst를 먼저, 그다음 en\n  end\nendmodule\n",
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "en", width: 1 }, { name: "d", width: 4 }],
      outputs: [{ name: "q", width: 4 }],
      labels: { rst: "리셋", en: "찍기" },
      seq: {
        steps: clocked([
          { rst: 1, en: 0, d: 5 },
          { rst: 0, en: 1, d: 9 },
          { rst: 0, en: 0, d: 3 },
          { rst: 0, en: 1, d: 12 },
          { rst: 1, en: 1, d: 7 },
          { rst: 0, en: 0, d: 1 },
          { rst: 0, en: 1, d: 6 },
        ]),
        model() {
          let q = 0;
          let last = 0;
          return ({ clk, rst, en, d }) => {
            if (clk && !last) q = rst ? 0 : en ? d : q;
            last = clk;
            return { q };
          };
        },
      },
      reference: HEAD + "  always @(posedge clk) begin\n    if (rst) q <= 0;\n    else if (en) q <= d;\n  end\nendmodule\n",
      wrong: [
        HEAD + "  always @(posedge clk) begin\n    if (rst) q <= 0;\n    else q <= d;\n  end\nendmodule\n",
        // en을 먼저 보면 rst와 en이 함께 1일 때 지워지지 않는다
        HEAD + "  always @(posedge clk) begin\n    if (en) q <= d;\n    else if (rst) q <= 0;\n  end\nendmodule\n",
      ],
      hint: "if (rst) q <= 0; else if (en) q <= d; — else는 쓰지 않아요. 값을 안 넣으면 유지돼요.",
    },
  ],
  realWorld: [
    {
      title: "어디에나 있는 레지스터",
      body:
        "MCU의 설정은 대부분 ‘레지스터에 값을 써 넣는’ 방식이다. 예를 들어 어떤 핀을 출력으로 쓸지, 타이머를 얼마나 빠르게 돌릴지를 정해진 주소의 레지스터에 쓴다. 5장 펌웨어에서 매일 보게 된다. " +
        "칩 사이를 오가는 데이터도 받는 쪽 레지스터가 en 같은 신호를 보고 저장한다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "en = 0인데 클럭 상승 에지가 오면 레지스터 값은?",
      choices: ["0이 된다", "d로 바뀐다", "그대로다"],
      answer: 2,
      explain: "en = 0이면 MUX가 지금 q를 다시 넣으니 값이 유지된다.",
    },
    {
      kind: "number",
      q: "8비트 레지스터를 만들려면 D 플립플롭이 몇 개 필요할까?",
      answer: 8,
      tolerance: 0.01,
      unit: "개",
      explain: "플립플롭 하나가 1비트를 저장한다.",
    },
    {
      kind: "choice",
      q: "posedge 블록에서 if (en) q <= d; 만 쓰고 else를 안 쓰면?",
      choices: ["래치 버그가 생긴다", "en = 0일 때 q가 유지된다(의도한 동작)", "문법 오류"],
      answer: 1,
      explain: "플립플롭은 원래 값을 유지하는 부품이라, 값을 안 넣으면 그대로다. 버그가 되는 것은 always @(*) 쪽이다.",
    },
  ],
  glossary: ["register"],
};
