import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD =
  "module microwave(input clk, input rst, input add, input start, input door, output heat, output beep, output reg [7:0] sec);\n" +
  "  localparam IDLE = 2'd0, RUN = 2'd1, PAUSE = 2'd2, DONE = 2'd3;\n  reg [1:0] state;\n  reg [1:0] b;\n";
const TAIL = "  assign heat = (state == RUN);\n  assign beep = (state == DONE);\nendmodule\n";
const code = (cases: string) =>
  HEAD +
  "  always @(posedge clk) begin\n    if (rst) begin\n      state <= IDLE;\n      sec <= 0;\n      b <= 0;\n    end\n    else case (state)\n" +
  cases +
  "    endcase\n  end\n" +
  TAIL;
const REF = code(
  "      IDLE:\n" +
    "        if (add) sec <= (sec <= 210) ? sec + 30 : 240;\n" +
    "        else if (start && !door && sec != 0) state <= RUN;\n" +
    "      RUN:\n" +
    "        if (door) state <= PAUSE;\n" +
    "        else begin\n" +
    "          sec <= sec - 1;\n" +
    "          if (sec == 1) begin\n            state <= DONE;\n            b <= 0;\n          end\n" +
    "        end\n" +
    "      PAUSE:\n" +
    "        if (start && !door) state <= RUN;\n" +
    "      DONE:\n" +
    "        if (b == 2) state <= IDLE;\n" +
    "        else b <= b + 1;\n",
);

type In = { rst: number; add: number; start: number; door: number };
const c = (o: Partial<In> = {}): In => ({ rst: 0, add: 0, start: 0, door: 0, ...o });
const n = (k: number, o: Partial<In> = {}) => Array.from({ length: k }, () => c(o));
const CYCLES: In[] = [
  c({ rst: 1 }),
  c({ add: 1 }), c({ add: 1 }), c(),
  c({ start: 1, door: 1 }), // 문이 열려 있으면 시작 안 함
  c({ start: 1 }),
  ...n(5),
  ...n(2, { door: 1 }), // 문 열림 → 멈춤
  c(), // 닫아도 start 전에는 멈춘 채
  c({ start: 1 }),
  ...n(58),
  ...n(9, { add: 1 }), // 240에서 멈춰야 한다
  c(),
];

export const lesson: Lesson = {
  id: "2-12",
  chapter: 2,
  title: "전자레인지 완성",
  emoji: "📦",
  minutes: 20,
  client: {
    from: "주방 가전 회사 ‘따끈’",
    request:
      "지금까지 만든 부품을 모아 전자레인지 제어기를 완성해 주세요. 시간 넣기, 시작, 문 열면 멈춤, 끝나면 삐 소리까지요. 클럭은 2-7의 분주기를 거친 1초 박자예요.",
    requirements: [
      "대기 중 add: 30초 더하기(최대 240초)",
      "start: 문이 닫혀 있고 시간이 있으면 동작(heat = 1, 매초 1 감소)",
      "동작 중 문이 열리면 멈춤. 다시 닫고 start면 이어서",
      "0초가 되면 beep = 1을 3초 동안, 그다음 대기",
    ],
  },
  concepts: [
    {
      title: "상태도부터 그린다",
      body:
        "전자레인지가 하는 일을 상태로 나누면 넷이다: 대기, 동작, 멈춤, 끝. 실무에서도 코드보다 이 그림을 먼저 그리고 의뢰인과 ‘문 열면 어떻게 되나요?’ 같은 질문을 주고받는다. " +
        "화살표 하나가 case 안의 if 한 줄이 된다.",
      states: {
        nodes: [
          { id: "idle", label: "대기", x: 0, y: 50 },
          { id: "run", label: "동작", x: 50, y: 0 },
          { id: "pause", label: "멈춤", x: 50, y: 100 },
          { id: "done", label: "끝", x: 100, y: 50 },
        ],
        edges: [
          { from: "idle", to: "run", label: "start" },
          { from: "run", to: "pause", label: "문 열림" },
          { from: "pause", to: "run", label: "start" },
          { from: "run", to: "done", label: "0초" },
          { from: "done", to: "idle", label: "3초 뒤" },
          { from: "idle", to: "idle", label: "add +30" },
        ],
      },
    },
    {
      title: "배운 부품이 다 들어 있다",
      body:
        "남은 시간 sec는 2-6의 다운카운터, 삐 소리 3초는 작은 카운터 b, 대기·동작·멈춤·끝은 2-9의 FSM이다. 1초 클럭은 2-7의 분주기가 만들고, 실제 버튼 입력은 2-4의 디바운서를 거친다. " +
        "큰 회로도 결국 이 작은 부품들의 조합이다.",
    },
    {
      title: "넘침과 안전 조건",
      body:
        "sec는 8비트(0~255)라서 240에 30을 더하면 270이 아니라 14가 된다(넘침). 그래서 210 이하일 때만 더하고, 아니면 240으로 둔다: sec <= (sec <= 210) ? sec + 30 : 240; " +
        "그리고 문이 열려 있으면 절대 동작하지 않게 start 조건에 !door를 넣는다. 안전에 관한 조건은 의뢰서에 없더라도 먼저 물어보자.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "전자레인지 제어기",
      goal: "상태도대로 case (state)의 네 상태를 채우세요. 대기: add면 +30(최대 240), 아니면 start·문 닫힘·sec > 0일 때 동작. 동작: 문 열리면 멈춤, 아니면 sec - 1(1이었으면 끝으로, b <= 0). 멈춤: start·문 닫힘이면 동작. 끝: b가 2면 대기, 아니면 b + 1.",
      top: "microwave",
      skeleton: code("      // IDLE, RUN, PAUSE, DONE을 상태도대로 채우세요\n      default: state <= IDLE;\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "add", width: 1 }, { name: "start", width: 1 }, { name: "door", width: 1 }],
      outputs: [{ name: "heat", width: 1 }, { name: "beep", width: 1 }, { name: "sec", width: 8 }],
      labels: { rst: "리셋", add: "+30초", start: "시작", door: "문 열림", heat: "가열", beep: "삐", sec: "남은 초" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: clocked(CYCLES, ["rst"]),
        model() {
          let s = 0;
          let sec = 0;
          let b = 0;
          let last = 0;
          return ({ clk, rst, add, start, door }) => {
            if (clk && !last) {
              if (rst) [s, sec, b] = [0, 0, 0];
              else if (s === 0) {
                if (add) sec = Math.min(240, sec + 30);
                else if (start && !door && sec > 0) s = 1;
              } else if (s === 1) {
                if (door) s = 2;
                else {
                  if (sec === 1) [s, b] = [3, 0];
                  sec--;
                }
              } else if (s === 2) {
                if (start && !door) s = 1;
              } else if (b === 2) s = 0;
              else b++;
            }
            last = clk;
            return { heat: s === 1 ? 1 : 0, beep: s === 3 ? 1 : 0, sec };
          };
        },
      },
      reference: REF,
      wrong: [
        // 문이 열려도 계속 가열
        REF.replace("        if (door) state <= PAUSE;\n        else begin\n", "        begin\n"),
        // 삐 1초만
        REF.replace("if (b == 2) state <= IDLE;", "if (b == 0) state <= IDLE;"),
        // 240 제한 없음: 넘쳐서 14초
        REF.replace("(sec <= 210) ? sec + 30 : 240", "sec + 30"),
        // 문이 열려 있어도 시작
        REF.replace("else if (start && !door && sec != 0) state <= RUN;", "else if (start && sec != 0) state <= RUN;"),
      ],
      hint: "IDLE: if (add) sec <= (sec <= 210) ? sec + 30 : 240; else if (start && !door && sec != 0) state <= RUN;  RUN: if (door) state <= PAUSE; else begin sec <= sec - 1; if (sec == 1) begin state <= DONE; b <= 0; end end",
    },
  ],
  realWorld: [
    {
      title: "2장을 마치며: 실제 제품에서는",
      body:
        "실제 전자레인지는 이 제어기를 MCU의 펌웨어로 짜는 경우가 많다. 하지만 생각하는 방법은 똑같다: 상태도, 카운터, 넘침 검사, 안전 조건. 그리고 문 스위치처럼 사람이 다치는 것과 관련된 부분은 소프트웨어만 믿지 않고, 문이 열리면 전원 자체를 끊는 스위치(인터록, 1-1에서 만든 것!)를 따로 둔다. " +
        "다음 3장에서는 이 부품들로 아주 작은 컴퓨터를 만든다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "8비트 sec가 240일 때 넘침 검사 없이 30을 더하면 sec는 몇이 될까?",
      answer: 14,
      tolerance: 0.01,
      unit: "",
      explain: "270 - 256 = 14. 8비트는 256에서 한 바퀴 돈다.",
    },
    {
      kind: "choice",
      q: "문 안전 조건을 펌웨어(코드)와 별도로 하드웨어 스위치로도 두는 이유는?",
      choices: ["부품이 싸서", "코드에 버그가 있어도 사람이 다치지 않게 하려고", "속도가 빨라서"],
      answer: 1,
      explain: "안전과 관련된 기능은 한 겹이 실패해도 다른 겹이 막도록 이중으로 둔다.",
    },
  ],
  glossary: ["fsm", "counter"],
};
