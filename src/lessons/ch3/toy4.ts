/**
 * 3장 공유 명령어 집합 "토이4" (설계: docs/superpowers/specs/2026-11-23-ch3-small-computer-design.md §5).
 * 명령어 8비트 {op[3:0], n[3:0]}, 누산기 A·OUT·PC 4비트, SENSOR 4비트 입력, ROM 16칸.
 * TS 모델은 해석기와 따로 써서, 해석기 버그가 모범 답안과 같이 숨지 않게 한다.
 */

export type Toy4Name = "LDI" | "ADD" | "SUB" | "OUT" | "JMP" | "JZ" | "IN" | "HLT";

export const TOY4_OPS: { op: number; name: Toy4Name; desc: string }[] = [
  { op: 0, name: "LDI", desc: "A에 숫자 n을 넣는다" },
  { op: 1, name: "ADD", desc: "A에 n을 더한다(4비트, 넘치면 버림)" },
  { op: 2, name: "SUB", desc: "A에서 n을 뺀다(4비트)" },
  { op: 3, name: "OUT", desc: "A를 출력 OUT에 내보낸다" },
  { op: 4, name: "JMP", desc: "n번 주소로 건너뛴다" },
  { op: 5, name: "JZ", desc: "A가 0이면 n번 주소로 건너뛴다" },
  { op: 6, name: "IN", desc: "센서 값을 A에 읽어 온다" },
  { op: 7, name: "HLT", desc: "멈춘다(PC가 그대로)" },
];

const OP = Object.fromEntries(TOY4_OPS.map((o) => [o.name, o.op])) as Record<Toy4Name, number>;

/** 명령어 바이트 */
export const ins = (name: Toy4Name, n = 0): number => (OP[name] << 4) | (n & 15);

/** SeqSpec.model 모양. 입력 {clk, rst, sensor}, 상승 에지에서 한 명령 실행. 프로그램 밖 주소는 HLT */
export function toy4(program: number[]): () => (i: Record<string, number>) => { out: number; pc: number } {
  return () => {
    let pc = 0;
    let a = 0;
    let out = 0;
    let last = 0;
    return ({ clk, rst, sensor = 0 }) => {
      if (clk && !last) {
        if (rst) [pc, a, out] = [0, 0, 0];
        else {
          const x = program[pc] ?? ins("HLT");
          const op = x >> 4;
          const n = x & 15;
          const next = (pc + 1) & 15;
          if (op === 0) [a, pc] = [n, next];
          else if (op === 1) [a, pc] = [(a + n) & 15, next];
          else if (op === 2) [a, pc] = [(a - n) & 15, next];
          else if (op === 3) [out, pc] = [a, next];
          else if (op === 4) pc = n;
          else if (op === 5) pc = a === 0 ? n : next;
          else if (op === 6) [a, pc] = [sensor & 15, next];
        }
      }
      last = clk;
      return { out, pc };
    };
  };
}

export const TOY4_PARAMS = "  localparam LDI = 4'd0, ADD = 4'd1, SUB = 4'd2, OUT = 4'd3, JMP = 4'd4, JZ = 4'd5, IN = 4'd6, HLT = 4'd7;\n";

/** ROM case 줄들(명령어 이름으로) */
export const romCases = (program: number[]): string =>
  program.map((x, k) => `      4'd${k}: data = {${TOY4_OPS[Math.min(x >> 4, 7)].name}, 4'd${x & 15}};\n`).join("");

/** 모범 실행부: case (op)의 팔들 */
export const TOY4_EXEC =
  "      LDI, ADD, SUB, IN: begin a <= y; pc <= pc + 1; end\n" +
  "      OUT: begin out <= a; pc <= pc + 1; end\n" +
  "      JMP: pc <= n;\n" +
  "      JZ: if (a == 0) pc <= n; else pc <= pc + 1;\n";

const ALU =
  "module alu(input [3:0] a, input [3:0] b, input [1:0] op, output [3:0] y, output zero);\n" +
  "  assign y = (op == 2'd0) ? b : (op == 2'd1) ? a + b : (op == 2'd2) ? a - b : a;\n" +
  "  assign zero = (y == 4'd0);\n" +
  "endmodule\n";

/** ROM·ALU·CPU를 한 파일로. rom = ROM case 줄들, exec = 실행부 case 팔들 */
export function cpuVerilog(rom: string, exec: string): string {
  return (
    ALU +
    "\nmodule rom(input [3:0] addr, output reg [7:0] data);\n" +
    TOY4_PARAMS +
    "  always @(*) begin\n    case (addr)\n" +
    rom +
    "      default: data = {HLT, 4'd0};\n    endcase\n  end\nendmodule\n" +
    "\nmodule cpu(input clk, input rst, input [3:0] sensor, output reg [3:0] out, output reg [3:0] pc);\n" +
    TOY4_PARAMS +
    "  reg [3:0] a;\n  wire [7:0] ins;\n  wire [3:0] op = ins[7:4];\n  wire [3:0] n = ins[3:0];\n" +
    "  // ALU: LDI·IN은 b를 그대로, ADD는 a + b, SUB는 a - b\n" +
    "  wire [1:0] alu_op = (op == ADD) ? 2'd1 : (op == SUB) ? 2'd2 : (op == LDI || op == IN) ? 2'd0 : 2'd3;\n" +
    "  wire [3:0] y;\n  wire zero;\n" +
    "  rom r(.addr(pc), .data(ins));\n" +
    "  alu u(.a(a), .b(op == IN ? sensor : n), .op(alu_op), .y(y), .zero(zero));\n" +
    "  always @(posedge clk) begin\n" +
    "    if (rst) begin pc <= 0; a <= 0; out <= 0; end\n" +
    "    else case (op)\n" +
    exec +
    "      default: pc <= pc; // HLT\n    endcase\n  end\nendmodule\n"
  );
}
