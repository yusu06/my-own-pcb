import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD = "module pcounter(input clk, input rst, input load, input [3:0] d, output reg [3:0] pc);\n";
const code = (body: string) => HEAD + "  always @(posedge clk) begin\n" + body + "  end\nendmodule\n";
const OK = "    if (rst) pc <= 0;\n    else if (load) pc <= d;\n    else pc <= pc + 1;\n";

/** 15→0 넘김, load 여러 번, 중간 rst, rst와 load가 같이 오는 주기 */
const CYCLES = [
  { rst: 1, load: 0, d: 0 },
  ...Array.from({ length: 4 }, () => ({ rst: 0, load: 0, d: 9 })),
  { rst: 0, load: 1, d: 13 },
  ...Array.from({ length: 4 }, () => ({ rst: 0, load: 0, d: 2 })),
  { rst: 0, load: 1, d: 2 },
  { rst: 0, load: 0, d: 7 },
  { rst: 0, load: 1, d: 7 },
  { rst: 0, load: 1, d: 7 },
  { rst: 0, load: 0, d: 0 },
  { rst: 1, load: 1, d: 11 },
  ...Array.from({ length: 3 }, () => ({ rst: 0, load: 0, d: 5 })),
  { rst: 0, load: 1, d: 15 },
  ...Array.from({ length: 3 }, () => ({ rst: 0, load: 0, d: 1 })),
];

export const lesson: Lesson = {
  id: "3-4",
  chapter: 3,
  title: "다음은 몇 번? 프로그램 카운터",
  emoji: "👉",
  minutes: 15,
  client: {
    from: "장난감 회사 ‘딸깍’",
    request:
      "명령어가 ROM에 순서대로 들어 있으니, ‘지금 몇 번 명령을 할 차례인지’ 가리키는 손가락이 필요해요. 보통은 한 칸씩 넘어가고, 점프하라는 명령이 오면 지정한 번호로 바로 옮겨 가게 해 주세요.",
    requirements: ["상승 에지마다 pc + 1 (15 다음은 0)", "load = 1이면 그 에지에 pc ← d", "rst = 1이면 0 (load보다 먼저)"],
  },
  concepts: [
    {
      title: "다음 명령의 주소를 든 레지스터",
      body:
        "CPU는 ROM에서 명령어를 하나씩 꺼내 실행한다. 지금 꺼낼 주소를 들고 있는 4비트 레지스터가 [[pc]](프로그램 카운터)다. " +
        "평소에는 명령 하나를 끝낼 때마다 1씩 늘어난다. 2-6 전자레인지 타이머가 1씩 줄던 [[counter]]였다면, PC는 1씩 느는 카운터다.",
    },
    {
      title: "점프 = 카운터에 값 넣기",
      body:
        "‘3번으로 돌아가라’(JMP 3) 같은 명령이 오면 PC에 1을 더하는 대신 새 주소를 넣는다. 2-6 타이머의 load와 똑같다: if (load) pc <= d; else pc <= pc + 1; " +
        "반복(같은 동작을 계속)과 갈림길(조건에 따라 다른 곳으로)은 모두 이 한 줄로 만들어진다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "4비트 프로그램 카운터",
      goal: "상승 에지마다 pc를 1씩 늘리세요. load = 1이면 d를 넣고, rst = 1이면 (load보다 먼저) 0으로.",
      top: "pcounter",
      skeleton: code("    // if (rst) … else if (load) … else …\n"),
      inputs: [
        { name: "clk", width: 1 },
        { name: "rst", width: 1 },
        { name: "load", width: 1 },
        { name: "d", width: 4 },
      ],
      outputs: [{ name: "pc", width: 4 }],
      labels: { rst: "리셋", load: "점프 load", d: "점프할 주소", pc: "PC" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: clocked(CYCLES, ["rst"]),
        model() {
          let pc = 0;
          let last = 0;
          return ({ clk, rst, load, d }) => {
            if (clk && !last) pc = rst ? 0 : load ? d : (pc + 1) & 15;
            last = clk;
            return { pc };
          };
        },
      },
      reference: code(OK),
      wrong: [
        code("    if (rst) pc <= 0;\n    else pc <= pc + 1;\n"),
        code("    if (load) pc <= d;\n    else if (rst) pc <= 0;\n    else pc <= pc + 1;\n"),
        code("    if (rst) pc <= 0;\n    else if (load) pc <= d;\n"),
      ],
      hint: "if (rst) pc <= 0; else if (load) pc <= d; else pc <= pc + 1;  (4비트라 15 + 1은 저절로 0이 된다)",
    },
  ],
  realWorld: [
    {
      title: "전원이 켜지면 어디서 시작할까",
      body:
        "실제 MCU도 리셋이 풀리면 PC가 정해진 곳에서 출발한다. 그 주소에서 바로 시작하는 칩도 있고, ARM Cortex-M처럼 정해진 칸(리셋 벡터)에 적힌 시작 주소를 PC에 넣는 칩도 있다. 그래서 펌웨어를 넣을 때 시작 코드나 그 주소가 그 자리에 오도록 맞춘다. " +
        "프로그램이 이상하게 멈추면 디버거로 ‘지금 PC가 몇 번인지’부터 보는 것도 같은 이유다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "load = 0, rst = 0일 때 pc가 15라면 다음 에지 뒤 pc는?",
      choices: ["0", "16", "15 그대로"],
      answer: 0,
      explain: "4비트는 15 다음에 넘쳐서 0으로 돌아간다.",
    },
    {
      kind: "choice",
      q: "JMP(점프) 명령은 프로그램 카운터에 무엇을 하게 할까?",
      choices: ["1을 더하는 대신 새 주소를 넣는다(load)", "0으로 리셋한다", "클럭을 멈춘다"],
      answer: 0,
      explain: "점프는 다음 주소를 ‘지금 + 1’ 대신 명령어가 알려 준 주소로 바꾸는 것이다.",
    },
  ],
  glossary: ["pc"],
};
