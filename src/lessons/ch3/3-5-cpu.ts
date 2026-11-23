import type { Lesson } from "../types";
import { clocked } from "../seq";
import { TOY4_EXEC, cpuVerilog, ins, romCases, toy4 } from "./toy4";

/** 카운트다운: 3, 2, 1, 0을 차례로 내보내고 멈춘다 */
const P = [ins("LDI", 3), ins("OUT"), ins("JZ", 5), ins("SUB", 1), ins("JMP", 1), ins("HLT")];
const ROM = romCases(P);

const EXEC_HELP =
  "      // 명령마다 한 줄씩 채우세요. y는 ALU 결과(LDI → n, ADD → a + n, SUB → a - n, IN → 센서)\n" +
  "      // LDI, ADD, SUB, IN: A에 y를 저장하고 다음 칸으로\n" +
  "      // OUT: out에 a를 내보내고 다음 칸으로\n" +
  "      // JMP: n번 칸으로\n" +
  "      // JZ: a가 0이면 n번 칸으로, 아니면 다음 칸으로\n";

const wrong = (from: string, to: string) => {
  if (!TOY4_EXEC.includes(from)) throw new Error(from);
  return cpuVerilog(ROM, TOY4_EXEC.replace(from, to));
};

export const lesson: Lesson = {
  id: "3-5",
  chapter: 3,
  title: "부품을 모으면: 4비트 CPU",
  emoji: "🧠",
  minutes: 20,
  client: {
    from: "장난감 회사 ‘딸깍’",
    request:
      "ROM, ALU, 프로그램 카운터, A 레지스터를 한 칩에 다 연결해 두었어요. 남은 건 ‘명령어마다 이번 클럭에 무엇을 바꿀지’ 정하는 실행부뿐이에요. ROM에 든 카운트다운 프로그램이 3, 2, 1, 0을 내보내고 멈추면 성공이에요.",
    requirements: ["토이4 명령어 표대로 실행", "LDI·ADD·SUB·IN: A ← ALU 결과, PC + 1", "OUT: OUT ← A, PC + 1 · JMP: PC ← n · JZ: A가 0이면 PC ← n", "HLT(그 밖): PC 그대로 (이미 써 있음)"],
  },
  concepts: [
    {
      title: "CPU가 도는 한 바퀴",
      body:
        "[[cpu]]는 클럭마다 같은 일을 반복한다: PC가 가리키는 ROM 칸에서 명령어를 꺼내고, 무슨 명령인지 알아보고, 해낸다. 이 한 바퀴를 [[fetch-decode-execute]]라고 한다. " +
        "토이4는 이 셋을 한 클럭에 끝낸다. 꺼내기와 알아보기는 조합 회로(ROM, 해독)라 바로 되고, 해내기는 상승 에지에 레지스터(A, OUT, PC)에 값을 저장하는 것이다.",
    },
    {
      title: "지금까지 만든 부품이 다 들어 있다",
      body:
        "ROM(3-1)이 명령어를 주고, ALU(3-2)가 계산하고, 해독(3-3)한 결과로 무엇을 저장할지 정하고, 프로그램 카운터(3-4)가 다음 칸으로 간다. A·OUT은 2-5 레지스터다. " +
        "뼈대 코드에는 ALU 연결까지 다 되어 있어서, always 블록 안의 case (op)만 채우면 된다.",
    },
    {
      title: "카운트다운 프로그램을 따라가 보기",
      body:
        "ROM: 0 LDI 3 · 1 OUT · 2 JZ 5 · 3 SUB 1 · 4 JMP 1 · 5 HLT. A = 3을 넣고 내보낸 뒤, 0이 아니면 1을 빼고 1번으로 돌아가 다시 내보낸다. " +
        "아래 표는 리셋 뒤 클럭마다 PC와 OUT이다. A가 0이 되어 JZ가 5번으로 건너뛰면 HLT에서 멈춘다.",
      timeline: [
        { name: "pc", label: "PC", values: [0, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 5, 5] },
        { name: "out", label: "OUT", values: [0, 0, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0] },
      ],
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "토이4 실행부",
      goal: "always 블록의 case (op) 안에 명령마다 바꿀 레지스터를 채우세요. 카운트다운 프로그램이 OUT으로 3, 2, 1, 0을 내고 멈춰야 해요.",
      top: "cpu",
      skeleton: cpuVerilog(ROM, EXEC_HELP),
      inputs: [
        { name: "clk", width: 1 },
        { name: "rst", width: 1 },
        { name: "sensor", width: 4 },
      ],
      outputs: [
        { name: "out", width: 4 },
        { name: "pc", width: 4 },
      ],
      labels: { rst: "리셋", sensor: "센서", out: "OUT", pc: "PC" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        // 22번째 주기에 다시 리셋: 처음부터 다시 세야 한다
        steps: clocked(
          Array.from({ length: 30 }, (_, k) => ({ rst: k === 0 || k === 21 ? 1 : 0, sensor: 0 })),
          ["rst"],
        ),
        model: toy4(P),
      },
      reference: cpuVerilog(ROM, TOY4_EXEC),
      wrong: [
        wrong("JZ: if (a == 0) pc <= n;", "JZ: if (a != 0) pc <= n;"),
        wrong("JMP: pc <= n;", "JMP: pc <= pc + 1;"),
        wrong("LDI, ADD, SUB, IN: begin a <= y; pc <= pc + 1; end", "LDI, ADD, SUB, IN: a <= y;"),
      ],
      hint:
        "LDI, ADD, SUB, IN: begin a <= y; pc <= pc + 1; end  OUT: begin out <= a; pc <= pc + 1; end  JMP: pc <= n;  JZ: if (a == 0) pc <= n; else pc <= pc + 1;",
    },
  ],
  realWorld: [
    {
      title: "같은 한 바퀴를 1초에 수억 번",
      body:
        "실제 CPU도 인출-해석-실행을 반복한다. 다만 한 바퀴를 여러 단계로 쪼개 겹쳐 돌리고(파이프라인), 클럭이 수십 MHz~수 GHz라 1초에 수천만~수십억 개의 명령을 처리한다. " +
        "작은 MCU는 수십 MHz 정도로, 토이4를 아주 빠르고 크게 만든 것이라고 생각하면 된다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "카운트다운 프로그램에서 JZ 5를 JMP 5로 잘못 쓰면 OUT에는 무엇이 나올까?",
      choices: ["3만 한 번 나오고 멈춘다", "3, 2, 1, 0이 그대로 나온다", "아무것도 안 나온다(계속 0)"],
      answer: 0,
      explain: "LDI 3, OUT으로 3을 내보낸 뒤 JMP 5가 조건 없이 HLT로 건너뛴다.",
    },
    {
      kind: "choice",
      q: "토이4에서 ‘인출’(명령어 꺼내기)을 맡는 부품 둘은?",
      choices: ["프로그램 카운터와 ROM", "ALU와 A 레지스터", "OUT과 센서"],
      answer: 0,
      explain: "PC가 주소를 주고 ROM이 그 칸의 명령어를 내준다.",
    },
  ],
  glossary: ["cpu", "fetch-decode-execute"],
};
