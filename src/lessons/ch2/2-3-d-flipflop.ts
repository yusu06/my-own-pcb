import type { Lesson } from "../types";
import { lckt } from "../lckt";

const DL_IO = ["d:in", "en:in", "q:out"];
const FF_IO = ["d:in", "clk:in", "q:out"];
const HEAD = "module dff_rst(input clk, input rst, input d, output reg q);\n";

/** 상승 에지에서만 d(또는 리셋이면 0)를 잡는 모델 */
const ffModel = () => {
  let q = 0;
  let last = 0;
  return (i: Record<string, number>) => {
    if (i.clk && !last) q = i.rst ? 0 : i.d;
    last = i.clk;
    return { q };
  };
};
const dl = (d: 0 | 1, en: 0 | 1) => ({ d, en });
const ff = (d: 0 | 1, clk: 0 | 1) => ({ d, clk });

export const lesson: Lesson = {
  id: "2-3",
  chapter: 2,
  title: "사진 찍듯 저장: D 플립플롭",
  emoji: "📸",
  minutes: 20,
  client: {
    from: "체육 용품 회사 ‘달려라’",
    request:
      "달리기 결승선 센서를 만들어요. 신호는 계속 바뀌지만, 심판이 ‘찰칵’ 버튼을 누른 그 순간의 센서 값만 화면에 남겨 주세요. 다음 ‘찰칵’ 전까지는 바뀌면 안 돼요.",
    requirements: ["찰칵(clk이 0→1) 순간의 d를 q에 저장", "그 밖의 시간에는 d가 바뀌어도 q 유지", "Verilog 버전은 리셋 rst도 지원"],
  },
  concepts: [
    {
      title: "문이 열린 동안 따라가는 D 래치",
      body:
        "SR 래치는 버튼이 두 개라 쓰기 불편하다. 앞에 NAND 2개를 붙이면 입력이 d 하나가 된다: en(문 열림)이 1인 동안 q = d를 따라가고, en이 0이 되면 마지막 값을 붙잡는다. 이것이 D 래치다. " +
        "그런데 D 래치는 문이 열린 동안 d가 흔들리면 q도 같이 흔들린다. ‘그 순간’만 저장하려면 한 단계가 더 필요하다.",
    },
    {
      title: "래치 두 개로 만드는 플립플롭",
      body:
        "D 래치 두 개를 이어 놓고, 앞 래치는 clk = 0일 때, 뒤 래치는 clk = 1일 때 문을 연다. clk가 0인 동안 앞 래치가 d를 따라가다가, clk가 0→1로 올라가는 순간 앞 래치는 문을 닫고 뒤 래치가 그 값을 받는다. " +
        "결과적으로 q는 상승 에지 순간의 d만 저장한다. 이것이 [[flip-flop]]이다. 두 문이 동시에 열리는 때가 없어서 d의 흔들림이 q까지 새어 나오지 않는다.",
    },
    {
      title: "Verilog: always @(posedge clk)와 <=",
      body:
        "Verilog에서는 한 줄이다: always @(posedge clk) q <= d; ‘clk의 상승 에지마다 q에 d를 넣어라.’ 여기서 <= 는 [[nonblocking]]이다. 같은 에지의 모든 계산이 끝난 뒤 한꺼번에 반영된다. " +
        "규칙: posedge 블록 안에서는 <= 를 쓴다. 리셋은 블록 안에서 if (rst) q <= 0; else q <= d; 처럼 먼저 확인한다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "D 래치 그리기",
      goal: "NAND 2개와 부품함의 SR 래치로, en = 1이면 q가 d를 따라가고 en = 0이면 유지하는 D 래치를 만드세요. 통과하면 D 래치가 저장돼요.",
      palette: [
        { id: "nand", kind: "nand", label: "NAND", multi: true },
        { id: "sr", kind: "chip", chip: "sr", label: "SR 래치", multi: true },
      ],
      preset: lckt(DL_IO, []),
      inputs: ["d", "en"],
      outputs: ["q"],
      labels: { d: "센서 d", en: "문 en", q: "저장 q" },
      expect: [],
      seq: {
        steps: [dl(1, 1), dl(0, 1), dl(0, 0), dl(1, 0), dl(1, 1), dl(1, 0), dl(0, 0), dl(0, 1), dl(0, 0), dl(1, 0)],
        model() {
          let q = 0;
          return ({ d, en }) => {
            if (en) q = d;
            return { q: q as 0 | 1 };
          };
        },
      },
      reference: lckt(
        [...DL_IO, "nand1:nand", "nand2:nand", "sr1:chip:sr"],
        ["d.y~nand1.a", "en.y~nand1.b", "nand1.y~nand2.a", "en.y~nand2.b", "nand1.y~sr1.s_n", "nand2.y~sr1.r_n", "sr1.q~q.a"],
      ),
      wrong: [
        lckt(DL_IO, ["d.y~q.a"]),
        // 설정·리셋을 바꿔 연결: q가 d의 반대
        lckt(
          [...DL_IO, "nand1:nand", "nand2:nand", "sr1:chip:sr"],
          ["d.y~nand1.a", "en.y~nand1.b", "nand1.y~nand2.a", "en.y~nand2.b", "nand1.y~sr1.r_n", "nand2.y~sr1.s_n", "sr1.q~q.a"],
        ),
      ],
      saveAs: "dlatch",
      maxCost: 4,
      hint: "NAND1 = NAND(d, en) → SR의 s_n. NAND2 = NAND(NAND1, en) → SR의 r_n. en = 0이면 두 NAND가 모두 1이라 SR은 유지돼요.",
    },
    {
      kind: "logic",
      title: "D 래치 두 개로 D 플립플롭",
      goal: "D 래치 2개와 NOT으로, clk가 0→1로 올라가는 순간의 d만 q에 저장하세요. 통과하면 D 플립플롭이 저장돼요.",
      palette: [
        { id: "dlatch", kind: "chip", chip: "dlatch", label: "D 래치", multi: true },
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
      ],
      preset: lckt(FF_IO, []),
      inputs: ["d", "clk"],
      outputs: ["q"],
      labels: { d: "센서 d", clk: "찰칵 clk", q: "저장 q" },
      expect: [],
      seq: {
        // 2번째 칸부터 검사(1번째는 전원 직후). clk=1인 동안 d가 바뀌는 칸이 있어서 래치 하나로는 통과 못 한다
        steps: [ff(1, 0), ff(1, 1), ff(0, 1), ff(0, 0), ff(0, 1), ff(1, 1), ff(1, 0), ff(1, 1), ff(0, 1), ff(0, 0), ff(1, 0), ff(1, 1)],
        model: ffModel as () => (i: Record<string, 0 | 1>) => Record<string, 0 | 1>,
        from: 1,
      },
      reference: lckt(
        [...FF_IO, "not1:chip:not", "dlatch1:chip:dlatch", "dlatch2:chip:dlatch"],
        ["clk.y~not1.a", "d.y~dlatch1.d", "not1.y~dlatch1.en", "dlatch1.q~dlatch2.d", "clk.y~dlatch2.en", "dlatch2.q~q.a"],
      ),
      wrong: [
        // 래치 하나: clk = 1인 동안 d를 따라가 버린다
        lckt([...FF_IO, "dlatch1:chip:dlatch"], ["d.y~dlatch1.d", "clk.y~dlatch1.en", "dlatch1.q~q.a"]),
        // NOT을 뒤 래치에: 하강 에지(1→0)에서 저장된다
        lckt(
          [...FF_IO, "not1:chip:not", "dlatch1:chip:dlatch", "dlatch2:chip:dlatch"],
          ["clk.y~not1.a", "d.y~dlatch1.d", "clk.y~dlatch1.en", "dlatch1.q~dlatch2.d", "not1.y~dlatch2.en", "dlatch2.q~q.a"],
        ),
      ],
      saveAs: "dff",
      hint: "앞 래치: d를 받고 en에는 NOT(clk). 뒤 래치: 앞 래치의 q를 받고 en에는 clk 그대로. q는 뒤 래치에서 꺼내요.",
    },
    {
      kind: "verilog",
      title: "Verilog로 리셋 있는 D 플립플롭",
      goal: "clk의 상승 에지마다 q <= d. 단, 그 에지에 rst가 1이면 q <= 0으로 지우세요.",
      top: "dff_rst",
      skeleton: HEAD + "  always @(posedge clk) begin\n    // rst가 1이면 q <= 0, 아니면 q <= d\n  end\nendmodule\n",
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "d", width: 1 }],
      outputs: [{ name: "q", width: 1 }],
      labels: { rst: "리셋" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: [
          { clk: 0, rst: 1, d: 1 }, { clk: 1, rst: 1, d: 1 },
          { clk: 0, rst: 0, d: 1 }, { clk: 1, rst: 0, d: 1 }, { clk: 1, rst: 0, d: 0 },
          { clk: 0, rst: 0, d: 0 }, { clk: 1, rst: 0, d: 0 },
          { clk: 0, rst: 0, d: 1 }, { clk: 1, rst: 0, d: 1 },
          // rst는 clk가 올라가는 단계에서만 바꾼다(동기·비동기 리셋 모두 같은 결과)
          { clk: 0, rst: 0, d: 1 }, { clk: 1, rst: 1, d: 1 },
          { clk: 0, rst: 1, d: 1 }, { clk: 1, rst: 0, d: 1 },
        ],
        model: ffModel,
      },
      reference: HEAD + "  always @(posedge clk) begin\n    if (rst) q <= 0;\n    else q <= d;\n  end\nendmodule\n",
      wrong: [
        HEAD + "  always @(*) q = d;\nendmodule\n",
        HEAD + "  always @(posedge clk) q <= d;\nendmodule\n",
      ],
      hint: "always @(posedge clk) begin if (rst) q <= 0; else q <= d; end",
    },
  ],
  realWorld: [
    {
      title: "모든 디지털 기기의 기본 칸",
      body:
        "CPU의 레지스터, 카운터, 상태 기계는 모두 D 플립플롭으로 만든다. 플립플롭이 제대로 값을 잡으려면 d가 에지 조금 전부터 조금 뒤까지 가만히 있어야 한다(셋업 시간·홀드 시간). " +
        "FPGA 도구는 회로의 모든 경로가 이 시간을 지키는지 자동으로 검사한다. 이것을 ‘타이밍 분석’이라고 한다. 클럭이 빠를수록 지키기 어려워진다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "D 래치와 D 플립플롭의 차이는?",
      choices: [
        "래치는 en = 1인 동안 계속 따라가고, 플립플롭은 에지 순간에만 저장한다",
        "래치는 Verilog로만 만들 수 있다",
        "플립플롭은 기억을 못 한다",
      ],
      answer: 0,
      explain: "래치는 문이 열린 ‘동안’, 플립플롭은 클럭이 올라가는 ‘순간’. 그래서 플립플롭이 타이밍을 예측하기 쉽다.",
    },
    {
      kind: "choice",
      q: "always @(posedge clk) 안에서 쓰는 대입은?",
      choices: ["= (블로킹)", "<= (논블로킹)", "assign"],
      answer: 1,
      explain: "플립플롭에는 <= 를 쓴다. 같은 에지의 계산이 끝난 뒤 한꺼번에 반영돼서, 여러 플립플롭이 서로 예전 값을 주고받을 수 있다.",
    },
    {
      kind: "choice",
      q: "clk가 1인 동안 d가 0→1로 바뀌면 D 플립플롭의 q는?",
      choices: ["바로 1이 된다", "다음 상승 에지까지 그대로다", "0이 된다"],
      answer: 1,
      explain: "플립플롭은 상승 에지 순간에만 d를 본다. 그 뒤의 변화는 다음 에지에서 반영된다.",
    },
  ],
  glossary: ["flip-flop", "nonblocking"],
};
