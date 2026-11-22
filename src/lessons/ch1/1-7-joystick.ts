import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["l:in", "d:in", "r:in", "u:in", "y1:out", "y0:out"];
const HEAD = "module joystick(input [3:0] btn, output reg [1:0] dir, output reg valid);\n";

/** 번호 큰 버튼이 이긴다. 아무것도 안 눌리면 dir 0, valid 0 */
const prio = (btn: number) => (btn & 8 ? 3 : btn & 4 ? 2 : btn & 2 ? 1 : 0);

export const lesson: Lesson = {
  id: "1-7",
  chapter: 1,
  title: "조이스틱 방향",
  emoji: "🕹️",
  minutes: 15,
  client: {
    from: "게임기 회사 ‘뿅뿅랩’",
    request:
      "조이스틱 방향 버튼 4개(위·오른쪽·아래·왼쪽)를 본체에 2비트 코드로 보내고 싶습니다. 위=0, 오른쪽=1, 아래=2, 왼쪽=3이고, 여러 개가 같이 눌리면 번호가 큰 쪽을 보내 주세요.",
    requirements: ["버튼 4개 → 2비트 방향 코드", "동시에 눌리면 번호 큰 버튼 우선", "Verilog 버전은 아무것도 안 눌렸는지(valid)도 알려 주기"],
  },
  concepts: [
    {
      title: "줄이는 회로: 인코더",
      body:
        "1-6의 [[decoder]]가 ‘숫자 → 여러 출력’이었다면, [[encoder]]는 반대로 ‘여러 입력 중 눌린 것 → 숫자’다. 버튼 4개는 2비트면 번호를 붙일 수 있다(00, 01, 10, 11). " +
        "선 4가닥이 2가닥으로 줄어서, 칩 핀이나 전선을 아낄 때 쓴다.",
    },
    {
      title: "동시에 눌리면? 우선순위",
      body:
        "그냥 OR로 묶으면 두 버튼이 같이 눌렸을 때 코드가 섞여 엉뚱한 값이 된다. 그래서 ‘번호 큰 쪽이 이긴다’ 같은 우선순위를 정한다([[priority-encoder]]). " +
        "식으로 쓰면 y1 = 왼쪽 OR 아래, y0 = 왼쪽 OR (오른쪽 AND NOT 아래). 아래가 눌려 있으면 오른쪽은 무시된다.",
    },
    {
      title: "Verilog: if / else if",
      body:
        "우선순위는 Verilog의 if … else if … else로 쓰면 그대로다. 위에 쓴 조건이 먼저 검사되고, 맞으면 아래는 보지 않는다. " +
        "always @(*) 안에서는 모든 경우에 출력값을 넣어 줘야 한다(빠뜨리면 1-6에서 본 래치가 생긴다).",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "우선순위 인코더 그리기",
      goal: "왼쪽(3)·아래(2)·오른쪽(1)·위(0) 버튼을 2비트 코드 y1 y0으로 바꾸세요. 같이 눌리면 번호 큰 쪽. 위 버튼은 코드가 00이라 연결할 곳이 없어요.",
      palette: [
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "or", kind: "chip", chip: "or", label: "OR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["l", "d", "r", "u"],
      outputs: ["y1", "y0"],
      labels: { l: "왼쪽(3)", d: "아래(2)", r: "오른쪽(1)", u: "위(0)", y1: "y1", y0: "y0" },
      expect: Array.from({ length: 16 }, (_, n) => {
        const code = prio(n);
        return [(code >> 1) as 0 | 1, (code & 1) as 0 | 1];
      }),
      reference: lckt(
        [...IO, "or1:chip:or", "not1:chip:not", "and1:chip:and", "or2:chip:or"],
        ["l.y~or1.a", "d.y~or1.b", "or1.y~y1.a", "d.y~not1.a", "not1.y~and1.a", "r.y~and1.b", "l.y~or2.a", "and1.y~or2.b", "or2.y~y0.a"],
      ),
      wrong: [
        // 우선순위 없이 OR만: 아래+오른쪽이면 11(왼쪽)이 나온다
        lckt([...IO, "or1:chip:or", "or2:chip:or"], ["l.y~or1.a", "d.y~or1.b", "or1.y~y1.a", "l.y~or2.a", "r.y~or2.b", "or2.y~y0.a"]),
        lckt(
          [...IO, "not1:chip:not", "and1:chip:and", "or2:chip:or"],
          ["d.y~y1.a", "d.y~not1.a", "not1.y~and1.a", "r.y~and1.b", "l.y~or2.a", "and1.y~or2.b", "or2.y~y0.a"],
        ),
      ],
      hint: "y1 = OR(왼쪽, 아래). y0 = OR(왼쪽, AND(오른쪽, NOT 아래)). 칩 4개면 돼요.",
    },
    {
      kind: "verilog",
      title: "Verilog 인코더 + valid",
      goal: "btn[3]=왼쪽 … btn[0]=위. 눌린 것 중 번호 큰 버튼을 dir로, 하나라도 눌렸으면 valid = 1로 하세요.",
      top: "joystick",
      skeleton: HEAD + "  always @(*) begin\n    // if (btn[3]) ... else if ...\n\n  end\nendmodule\n",
      inputs: [{ name: "btn", width: 4 }],
      outputs: [
        { name: "dir", width: 2 },
        { name: "valid", width: 1 },
      ],
      labels: { btn: "btn(왼아오위)", dir: "dir", valid: "valid" },
      spec: ({ btn }) => ({ dir: prio(btn), valid: btn ? 1 : 0 }),
      reference:
        HEAD +
        "  always @(*) begin\n    valid = 1;\n    if (btn[3]) dir = 2'd3;\n    else if (btn[2]) dir = 2'd2;\n    else if (btn[1]) dir = 2'd1;\n    else begin\n      dir = 2'd0;\n      valid = btn[0];\n    end\n  end\nendmodule\n",
      wrong: [
        HEAD +
          "  always @(*) begin\n    valid = |btn;\n    if (btn[0]) dir = 2'd0;\n    else if (btn[1]) dir = 2'd1;\n    else if (btn[2]) dir = 2'd2;\n    else dir = 2'd3;\n  end\nendmodule\n",
        HEAD +
          "  always @(*) begin\n    valid = 1;\n    if (btn[3]) dir = 2'd3;\n    else if (btn[2]) dir = 2'd2;\n    else if (btn[1]) dir = 2'd1;\n    else dir = 2'd0;\n  end\nendmodule\n",
      ],
      hint: "맨 앞에 valid = 1; 을 두고, if (btn[3]) dir = 2'd3; else if (btn[2]) … 마지막 else에서 dir = 0, valid = btn[0].",
    },
  ],
  realWorld: [
    {
      title: "키보드와 인터럽트",
      body:
        "컴퓨터 키보드도 키 위치를 코드로 바꿔서 보낸다(인코더). MCU 안에는 여러 장치가 동시에 ‘나 좀 봐 줘’ 하고 부를 때 어느 것부터 처리할지 정하는 우선순위 인코더가 있다(인터럽트 컨트롤러). " +
        "실제 조이스틱은 버튼이 튀는 문제(바운스)도 있는데, 이건 2장에서 다룬다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "버튼 8개에 번호를 붙이려면 최소 몇 비트가 필요할까?",
      answer: 3,
      tolerance: 0.01,
      unit: "비트",
      explain: "3비트면 000~111, 8가지를 나타낼 수 있다. 4개는 2비트, 16개는 4비트.",
    },
    {
      kind: "choice",
      q: "이 과제에서 아래(2)와 오른쪽(1)이 같이 눌리면 코드는?",
      choices: ["01 (오른쪽)", "10 (아래)", "11 (왼쪽)"],
      answer: 1,
      explain: "번호 큰 쪽이 이긴다. 우선순위가 없으면 01과 10이 섞여 11(왼쪽)이 되는 버그가 생긴다.",
    },
  ],
  glossary: ["encoder", "priority-encoder"],
};
