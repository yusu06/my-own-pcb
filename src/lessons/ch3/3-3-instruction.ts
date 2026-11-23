import type { Lesson } from "../types";
import { TOY4_OPS } from "./toy4";

const HEAD =
  "module decoder(input [7:0] ins, output reg [1:0] alu_op, output reg use_sensor, output reg write_a,\n" +
  "               output reg write_out, output reg jump, output reg jz);\n" +
  "  always @(*) begin\n" +
  "    // 먼저 전부 ‘안 함’으로 두고, 명령마다 필요한 것만 켠다\n" +
  "    alu_op = 2'd3; use_sensor = 0; write_a = 0; write_out = 0; jump = 0; jz = 0;\n" +
  "    case (ins[7:4])\n";
const TAIL = "    endcase\n  end\nendmodule\n";

/** 설계 문서의 해독 표: op → [alu_op, use_sensor, write_a, write_out, jump, jz] */
const TABLE: Record<number, number[]> = {
  0: [0, 0, 1, 0, 0, 0],
  1: [1, 0, 1, 0, 0, 0],
  2: [2, 0, 1, 0, 0, 0],
  3: [3, 0, 0, 1, 0, 0],
  4: [3, 0, 0, 0, 1, 0],
  5: [3, 0, 0, 0, 0, 1],
  6: [0, 1, 1, 0, 0, 0],
};
const OFF = [3, 0, 0, 0, 0, 0];
const KEYS = ["alu_op", "use_sensor", "write_a", "write_out", "jump", "jz"];

const ARMS: Record<string, string> = {
  LDI: "      4'd0: begin alu_op = 2'd0; write_a = 1; end // LDI\n",
  ADD: "      4'd1: begin alu_op = 2'd1; write_a = 1; end // ADD\n",
  SUB: "      4'd2: begin alu_op = 2'd2; write_a = 1; end // SUB\n",
  OUT: "      4'd3: write_out = 1; // OUT\n",
  JMP: "      4'd4: jump = 1; // JMP\n",
  JZ: "      4'd5: jz = 1; // JZ\n",
  IN: "      4'd6: begin alu_op = 2'd0; use_sensor = 1; write_a = 1; end // IN\n",
};
const dec = (arms: Record<string, string>) => HEAD + Object.values(arms).join("") + TAIL;

export const lesson: Lesson = {
  id: "3-3",
  chapter: 3,
  title: "숫자가 곧 명령: 명령어",
  emoji: "📜",
  minutes: 20,
  client: {
    from: "장난감 회사 ‘딸깍’",
    request:
      "우리 장난감 칩은 8비트 숫자 하나하나가 명령이에요. 위 4비트가 무슨 일인지, 아래 4비트가 쓸 숫자예요. 이 숫자를 받아서 ‘ALU는 무슨 연산, A에 저장할지, 출력할지, 점프할지’ 스위치들을 켜 주는 해독기를 만들어 주세요.",
    requirements: ["op = ins[7:4]가 0~6이면 아래 해독 표대로", "op 7~15(HLT)는 아무것도 켜지 않는다(alu_op = 3)", "출력: alu_op, use_sensor, write_a, write_out, jump, jz"],
  },
  concepts: [
    {
      title: "명령어 = 연산 코드 + 숫자",
      body:
        "CPU에게 시킬 일 하나를 숫자로 적은 것이 [[instruction]]이다. 이 장의 장난감 CPU ‘토이4’의 명령어는 8비트: 위 4비트는 무슨 일인지([[opcode]]), 아래 4비트 n은 그 일에 쓸 숫자다. " +
        "예를 들어 0x15 = 0001 0101 → op 1(ADD), n = 5 → ‘A에 5를 더해라’.",
    },
    {
      title: "토이4 명령어 표",
      body:
        TOY4_OPS.map((o) => `${o.op} ${o.name}: ${o.desc}`).join(" · ") +
        ". (op 8~15도 HLT로 친다.) [[accumulator]] A는 계산 결과를 담는 레지스터 하나뿐이다. 사람은 숫자 대신 LDI 3, OUT 같은 이름으로 읽고 쓴다. 이 이름 표기를 어셈블리라고 부른다.",
    },
    {
      title: "해독기 = 스위치 켜 주는 표",
      body:
        "CPU 안의 부품(ALU, A 레지스터, 출력, PC)은 ‘이번 클럭에 뭘 할지’ 스위치가 필요하다. 해독기는 op를 보고 그 스위치들을 켜는 조합 회로, 즉 1-6의 디코더 같은 큰 진리표다. " +
        "LDI·ADD·SUB·IN은 ALU 결과를 A에 저장(write_a), OUT은 A를 출력(write_out), JMP는 점프(jump), JZ는 ‘0이면 점프’(jz). IN만 ALU에 n 대신 센서 값을 넣는다(use_sensor).",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "토이4 해독기",
      goal: "case (ins[7:4]) 안에 op 0~6마다 켤 신호를 채우세요. 해독 표: LDI → alu_op 0·write_a, ADD → alu_op 1·write_a, SUB → alu_op 2·write_a, OUT → write_out, JMP → jump, JZ → jz, IN → alu_op 0·use_sensor·write_a.",
      top: "decoder",
      skeleton: HEAD + "      // 4'd0: begin alu_op = 2'd0; write_a = 1; end // LDI\n" + TAIL,
      inputs: [{ name: "ins", width: 8 }],
      outputs: KEYS.map((name) => ({ name, width: name === "alu_op" ? 2 : 1 })),
      labels: { ins: "명령어", use_sensor: "센서 씀", write_a: "A 저장", write_out: "출력", jump: "점프", jz: "0이면 점프" },
      spec: ({ ins }) => {
        const row = TABLE[ins >> 4] ?? OFF;
        return Object.fromEntries(KEYS.map((k, i) => [k, row[i]]));
      },
      reference: dec(ARMS),
      wrong: [
        dec({ ...ARMS, IN: "      4'd6: begin alu_op = 2'd0; write_a = 1; end\n" }),
        dec({ ...ARMS, JZ: "      4'd5: jump = 1;\n" }),
        dec({ ...ARMS, LDI: "      4'd0: begin alu_op = 2'd1; write_a = 1; end\n" }),
      ],
      hint: "4'd0: begin alu_op = 2'd0; write_a = 1; end  4'd1: begin alu_op = 2'd1; write_a = 1; end  4'd2: … 2'd2 …  4'd3: write_out = 1;  4'd4: jump = 1;  4'd5: jz = 1;  4'd6: begin alu_op = 2'd0; use_sensor = 1; write_a = 1; end",
    },
  ],
  realWorld: [
    {
      title: "진짜 명령어 집합도 같은 원리",
      body:
        "스마트폰의 ARM, 새로 많이 쓰이는 RISC-V 같은 실제 명령어 집합도 ‘연산 코드 + 레지스터 번호 + 숫자’를 정해진 비트 자리에 적는다. 다만 명령어가 16~32비트이고 종류가 수백 개다. " +
        "MCU 데이터시트에 ‘ARM Cortex-M0+ 코어’처럼 적혀 있으면, 그 칩이 어떤 명령어 표를 해독하는지 알려 주는 것이다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "토이4 명령어 0x15는 무슨 뜻일까?",
      choices: ["ADD 5 (A에 5를 더한다)", "LDI 15", "JZ 1"],
      answer: 0,
      explain: "0x15 = 0001 0101. 위 4비트 1 = ADD, 아래 4비트 5 = n.",
    },
    {
      kind: "choice",
      q: "‘A에 7을 넣어라(LDI 7)’를 8비트 숫자로 쓰면?",
      choices: ["0x07", "0x70", "0x17"],
      answer: 0,
      explain: "LDI의 op는 0, n = 7 → 0000 0111 = 0x07. 0x70은 op 7(HLT)이다.",
    },
    {
      kind: "number",
      q: "연산 코드가 4비트면 명령어 종류를 최대 몇 가지까지 만들 수 있을까?",
      answer: 16,
      tolerance: 0.01,
      unit: "가지",
      explain: "4비트 = 2⁴ = 16가지. 토이4는 그중 7가지만 쓰고 나머지는 HLT로 친다.",
    },
  ],
  glossary: ["instruction", "opcode", "accumulator"],
};
