import type { Lesson } from "../types";
import { lckt } from "../lckt";
import { clocked } from "../seq";

const IO = ["clk:in", "slow:out"];
const HEAD = "module one_second(input clk, input rst, output reg tick);\n  reg [9:0] cnt;\n";
const code = (body: string) => HEAD + "  always @(posedge clk) begin\n" + body + "  end\nendmodule\n";
const tickAt = (last: number) =>
  code(
    "    if (rst) begin\n      cnt <= 0;\n      tick <= 0;\n    end\n" +
      `    else if (cnt == ${last}) begin\n      cnt <= 0;\n      tick <= 1;\n    end\n` +
      "    else begin\n      cnt <= cnt + 1;\n      tick <= 0;\n    end\n",
  );
/** 1주기 = 1ms. 2초가 조금 넘게 */
const CYCLES = 2100;

export const lesson: Lesson = {
  id: "2-7",
  chapter: 2,
  title: "1초 만들기",
  emoji: "🕐",
  minutes: 18,
  client: {
    from: "주방 가전 회사 ‘따끈’",
    request:
      "지난번 타이머는 클럭마다 1씩 줄어서, 1ms 클럭에 연결하니 1초가 아니라 1ms마다 줄어들었어요. 1ms 클럭에서 정확히 1초마다 한 번씩 ‘째깍’ 신호를 만들어 주세요.",
    requirements: ["클럭 1주기 = 1ms(1000Hz)", "1000주기마다 tick = 1을 한 주기 동안", "rst = 1이면 처음부터"],
  },
  concepts: [
    {
      title: "빠른 박자를 세어 느린 박자로: 분주기",
      body:
        "1ms 클럭을 1000번 세면 1초다. 카운터가 0부터 999까지 세다가 999에서 0으로 돌아가는 순간에 tick을 한 번 내면, tick은 1초에 한 번 나온다. 이렇게 주파수를 나누는 회로가 [[divider]]다. " +
        "999까지 세려면 10비트가 필요하다(2¹⁰ = 1024).",
    },
    {
      title: "플립플롭 하나는 절반으로",
      body:
        "D 플립플롭의 d에 NOT q를 이으면 에지마다 q가 뒤집힌다. 그러면 q는 clk보다 두 배 느리게 깜빡인다(1/2). 그 q를 다음 플립플롭의 clk로 쓰면 또 절반, 합쳐서 1/4. " +
        "이렇게 이어 붙인 것을 리플 분주기라고 한다. 간단하지만 2의 거듭제곱으로만 나눌 수 있어서, 1000처럼 딱 떨어지지 않는 수는 카운터로 센다.",
    },
    {
      title: "999인가 1000인가",
      body:
        "0부터 세면 0, 1, …, 999가 정확히 1000개다. 비교를 1000으로 쓰면 1001주기마다 tick이 나와서 하루에 1분 넘게 틀어진다. 경계 값은 손으로 작은 수(예: 3주기마다)로 바꿔 세어 보고 확인하자.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "리플 분주기 그리기",
      goal: "기본 D 플립플롭 2개와 NOT 2개로, clk보다 4배 느리게 깜빡이는 slow를 만드세요.",
      palette: [
        { id: "dff", kind: "dff", label: "D 플립플롭(기본)", multi: true },
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["clk"],
      outputs: ["slow"],
      labels: { slow: "느린 박자" },
      expect: [],
      seq: {
        steps: clocked(Array.from({ length: 10 }, () => ({}))) as Record<string, 0 | 1>[],
        model() {
          let q1 = 0;
          let q2 = 0;
          let last = 0;
          return ({ clk }) => {
            if (clk && !last) {
              q1 ^= 1;
              if (q1 === 1) q2 ^= 1; // 뒤 플립플롭은 q1이 올라갈 때
            }
            last = clk;
            return { slow: q2 as 0 | 1 };
          };
        },
      },
      reference: lckt(
        [...IO, "dff1:dff", "dff2:dff", "not1:chip:not", "not2:chip:not"],
        ["clk.y~dff1.clk", "dff1.q~not1.a", "not1.y~dff1.d", "dff1.q~dff2.clk", "dff2.q~not2.a", "not2.y~dff2.d", "dff2.q~slow.a"],
      ),
      wrong: [
        // 하나만: 2배 느림
        lckt([...IO, "dff1:dff", "not1:chip:not"], ["clk.y~dff1.clk", "dff1.q~not1.a", "not1.y~dff1.d", "dff1.q~slow.a"]),
        // 둘 다 clk에: 둘이 똑같이 뒤집혀 2배 느림
        lckt(
          [...IO, "dff1:dff", "dff2:dff", "not1:chip:not", "not2:chip:not"],
          ["clk.y~dff1.clk", "dff1.q~not1.a", "not1.y~dff1.d", "clk.y~dff2.clk", "dff2.q~not2.a", "not2.y~dff2.d", "dff2.q~slow.a"],
        ),
      ],
      hint: "각 플립플롭: q → NOT → 자기 d (에지마다 뒤집기). 첫 플립플롭 clk = clk, 둘째 플립플롭 clk = 첫 플립플롭의 q.",
    },
    {
      kind: "verilog",
      title: "Verilog로 1초 tick",
      goal: "10비트 cnt로 0~999를 세고, 999에서 0으로 돌아가는 에지에 tick <= 1(그 밖에는 0). rst면 둘 다 0. 결과는 약 4200단계라 틀린 곳 근처만 보여 줘요.",
      top: "one_second",
      skeleton: code("    // rst면 cnt <= 0; tick <= 0;\n    // cnt가 999면 cnt <= 0; tick <= 1;\n    // 아니면 cnt <= cnt + 1; tick <= 0;\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }],
      outputs: [{ name: "tick", width: 1 }],
      labels: { rst: "리셋", tick: "째깍" },
      seq: {
        steps: clocked(
          Array.from({ length: CYCLES }, (_, k) => ({ rst: k === 0 ? 1 : 0 })),
          ["rst"],
        ),
        model() {
          let cnt = 0;
          let tick = 0;
          let last = 0;
          return ({ clk, rst }) => {
            if (clk && !last) {
              if (rst) [cnt, tick] = [0, 0];
              else if (cnt === 999) [cnt, tick] = [0, 1];
              else [cnt, tick] = [cnt + 1, 0];
            }
            last = clk;
            return { tick };
          };
        },
      },
      reference: tickAt(999),
      wrong: [
        tickAt(1000),
        // 999에서 0으로 돌려놓지 않으면 1024주기마다
        code("    if (rst) begin\n      cnt <= 0;\n      tick <= 0;\n    end\n    else begin\n      cnt <= cnt + 1;\n      tick <= (cnt == 999);\n    end\n"),
      ],
      hint: "else if (cnt == 999) begin cnt <= 0; tick <= 1; end else begin cnt <= cnt + 1; tick <= 0; end",
    },
  ],
  realWorld: [
    {
      title: "32768Hz 시계 크리스털",
      body:
        "손목시계와 MCU의 시계에는 32768Hz짜리 크리스털이 흔히 쓰인다. 32768 = 2¹⁵라서, 플립플롭 15개짜리 리플 분주기만으로 정확히 1Hz가 나온다. 카운터 비교도 필요 없다. " +
        "MCU의 타이머 설정에 나오는 ‘프리스케일러(prescaler)’도 같은 분주기다. 빠른 클럭을 먼저 나눈 다음 센다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "1kHz(1ms) 클럭으로 1초 tick을 만들려면 카운터는 0부터 몇까지 세야 할까?",
      answer: 999,
      tolerance: 0.01,
      unit: "",
      explain: "0~999가 1000개. 999 다음에 0으로 돌아가며 tick.",
    },
    {
      kind: "choice",
      q: "D 플립플롭의 d에 NOT q를 이으면 q는?",
      choices: ["항상 0", "에지마다 뒤집혀서 clk의 절반 주파수", "clk와 똑같다"],
      answer: 1,
      explain: "에지마다 0↔1이 바뀌니, q가 한 번 0→1→0 하는 데 클럭 두 번이 걸린다.",
    },
    {
      kind: "number",
      q: "32768Hz를 1Hz로 만들려면 1/2 분주기(플립플롭)를 몇 개 이어야 할까?",
      answer: 15,
      tolerance: 0.01,
      unit: "개",
      explain: "32768 = 2¹⁵. 한 개마다 절반이니 15개.",
    },
  ],
  glossary: ["divider"],
};
