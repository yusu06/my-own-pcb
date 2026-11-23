import type { Lesson, PaletteItem } from "../types";
import { lckt } from "../lckt";
import { clocked } from "../seq";

const IO = ["clk:in", "q1:out", "q0:out"];
const DFF: PaletteItem = { id: "dff", kind: "dff", label: "D 플립플롭(기본)", multi: true };
const HEAD = "module timer(input clk, input rst, input load, input [5:0] sec_in, output reg [5:0] sec, output done);\n";
const code = (always: string, done = "  assign done = (sec == 0);\n") => HEAD + "  always @(posedge clk) begin\n" + always + "  end\n" + done + "endmodule\n";
const OK = "    if (rst) sec <= 0;\n    else if (load) sec <= sec_in;\n    else if (sec != 0) sec <= sec - 1;\n";

export const lesson: Lesson = {
  id: "2-6",
  chapter: 2,
  title: "전자레인지 타이머",
  emoji: "⏲️",
  minutes: 20,
  client: {
    from: "주방 가전 회사 ‘따끈’",
    request:
      "전자레인지의 남은 시간 표시를 만들어 주세요. 시간을 넣으면 1초마다 하나씩 줄고, 0이 되면 멈춰서 ‘끝’ 신호를 내야 해요. 0 밑으로 내려가면 큰일 나요!",
    requirements: ["load = 1이면 sec_in을 넣는다", "그 밖에는 매 클럭 1씩 줄이고 0에서 멈춘다", "done = (sec가 0)", "rst = 1이면 0"],
  },
  concepts: [
    {
      title: "에지마다 하나씩: 카운터",
      body:
        "레지스터에 ‘지금 값 + 1’을 다시 넣으면, 클럭 에지마다 1씩 커진다. 이것이 [[counter]]다. 시계, 타이머, 걸음 수 세기처럼 ‘몇 번’을 세는 곳 어디에나 있다. " +
        "2비트 카운터는 00 → 01 → 10 → 11 → 00으로 돈다. 맨 아래 비트는 매번 뒤집히고, 위 비트는 아래 비트가 1일 때만 뒤집힌다(q1 ← q1 XOR q0).",
    },
    {
      title: "넘치면 처음으로",
      body:
        "6비트로는 0~63까지 셀 수 있다. 0에서 1을 빼면 음수가 아니라 63으로 넘어간다(2진수가 한 바퀴 돎). 전자레인지가 0초 다음에 63초로 바뀌면 안 되므로, 0일 때는 빼지 않도록 조건을 단다: else if (sec != 0) sec <= sec - 1;",
    },
    {
      title: "누가 먼저인가: 조건의 순서",
      body:
        "같은 에지에 리셋, 새 시간 넣기(load), 줄이기가 겹칠 수 있다. if / else if의 순서가 곧 우선순위다. 의뢰대로 rst → load → 줄이기 순서로 쓴다. " +
        "done은 sec를 보고 바로 정해지는 조합 출력이라 assign으로 쓴다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "2비트 카운터 그리기",
      goal: "기본 D 플립플롭 2개와 부품함 NOT·XOR로, clk가 올라갈 때마다 q1 q0이 00 → 01 → 10 → 11 → 00으로 세게 하세요.",
      palette: [
        DFF,
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "xor", kind: "chip", chip: "xor", label: "XOR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["clk"],
      outputs: ["q1", "q0"],
      expect: [],
      seq: {
        steps: clocked(Array.from({ length: 6 }, () => ({}))) as Record<string, 0 | 1>[],
        model() {
          let n = 0;
          let last = 0;
          return ({ clk }) => {
            if (clk && !last) n = (n + 1) % 4;
            last = clk;
            return { q1: (n >> 1) as 0 | 1, q0: (n & 1) as 0 | 1 };
          };
        },
      },
      reference: lckt(
        [...IO, "dff1:dff", "dff2:dff", "not1:chip:not", "xor1:chip:xor"],
        ["clk.y~dff1.clk", "clk.y~dff2.clk", "dff1.q~not1.a", "not1.y~dff1.d", "dff2.q~xor1.a", "dff1.q~xor1.b", "xor1.y~dff2.d", "dff1.q~q0.a", "dff2.q~q1.a"],
      ),
      wrong: [
        // 위 비트가 아래 비트를 그대로 받음(시프트)
        lckt(
          [...IO, "dff1:dff", "dff2:dff", "not1:chip:not"],
          ["clk.y~dff1.clk", "clk.y~dff2.clk", "dff1.q~not1.a", "not1.y~dff1.d", "dff1.q~dff2.d", "dff1.q~q0.a", "dff2.q~q1.a"],
        ),
        // 위 비트도 매번 뒤집힘
        lckt(
          [...IO, "dff1:dff", "dff2:dff", "not1:chip:not", "not2:chip:not"],
          ["clk.y~dff1.clk", "clk.y~dff2.clk", "dff1.q~not1.a", "not1.y~dff1.d", "dff2.q~not2.a", "not2.y~dff2.d", "dff1.q~q0.a", "dff2.q~q1.a"],
        ),
      ],
      hint: "q0: 플립플롭 q → NOT → 같은 플립플롭 d. q1: XOR(q1, q0) → 위 플립플롭 d. 두 플립플롭 clk는 모두 clk.",
    },
    {
      kind: "verilog",
      title: "Verilog로 다운카운터 타이머",
      goal: "rst면 0, load면 sec_in을 넣고, 아니면 매 에지 1씩 줄이되 0에서 멈추세요. done은 sec가 0일 때 1.",
      top: "timer",
      skeleton: code("    // rst → load → 줄이기 순서로\n", "  assign done = 0;\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "load", width: 1 }, { name: "sec_in", width: 6 }],
      outputs: [{ name: "sec", width: 6 }, { name: "done", width: 1 }],
      labels: { rst: "리셋", load: "넣기", sec_in: "넣을 시간", sec: "남은 시간", done: "끝" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: clocked(
          [
            { rst: 1, load: 0, sec_in: 0 },
            { rst: 0, load: 1, sec_in: 5 },
            ...Array.from({ length: 7 }, () => ({ rst: 0, load: 0, sec_in: 0 })),
            { rst: 0, load: 1, sec_in: 3 },
            { rst: 0, load: 0, sec_in: 0 },
            { rst: 0, load: 1, sec_in: 9 },
            ...Array.from({ length: 3 }, () => ({ rst: 0, load: 0, sec_in: 0 })),
          ],
          ["rst"],
        ),
        model() {
          let sec = 0;
          let last = 0;
          return ({ clk, rst, load, sec_in }) => {
            if (clk && !last) sec = rst ? 0 : load ? sec_in : sec > 0 ? sec - 1 : 0;
            last = clk;
            return { sec, done: sec === 0 ? 1 : 0 };
          };
        },
      },
      reference: code(OK),
      wrong: [
        // 0에서 멈추지 않음: 63으로 넘어감
        code("    if (rst) sec <= 0;\n    else if (load) sec <= sec_in;\n    else sec <= sec - 1;\n"),
        // 줄이기가 load보다 먼저: 시간이 남아 있으면 새 시간을 못 넣음
        code("    if (rst) sec <= 0;\n    else if (sec != 0) sec <= sec - 1;\n    else if (load) sec <= sec_in;\n"),
        code(OK, "  assign done = (sec == 1);\n"),
      ],
      hint: "if (rst) sec <= 0; else if (load) sec <= sec_in; else if (sec != 0) sec <= sec - 1;  그리고 assign done = (sec == 0);",
    },
  ],
  realWorld: [
    {
      title: "타이머는 MCU 안에도 있다",
      body:
        "거의 모든 MCU에는 ‘타이머’라는 하드웨어 카운터가 들어 있다. 펌웨어가 숫자를 넣어 두면 클럭마다 알아서 세고, 다 세면 알려 준다(인터럽트). 그래서 CPU가 다른 일을 하는 동안에도 시간을 정확히 잴 수 있다. 5장에서 직접 쓴다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "6비트 카운터로 셀 수 있는 가장 큰 수는?",
      answer: 63,
      tolerance: 0.01,
      unit: "",
      explain: "6비트 = 2⁶ = 64가지(0~63).",
    },
    {
      kind: "choice",
      q: "6비트 값 0에서 1을 빼면?",
      choices: ["-1", "63", "0"],
      answer: 1,
      explain: "부호 없는 6비트는 음수가 없어서 한 바퀴 돌아 63(111111)이 된다. 그래서 0에서 멈추는 조건이 필요했다.",
    },
    {
      kind: "choice",
      q: "2비트 업카운터에서 위 비트(q1)는 언제 뒤집힐까?",
      choices: ["매 에지마다", "아래 비트(q0)가 1일 때의 에지에서", "아래 비트가 0일 때의 에지에서"],
      answer: 1,
      explain: "01 → 10, 11 → 00처럼 아래 비트가 1에서 넘어갈 때 올림이 생긴다. 그래서 q1 ← q1 XOR q0.",
    },
  ],
  glossary: ["counter"],
};
