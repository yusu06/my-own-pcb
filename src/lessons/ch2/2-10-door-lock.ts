import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD =
  "module door_lock(input clk, input rst, input press, input [3:0] key, output unlock);\n" +
  "  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, OPEN = 2'd3;\n  reg [1:0] state;\n";
const code = (body: string) =>
  HEAD + "  always @(posedge clk) begin\n    if (rst) state <= S0;\n" + body + "  end\n  assign unlock = (state == OPEN);\nendmodule\n";

/** 비밀번호 2-5-1. 틀린 숫자가 2면 ‘2를 하나 맞춘 상태’로 */
const REF = code(
  "    else if (state == OPEN) state <= (press && key == 2) ? S1 : S0;\n" +
    "    else if (press) begin\n" +
    "      case (state)\n" +
    "        S0: state <= (key == 2) ? S1 : S0;\n" +
    "        S1: state <= (key == 5) ? S2 : (key == 2) ? S1 : S0;\n" +
    "        S2: state <= (key == 1) ? OPEN : (key == 2) ? S1 : S0;\n" +
    "        default: state <= S0;\n" +
    "      endcase\n" +
    "    end\n",
);

/** press = 1인 주기에 누른 숫자. 사이사이 쉬는 주기(press = 0)에는 key가 아무 값이어도 무시 */
const typed = (digits: number[]) => digits.flatMap((key) => [{ rst: 0, press: 1, key }, { rst: 0, press: 0, key: 7 }]);
const CYCLES = [
  { rst: 1, press: 0, key: 0 },
  ...typed([2, 5, 1]),
  ...typed([2, 5, 3, 1]),
  ...typed([2, 2, 5, 1]),
  { rst: 0, press: 0, key: 2 }, { rst: 0, press: 0, key: 5 }, { rst: 0, press: 0, key: 1 },
  ...typed([5, 1, 2, 5, 2, 5, 1]),
];

export const lesson: Lesson = {
  id: "2-10",
  chapter: 2,
  title: "번호 도어락",
  emoji: "🔐",
  minutes: 20,
  client: {
    from: "공유 오피스 ‘같이일터’",
    request:
      "회의실 문에 번호 자물쇠를 달아요. 2 → 5 → 1을 차례로 누르면 한 순간(1주기) 문이 열리는 신호를 주세요. 순서가 틀리면 처음부터 다시 눌러야 하고요.",
    requirements: [
      "press = 1인 주기에만 key(0~15)를 읽는다",
      "2, 5, 1을 차례로 누르면 unlock = 1이 한 주기",
      "중간에 틀리면 처음으로. 단, 틀린 숫자가 2면 ‘첫 숫자를 맞춘 상태’로",
    ],
  },
  concepts: [
    {
      title: "몇 개까지 맞췄나를 상태로",
      body:
        "도어락은 ‘지금까지 비밀번호를 몇 자리 맞췄는지’를 기억하면 된다. 아무것도 못 맞춤(S0) → 2를 맞춤(S1) → 2·5를 맞춤(S2) → 다 맞춤(OPEN). OPEN은 한 주기만 머물고 S0으로 돌아간다. " +
        "이렇게 정해진 순서의 입력을 찾아내는 FSM을 순서 검출기라고 한다.",
      states: {
        nodes: [
          { id: "s0", label: "S0", x: 0, y: 100 },
          { id: "s1", label: "S1", x: 30, y: 30 },
          { id: "s2", label: "S2", x: 70, y: 30 },
          { id: "open", label: "열림", x: 100, y: 100 },
        ],
        edges: [
          { from: "s0", to: "s1", label: "2" },
          { from: "s1", to: "s2", label: "5" },
          { from: "s2", to: "open", label: "1" },
          { from: "s1", to: "s1", label: "2" },
          { from: "s2", to: "s0", label: "그 밖" },
          { from: "open", to: "s0", label: "다음 주기" },
        ],
      },
    },
    {
      title: "틀렸을 때 어디로 돌아가나",
      body:
        "2-2-5-1처럼 누르면 어떨까? 두 번째 2에서 ‘틀렸으니 처음으로’ 가면, 그 2를 버리게 되어 뒤의 5-1로 문이 안 열린다. 그 2는 새 시작의 첫 숫자이기도 하니 S1로 가야 한다. " +
        "순서 검출기를 만들 때는 ‘틀린 입력이 새 시작이 될 수 있는가’를 꼭 따져 본다.",
    },
    {
      title: "누를 때만 보기",
      body:
        "key 선은 버튼을 누르지 않아도 아무 값이나 있을 수 있다. 그래서 press = 1인 주기에만 상태를 바꾼다: else if (press) begin case (state) … endcase end. " +
        "press가 0이면 값을 넣지 않으니 상태는 그대로 유지된다(OPEN만 예외로 다음 주기에 S0).",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "도어락 FSM",
      goal: "S0 → S1 → S2 → OPEN 상태로 2-5-1을 찾아내세요. press = 1일 때만 key를 보고, 틀린 숫자가 2면 S1로, 그 밖에 틀리면 S0으로. OPEN은 한 주기 뒤 S0(그때 2를 누르면 S1).",
      top: "door_lock",
      skeleton: code("    // OPEN이면: press이고 key가 2면 S1, 아니면 S0\n    // press면 case (state)로 S0, S1, S2의 다음 상태\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "press", width: 1 }, { name: "key", width: 4 }],
      outputs: [{ name: "unlock", width: 1 }],
      labels: { rst: "리셋", press: "누름", key: "숫자", unlock: "열림" },
      seq: {
        steps: clocked(CYCLES, ["rst"]),
        model() {
          let s = 0;
          let last = 0;
          const after = (st: number, key: number) =>
            st === 0 ? (key === 2 ? 1 : 0) : st === 1 ? (key === 5 ? 2 : key === 2 ? 1 : 0) : key === 1 ? 3 : key === 2 ? 1 : 0;
          return ({ clk, rst, press, key }) => {
            if (clk && !last) {
              if (rst) s = 0;
              else if (s === 3) s = press && key === 2 ? 1 : 0;
              else if (press) s = after(s, key);
            }
            last = clk;
            return { unlock: s === 3 ? 1 : 0 };
          };
        },
      },
      reference: REF,
      wrong: [
        // 틀린 숫자가 2여도 처음으로: 2-2-5-1에서 안 열림
        REF.replace("S1: state <= (key == 5) ? S2 : (key == 2) ? S1 : S0;", "S1: state <= (key == 5) ? S2 : S0;"),
        // 틀려도 처음으로 돌아가지 않음
        REF.replace("S2: state <= (key == 1) ? OPEN : (key == 2) ? S1 : S0;", "S2: state <= (key == 1) ? OPEN : S2;"),
        // press를 보지 않음: 쉬는 주기의 key까지 읽는다
        REF.replace("    else if (press) begin\n", "    else begin\n"),
      ],
      hint: "S0: (key == 2) ? S1 : S0.  S1: (key == 5) ? S2 : (key == 2) ? S1 : S0.  S2: (key == 1) ? OPEN : (key == 2) ? S1 : S0.",
    },
  ],
  realWorld: [
    {
      title: "진짜 도어락은 더 조심한다",
      body:
        "실제 제품은 비밀번호를 바꿀 수 있게 레지스터에 저장하고, 여러 번 틀리면 잠시 잠그며, 키를 누를 때마다 디바운싱(2-4)을 거친다. 또 ‘열림’ 신호로 모터나 전자석을 움직이려면 큰 전류가 필요해서 트랜지스터(0-7)나 드라이버 칩을 거친다. " +
        "보안 제품은 상태가 몇 개 안 되어도 모든 화살표를 표로 정리해 빠진 경우가 없는지 검토한다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "S1(2를 맞춤)에서 다시 2를 누르면 어디로 가야 할까?",
      choices: ["S0", "S1", "S2"],
      answer: 1,
      explain: "방금 누른 2가 새 시작의 첫 숫자가 될 수 있으니 S1에 머문다. 그래야 2-2-5-1로도 열린다.",
    },
    {
      kind: "number",
      q: "비밀번호가 4자리면, 이 방식의 도어락 상태는 ‘아무것도 못 맞춤’과 ‘열림’까지 몇 개일까?",
      answer: 5,
      tolerance: 0.01,
      unit: "개",
      explain: "0자리, 1자리, 2자리, 3자리 맞춤 + 열림 = 5개.",
    },
  ],
  glossary: ["fsm", "state"],
};
