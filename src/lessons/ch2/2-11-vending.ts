import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD =
  "module vending(input clk, input rst, input c100, input c500, output reg vend, output reg [9:0] change);\n" +
  "  reg [9:0] amt;\n";
const TOTAL = "  wire [9:0] total = amt + (c100 ? 10'd100 : 10'd0) + (c500 ? 10'd500 : 10'd0);\n";
const code = (total: string, body: string) =>
  HEAD + total +
  "  always @(posedge clk) begin\n    if (rst) begin\n      amt <= 0;\n      vend <= 0;\n      change <= 0;\n    end\n" +
  body + "  end\nendmodule\n";
const OK_BODY =
  "    else if (total >= 300) begin\n      vend <= 1;\n      change <= total - 300;\n      amt <= 0;\n    end\n" +
  "    else begin\n      vend <= 0;\n      change <= 0;\n      amt <= total;\n    end\n";

const PRICE = 300;
type Coin = { c100?: number; c500?: number };
const coin = (c: Coin) => ({ rst: 0, c100: c.c100 ?? 0, c500: c.c500 ?? 0 });
const A = { c100: 1 };
const B = { c500: 1 };
const IDLE = {};
const CYCLES = [{ rst: 1, c100: 0, c500: 0 }, ...[A, A, IDLE, A, IDLE, B, IDLE, A, B, IDLE, A, A, IDLE, B, IDLE, IDLE].map(coin)];

export const lesson: Lesson = {
  id: "2-11",
  chapter: 2,
  title: "음료 자판기",
  emoji: "🥤",
  minutes: 20,
  client: {
    from: "학교 매점",
    request:
      "300원짜리 음료 하나만 파는 작은 자판기를 만들어요. 100원과 500원 동전을 받고, 300원 이상이 되면 음료를 내주고 남은 돈은 거슬러 주세요.",
    requirements: [
      "한 주기에 동전은 하나(c100 또는 c500)",
      "모은 돈이 300원 이상이 되는 에지에 vend = 1(한 주기), change = 넘은 금액",
      "그러고 나면 모은 돈은 0원",
      "rst = 1이면 모두 0",
    ],
  },
  concepts: [
    {
      title: "모은 금액이 곧 상태",
      body:
        "음료를 내주기 전까지 자판기가 기억할 것은 ‘지금까지 얼마 넣었나’뿐이다: 0원, 100원, 200원. 300원 이상이 되는 순간 음료를 내주고 다시 0원으로 간다. 그래서 금액 자체를 상태로 저장하면 된다. " +
        "상태도로 그리면 아래와 같다(500원은 어느 상태에서든 바로 300원을 넘긴다).",
      states: {
        nodes: [
          { id: "0", label: "0원", x: 0, y: 60 },
          { id: "1", label: "100원", x: 50, y: 0 },
          { id: "2", label: "200원", x: 100, y: 60 },
        ],
        edges: [
          { from: "0", to: "1", label: "100" },
          { from: "1", to: "2", label: "100" },
          { from: "2", to: "0", label: "100 → 음료" },
          { from: "1", to: "0", label: "500 → 음료" },
          { from: "0", to: "0", label: "500 → 음료" },
        ],
      },
    },
    {
      title: "이번 에지의 합계를 먼저",
      body:
        "‘지금 모은 돈 + 이번에 들어온 동전’을 먼저 계산해 두면 조건이 간단해진다: wire [9:0] total = amt + (c100 ? 10'd100 : 10'd0) + (c500 ? 10'd500 : 10'd0); " +
        "그다음 에지에서 total >= 300이면 음료와 거스름돈, 아니면 amt <= total. 금액은 최대 700원이라 10비트(0~1023)면 충분하다.",
    },
    {
      title: "출력도 레지스터로",
      body:
        "vend와 change는 에지에서 정해서 한 주기 동안 유지한다(output reg). 음료를 준 다음 주기에는 vend <= 0으로 꼭 내려야 한다. 그러지 않으면 음료가 계속 나온다! " +
        "에지마다 모든 출력에 값을 정해 주는 습관이 이런 실수를 막는다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "자판기 FSM",
      goal: "total(지금까지 + 이번 동전)이 300 이상이면 vend <= 1, change <= total - 300, amt <= 0. 아니면 vend <= 0, change <= 0, amt <= total.",
      top: "vending",
      skeleton: code(TOTAL, "    // total >= 300 이면 음료와 거스름돈, 아니면 모으기\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "c100", width: 1 }, { name: "c500", width: 1 }],
      outputs: [{ name: "vend", width: 1 }, { name: "change", width: 10 }],
      labels: { rst: "리셋", c100: "100원", c500: "500원", vend: "음료", change: "거스름" },
      seq: {
        steps: clocked(CYCLES, ["rst"]),
        model() {
          let amt = 0;
          let vend = 0;
          let change = 0;
          let last = 0;
          return ({ clk, rst, c100, c500 }) => {
            if (clk && !last) {
              const total = amt + (c100 ? 100 : 0) + (c500 ? 500 : 0);
              if (rst) [amt, vend, change] = [0, 0, 0];
              else if (total >= PRICE) [amt, vend, change] = [0, 1, total - PRICE];
              else [amt, vend, change] = [total, 0, 0];
            }
            last = clk;
            return { vend, change };
          };
        },
      },
      reference: code(TOTAL, OK_BODY),
      wrong: [
        // 거스름돈을 안 줌
        code(TOTAL, OK_BODY.replace("change <= total - 300;", "change <= 0;")),
        // 500원을 100원으로 셈
        code(TOTAL.replace("10'd500", "10'd100"), OK_BODY),
        // vend를 내리지 않아 음료가 계속 나옴
        code(TOTAL, OK_BODY.replace("    else begin\n      vend <= 0;\n", "    else begin\n")),
      ],
      hint: "else if (total >= 300) begin vend <= 1; change <= total - 300; amt <= 0; end else begin vend <= 0; change <= 0; amt <= total; end",
    },
  ],
  realWorld: [
    {
      title: "실제 자판기의 동전 처리",
      body:
        "실제 동전 투입구는 동전의 크기·무게·금속 성분을 센서로 재서 종류를 가려내고, 펄스 신호로 MCU에 알린다. 동전 두 개가 거의 동시에 들어오는 경우, 거스름돈이 모자란 경우, 전원이 나간 경우까지 상태로 다뤄야 해서 실제 상태도는 훨씬 크다. " +
        "그래도 뼈대는 이 단원과 같다: ‘모은 금액’ 상태 + ‘값이 넘으면 내주기’.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "200원을 넣은 상태에서 500원을 넣으면 거스름돈은 몇 원일까?",
      answer: 400,
      tolerance: 0.01,
      unit: "원",
      explain: "200 + 500 = 700원, 음료 300원을 빼면 400원.",
    },
    {
      kind: "choice",
      q: "음료를 준 다음 주기에 vend <= 0을 빠뜨리면?",
      choices: ["아무 문제 없다", "vend가 1로 남아 음료가 계속 나온다", "문법 오류"],
      answer: 1,
      explain: "posedge 블록에서 값을 안 넣으면 유지된다(2-5). 출력은 에지마다 값을 정해 주자.",
    },
  ],
  glossary: ["fsm", "state-diagram"],
};
