import type { Lesson } from "../types";
import { clocked } from "../seq";

/** 오르골 음 번호 표(주소 0~11), 나머지 칸은 쉼표 0. 도레미 오르내림이라 곡 저작권과 무관 */
const NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65];
const note = (a: number) => NOTES[a] ?? 0;

const ROM_HEAD = "module melody(input [3:0] addr, output reg [7:0] note);\n  always @(*) begin\n    case (addr)\n";
const ROM_TAIL = "    endcase\n  end\nendmodule\n";
const romLines = (f: (a: number) => number) => NOTES.map((_, a) => `      4'd${a}: note = 8'd${f(a)};\n`).join("");
const rom = (lines: string, dflt = 0) => ROM_HEAD + lines + `      default: note = 8'd${dflt};\n` + ROM_TAIL;

const RAM_HEAD =
  "module locker(input clk, input rst, input we, input [1:0] addr, input [3:0] din, output [3:0] dout);\n" +
  "  reg [3:0] r0, r1, r2, r3;\n";
const RAM_READ = "  assign dout = (addr == 2'd0) ? r0 : (addr == 2'd1) ? r1 : (addr == 2'd2) ? r2 : r3;\n";
const ramWrite = (cond: string, a: string[] = ["0", "1", "2", "3"]) =>
  "  always @(posedge clk) begin\n" +
  "    if (rst) begin r0 <= 0; r1 <= 0; r2 <= 0; r3 <= 0; end\n" +
  `    else if (${cond}) begin\n` +
  "      case (addr)\n" +
  a.map((x, k) => `        2'd${k}: r${x} <= din;\n`).join("") +
  "      endcase\n    end\n  end\n";
const ram = (write: string, read = RAM_READ) => RAM_HEAD + write + read + "endmodule\n";

/** 쓰기·읽기를 섞고, 같은 칸 덮어쓰기와 we = 0 무시를 넣은 각본 */
const RAM_CYCLES = [
  { rst: 1, we: 0, addr: 0, din: 0 },
  { rst: 0, we: 1, addr: 0, din: 5 },
  { rst: 0, we: 1, addr: 2, din: 9 },
  { rst: 0, we: 0, addr: 0, din: 3 },
  { rst: 0, we: 0, addr: 2, din: 3 },
  { rst: 0, we: 0, addr: 1, din: 7 },
  { rst: 0, we: 1, addr: 1, din: 7 },
  { rst: 0, we: 1, addr: 3, din: 12 },
  { rst: 0, we: 0, addr: 3, din: 1 },
  { rst: 0, we: 1, addr: 0, din: 15 },
  { rst: 0, we: 0, addr: 0, din: 2 },
  { rst: 0, we: 0, addr: 1, din: 2 },
  { rst: 0, we: 0, addr: 2, din: 2 },
  { rst: 0, we: 1, addr: 2, din: 4 },
  { rst: 0, we: 0, addr: 2, din: 0 },
  { rst: 0, we: 0, addr: 3, din: 0 },
  { rst: 1, we: 0, addr: 3, din: 0 },
  { rst: 0, we: 0, addr: 0, din: 0 },
];

export const lesson: Lesson = {
  id: "3-1",
  chapter: 3,
  title: "번호 붙은 칸: 메모리",
  emoji: "🗃️",
  minutes: 20,
  client: {
    from: "장난감 오르골 공방",
    request:
      "오르골 칩에 연주할 음 12개를 미리 넣어 두고, 순서 번호를 주면 그 음 번호를 바로 내주게 해 주세요. 그리고 손님이 고른 음을 잠깐 맡아 둘 작은 사물함 4칸도 필요해요.",
    requirements: ["멜로디 표: 주소 0~11 → 음 번호, 나머지 주소는 쉼표(0)", "사물함: 4칸 × 4비트, we = 1인 상승 에지에 addr 칸에 din 저장", "사물함 읽기는 클럭 없이 바로, rst = 1이면 네 칸 모두 0"],
  },
  concepts: [
    {
      title: "번호를 주면 값이 나온다",
      body:
        "[[memory]]는 칸이 여러 개 있고 칸마다 번호가 붙은 부품이다. 이 번호가 [[address]]다. 주소 4비트면 0~15, 16칸을 가리킬 수 있다. " +
        "멜로디 표는 연주하는 동안 바뀌지 않으니 읽기만 하면 된다. 이런 메모리가 [[rom]]이다. 1-6에서 만든 7세그 디코더도 ‘숫자 → 켤 획’ 표였으니 사실 작은 ROM이었다.",
    },
    {
      title: "ROM은 case 표로",
      body:
        "Verilog로 ROM을 쓰는 가장 쉬운 방법은 always @(*) 안의 case다: 4'd0: note = 8'd60; 처럼 주소마다 한 줄. 표에 없는 주소는 default로 처리한다. " +
        "클럭이 없는 조합 회로라서 주소가 바뀌면 값도 바로 바뀐다.",
    },
    {
      title: "쓸 수도 있는 메모리: RAM",
      body:
        "사물함은 값을 넣기도 하니 [[ram]]이다. 칸 하나는 2-5에서 만든 [[register]]와 똑같다. 쓰기는 클럭에 맞춰(we = 1이면 addr 칸에 din), 읽기는 MUX로 addr 칸을 골라 바로 내보낸다. " +
        "실제 Verilog에서는 reg [3:0] mem [0:3]; 같은 배열로 쓰지만, 이 앱의 Verilog는 배열을 지원하지 않아서 r0~r3을 풀어 쓴다. 회로로는 같은 것이다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "멜로디 ROM",
      goal: "case로 주소 0~11의 음 번호를 내주고, 나머지 주소는 0(쉼표)을 내주세요. 음 번호: " + NOTES.join(", "),
      top: "melody",
      skeleton: rom("      // 4'd0: note = 8'd60; 처럼 주소마다 한 줄\n"),
      inputs: [{ name: "addr", width: 4 }],
      outputs: [{ name: "note", width: 8 }],
      labels: { addr: "주소", note: "음 번호" },
      spec: ({ addr }) => ({ note: note(addr) }),
      reference: rom(romLines(note)),
      wrong: [rom(romLines((a) => note(a + 1))), rom(romLines(note), 60), rom(romLines((a) => (a === 7 ? 71 : note(a))))],
      hint: "case (addr) 안에 4'd0: note = 8'd60; 4'd1: note = 8'd62; … 4'd11: note = 8'd65; 그리고 default: note = 8'd0;",
    },
    {
      kind: "verilog",
      title: "사물함 4칸 RAM",
      goal: "we = 1인 상승 에지에 addr 칸에 din을 저장하고, dout으로는 지금 addr 칸의 값을 바로 내보내세요. rst = 1이면 네 칸 모두 0.",
      top: "locker",
      skeleton: RAM_HEAD + "  // 쓰기: always @(posedge clk) …\n  // 읽기: assign dout = …\n  assign dout = 4'd0;\nendmodule\n",
      inputs: [
        { name: "clk", width: 1 },
        { name: "rst", width: 1 },
        { name: "we", width: 1 },
        { name: "addr", width: 2 },
        { name: "din", width: 4 },
      ],
      outputs: [{ name: "dout", width: 4 }],
      labels: { rst: "리셋", we: "쓰기 we", addr: "칸 번호", din: "넣을 값", dout: "읽은 값" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: clocked(RAM_CYCLES, ["rst"]),
        model() {
          const r = [0, 0, 0, 0];
          let last = 0;
          return ({ clk, rst, we, addr, din }) => {
            if (clk && !last) {
              if (rst) r.fill(0);
              else if (we) r[addr] = din;
            }
            last = clk;
            return { dout: r[addr] };
          };
        },
      },
      reference: ram(ramWrite("we")),
      wrong: [ram(ramWrite("1")), ram(ramWrite("we"), "  assign dout = r0;\n"), ram(ramWrite("we", ["1", "2", "3", "0"]))],
      hint: "always @(posedge clk) 안에서 if (rst) 네 칸 0, else if (we) case (addr) 2'd0: r0 <= din; … endcase. 읽기는 assign dout = (addr == 2'd0) ? r0 : (addr == 2'd1) ? r1 : …;",
    },
  ],
  realWorld: [
    {
      title: "칩 속의 플래시와 SRAM",
      body:
        "실제 MCU에는 프로그램을 넣는 플래시(전원이 꺼져도 남는 ROM의 한 종류)와 계산용 SRAM(RAM)이 함께 들어 있다. 작은 MCU는 플래시 수십 KB, SRAM 몇 KB 정도다. " +
        "데이터시트 첫 쪽에서 이 두 숫자를 먼저 확인하는 이유는, 프로그램과 변수가 거기에 다 들어가야 하기 때문이다.",
    },
  ],
  quiz: [
    {
      kind: "number",
      q: "주소가 6비트인 메모리는 칸이 몇 개일까?",
      answer: 64,
      tolerance: 0.01,
      unit: "칸",
      explain: "주소 n비트면 2ⁿ칸. 2⁶ = 64.",
    },
    {
      kind: "choice",
      q: "프로그램처럼 미리 정해 두고 읽기만 하는 값을 넣기에 알맞은 것은?",
      choices: ["ROM", "RAM", "플립플롭 하나"],
      answer: 0,
      explain: "ROM은 만들 때 정한 값을 읽기만 하고, 전원이 꺼져도 남는다.",
    },
    {
      kind: "choice",
      q: "사물함 RAM에서 we = 0이면 클럭 에지에 무슨 일이 생길까?",
      choices: ["addr 칸이 0이 된다", "아무 칸도 바뀌지 않는다", "모든 칸에 din이 들어간다"],
      answer: 1,
      explain: "we(쓰기 허가)가 0이면 저장하지 않으니 네 칸 모두 그대로다. 2-5 레지스터의 en과 같다.",
    },
  ],
  glossary: ["memory", "address", "rom", "ram"],
};
