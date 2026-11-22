import type { Lesson } from "../types";

/** seg[0]=a … seg[6]=g, 1이면 켜짐 */
export const SEG7 = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

const HEAD = "module floor_display(input [3:0] d, output reg [6:0] seg);\n";
const body = (rows: string) =>
  HEAD + "  always @(*) begin\n    case (d)\n" + rows + "      default: seg = 7'b0000000;\n    endcase\n  end\nendmodule\n";
const row = (d: number, v: number) => `      4'd${d}: seg = 7'b${v.toString(2).padStart(7, "0")};\n`;
const table = (seg: number[]) => seg.map((v, d) => row(d, v)).join("");

export const lesson: Lesson = {
  id: "1-6",
  chapter: 1,
  title: "엘리베이터 층 표시",
  emoji: "🛗",
  minutes: 15,
  client: {
    from: "승강기 회사 ‘오르락’",
    request: "엘리베이터 안 숫자 표시기를 만들어 주세요. 제어반이 층 번호를 4비트(0~15)로 보내 주면, 0~9층은 숫자를 보여 주고 그 밖의 값이면 모두 꺼 주세요.",
    requirements: ["입력 d: 4비트 층 번호", "출력 seg: 7개 막대 a~g (1 = 켜짐)", "10~15는 모두 꺼짐"],
  },
  concepts: [
    {
      title: "숫자를 보여 주는 막대 7개",
      body:
        "[[seven-segment]] 표시기는 막대 7개로 숫자를 만든다. 위 가로가 a, 오른쪽 위 b, 오른쪽 아래 c, 아래 가로 d, 왼쪽 아래 e, 왼쪽 위 f, 가운데 가로가 g다. " +
        "예를 들어 1은 b와 c만, 8은 7개 모두 켠다. 이 과제에서는 seg[0]=a, seg[1]=b, … seg[6]=g로 정한다.",
    },
    {
      title: "여러 비트 묶음: 벡터",
      body:
        "input [3:0] d 는 d[3], d[2], d[1], d[0] 네 가닥을 묶은 4비트 신호다. 숫자도 비트 수와 진법을 붙여 쓴다: 4'd9 = 4비트 10진수 9, 7'b0000110 = 7비트 2진수. " +
        "2진수는 오른쪽 끝이 [0]번 비트라서, 7'b0000110은 seg[1](b)과 seg[2](c)가 켜진 ‘1’ 모양이다.",
    },
    {
      title: "표처럼 쓰기: always @(*)와 case",
      body:
        "경우가 많으면 assign 대신 always @(*) 안에 case를 쓴다. ‘d가 0이면 이 값, 1이면 이 값…’처럼 [[decoder]]의 표를 그대로 옮기면 된다. " +
        "always 안에서 값을 넣는 출력은 output reg로 선언한다. 그리고 default를 꼭 쓴다 — 빠뜨리면 표에 없는 입력에서 예전 값이 남는 회로(래치)가 생겨 버그가 된다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "층 번호 디코더",
      goal: "0은 이미 채워 두었어요. 1~9 줄을 채워 숫자가 바르게 보이게 하세요. (seg[0]=a … seg[6]=g, 2진수는 오른쪽 끝이 a)",
      top: "floor_display",
      skeleton: body(row(0, SEG7[0]) + "      // 4'd1: seg = 7'b...;  1~9를 채워 주세요\n"),
      inputs: [{ name: "d", width: 4 }],
      outputs: [{ name: "seg", width: 7 }],
      labels: { d: "층", seg: "seg(gfedcba)" },
      spec: ({ d }) => ({ seg: SEG7[d] ?? 0 }),
      reference: body(table(SEG7)),
      wrong: [
        // 6에서 a를 빠뜨림, 9에서 d를 빠뜨림 — 실제로 흔한 모양 차이
        body(table(SEG7.map((v, d) => (d === 6 ? v & ~0x01 : d === 9 ? v & ~0x08 : v)))),
        // 비트 순서를 거꾸로(seg[0]=g) 쓴 경우
        body(table(SEG7.map((v) => parseInt(v.toString(2).padStart(7, "0").split("").reverse().join(""), 2)))),
      ],
      hint: "숫자마다 켤 막대를 적고 g f e d c b a 순서로 1/0을 쓰세요. 예: 2 = a b d e g → 7'b1011011, 7 = a b c → 7'b0000111.",
    },
  ],
  realWorld: [
    {
      title: "실제 표시기와 디코더 칩",
      body:
        "실제 7세그먼트 부품은 ‘공통 캐소드’(1이면 켜짐)와 ‘공통 애노드’(0이면 켜짐) 두 종류가 있어서, 부품을 바꾸면 값을 모두 뒤집어야 한다. 막대마다 LED라서 각각 저항도 필요하다. " +
        "이 일을 하는 전용 디코더 칩(BCD-7세그먼트 디코더)도 있지만, 요즘은 FPGA나 MCU 안에서 지금 쓴 것 같은 표로 처리하는 경우가 많다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "4비트로 나타낼 수 있는 가장 큰 수는?",
      answer: 15,
      tolerance: 0.01,
      unit: "",
      explain: "4비트는 0000부터 1111까지, 10진수로 0~15. 그래서 10~15를 따로 처리해야 했다.",
    },
    {
      kind: "choice",
      q: "seg[0]=a … seg[6]=g일 때 7'b0000110은 어떤 숫자 모양일까?",
      choices: ["0", "1", "7"],
      answer: 1,
      explain: "오른쪽 끝이 a(seg[0])다. 켜진 것은 seg[1](b)과 seg[2](c) → 오른쪽 세로 두 막대 = 1.",
    },
    {
      kind: "choice",
      q: "always @(*) 안의 case에서 default를 빠뜨리면?",
      choices: ["아무 문제 없다", "표에 없는 입력에서 예전 값이 남는 회로(래치)가 생길 수 있다", "Verilog 문법 오류가 난다"],
      answer: 1,
      explain: "문법은 맞지만 의도하지 않은 기억 회로가 생긴다. 조합 회로의 case에는 default를 꼭 쓰자.",
    },
  ],
  glossary: ["seven-segment", "decoder"],
};
