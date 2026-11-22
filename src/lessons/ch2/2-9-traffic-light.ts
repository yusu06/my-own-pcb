import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD =
  "module traffic(input clk, input rst, output red, output yellow, output green);\n" +
  "  localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;\n  reg [1:0] state;\n  reg [2:0] t;\n";
const OUTS = "  assign green = (state == GREEN);\n  assign yellow = (state == YELLOW);\n  assign red = (state == RED);\n";
const code = (cases: string) =>
  HEAD +
  "  always @(posedge clk) begin\n    if (rst) begin\n      state <= GREEN;\n      t <= 0;\n    end\n    else case (state)\n" +
  cases +
  "      default: begin state <= GREEN; t <= 0; end\n    endcase\n  end\n" +
  OUTS +
  "endmodule\n";
const greenFor = (n: number, next = "YELLOW") => `      GREEN: if (t == ${n - 1}) begin state <= ${next}; t <= 0; end else t <= t + 1;\n`;
const YEL = "      YELLOW: begin state <= RED; t <= 0; end\n";
const REDC = "      RED: if (t == 2) begin state <= GREEN; t <= 0; end else t <= t + 1;\n";

/** 초록 4, 노랑 1, 빨강 3 (클럭 한 칸 = 1초라고 친다) */
const STAY = [4, 1, 3];

export const lesson: Lesson = {
  id: "2-9",
  chapter: 2,
  title: "신호등 제어기",
  emoji: "🚦",
  minutes: 20,
  client: {
    from: "아파트 단지 관리사무소",
    request:
      "단지 안 건널목에 작은 신호등을 달아요. 초록 4초 → 노랑 1초 → 빨강 3초를 계속 반복하고, 리셋하면 초록부터 다시 시작하게 해 주세요.",
    requirements: ["클럭 한 칸 = 1초", "초록 4 → 노랑 1 → 빨강 3 → 초록 …", "불은 항상 하나만", "rst = 1이면 초록부터"],
  },
  concepts: [
    {
      title: "지금 무슨 단계인가: 상태",
      body:
        "신호등은 ‘지금 초록인지, 노랑인지, 빨강인지’를 기억하고, 정해진 조건이 되면 다음 단계로 넘어간다. 이 ‘지금 단계’를 [[state]]라고 하고, 상태를 기억하며 조건에 따라 옮겨 다니는 회로를 [[fsm]](유한 상태 기계)이라고 한다. " +
        "아래 그림처럼 동그라미(상태)와 화살표(넘어가는 조건)로 그린 것이 [[state-diagram]]이다.",
      states: {
        nodes: [
          { id: "g", label: "초록", x: 10, y: 60 },
          { id: "y", label: "노랑", x: 50, y: 0 },
          { id: "r", label: "빨강", x: 90, y: 60 },
        ],
        edges: [
          { from: "g", to: "y", label: "4초 지남" },
          { from: "y", to: "r", label: "1초 지남" },
          { from: "r", to: "g", label: "3초 지남" },
        ],
      },
    },
    {
      title: "상태에 이름 붙이기",
      body:
        "상태는 레지스터에 숫자로 저장한다: reg [1:0] state; 상태가 3개라 2비트면 된다. 숫자 그대로 쓰면 헷갈리니 localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2; 처럼 이름을 붙인다. " +
        "그다음 always @(posedge clk) 안에서 case (state)로 상태마다 ‘다음 상태’를 정한다.",
    },
    {
      title: "머무는 시간은 작은 카운터로",
      body:
        "초록에서 4초를 버티려면 상태 안에서 몇 초가 지났는지 세는 카운터 t가 필요하다. t가 3이 되는 에지(0, 1, 2, 3 → 네 번째)에 다음 상태로 넘어가며 t를 0으로 돌린다. " +
        "불빛은 상태만 보고 정해지니 assign green = (state == GREEN); 처럼 쓴다. 출력이 상태에만 달린 이런 FSM을 무어(Moore) 기계라고 부른다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "신호등 FSM",
      goal: "case (state) 안에 초록·노랑·빨강의 다음 상태를 채우세요. 초록 4, 노랑 1, 빨강 3주기.",
      top: "traffic",
      skeleton: code("      // GREEN: t가 3이면 YELLOW로(t <= 0), 아니면 t <= t + 1\n      // YELLOW: 바로 RED로\n      // RED: t가 2면 GREEN으로, 아니면 t <= t + 1\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }],
      outputs: [{ name: "red", width: 1 }, { name: "yellow", width: 1 }, { name: "green", width: 1 }],
      labels: { rst: "리셋", red: "빨강", yellow: "노랑", green: "초록" },
      seq: {
        steps: clocked(
          Array.from({ length: 22 }, (_, k) => ({ rst: k === 0 || k === 13 ? 1 : 0 })),
          ["rst"],
        ),
        model() {
          let s = 0;
          let t = 0;
          let last = 0;
          return ({ clk, rst }) => {
            if (clk && !last) {
              if (rst) [s, t] = [0, 0];
              else if (t === STAY[s] - 1) [s, t] = [(s + 1) % 3, 0];
              else t++;
            }
            last = clk;
            return { green: s === 0 ? 1 : 0, yellow: s === 1 ? 1 : 0, red: s === 2 ? 1 : 0 };
          };
        },
      },
      reference: code(greenFor(4) + YEL + REDC),
      wrong: [
        code(greenFor(4, "RED") + YEL + REDC),
        code(greenFor(5) + YEL + REDC),
        code(greenFor(4) + YEL + "      RED: begin state <= GREEN; t <= 0; end\n"),
      ],
      hint: "GREEN: if (t == 3) begin state <= YELLOW; t <= 0; end else t <= t + 1;  YELLOW: begin state <= RED; t <= 0; end  RED: if (t == 2) begin state <= GREEN; t <= 0; end else t <= t + 1;",
    },
  ],
  realWorld: [
    {
      title: "FSM은 기기의 ‘두뇌 순서도’",
      body:
        "세탁기(불림 → 세탁 → 헹굼 → 탈수), 엘리베이터, 통신 칩의 주고받기 순서까지 ‘단계가 있는 동작’은 대부분 FSM으로 만든다. 실무에서는 코드를 쓰기 전에 상태도를 먼저 그려 의뢰인과 확인한다. " +
        "그림에서 빠진 화살표(예: 정전 뒤 이상한 상태)가 버그의 단골 원인이라, default로 안전한 상태로 돌아가게 해 둔다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "상태가 5개인 FSM의 state 레지스터는 최소 몇 비트일까?",
      answer: 3,
      tolerance: 0.01,
      unit: "비트",
      explain: "2비트는 4가지, 3비트는 8가지. 5개를 담으려면 3비트.",
    },
    {
      kind: "choice",
      q: "출력이 ‘지금 상태’에만 달린 FSM을 무엇이라 부를까?",
      choices: ["무어(Moore) 기계", "밀리(Mealy) 기계", "래치"],
      answer: 0,
      explain: "무어 기계는 출력이 상태만으로 정해진다. 입력까지 바로 보고 출력하면 밀리 기계.",
    },
    {
      kind: "choice",
      q: "case (state)에 default를 써 두는 이유는?",
      choices: ["문법상 꼭 필요해서", "정의하지 않은 상태 값에 빠졌을 때 안전한 상태로 돌아오게", "속도를 빠르게 하려고"],
      answer: 1,
      explain: "2비트 state에는 상태 3개 말고 값 3(11)도 있다. 잡음 등으로 거기에 빠지면 default가 구해 준다.",
    },
  ],
  glossary: ["fsm", "state", "state-diagram"],
};
