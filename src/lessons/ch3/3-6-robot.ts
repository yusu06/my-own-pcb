import type { Lesson } from "../types";
import { clocked } from "../seq";
import { TOY4_EXEC, cpuVerilog, ins, romCases } from "./toy4";

/** 모범 프로그램: 센서를 읽어 0이면 5번(직진), 아니면 회전 */
const R = [ins("IN"), ins("JZ", 5), ins("LDI", 1), ins("OUT"), ins("JMP", 0), ins("LDI", 3), ins("OUT"), ins("JMP", 0)];

/** 센서 구간: 구간마다 SEG주기 동안 센서 값을 유지하고, 마지막 CHECK주기만 채점한다 */
const SENSOR = [0, 1, 0, 1, 1, 0];
const SEG = 16;
const CHECK = 4;
const want = (sensor: number) => (sensor ? 1 : 3);

const ROM_HELP =
  "      // 여기에 프로그램을 쓰세요. 한 줄에 명령 하나, 주소는 4'd0부터:\n" +
  "      // 4'd0: data = {IN, 4'd0};\n" +
  "      // 4'd1: data = {JZ, 4'd5};\n" +
  "      // …\n";

export const lesson: Lesson = {
  id: "3-6",
  chapter: 3,
  title: "장난감 로봇 프로그램",
  emoji: "🤖",
  minutes: 20,
  client: {
    from: "로봇 장난감 회사 ‘뚜벅’",
    request:
      "3-5에서 완성한 CPU를 바퀴 둘 달린 로봇에 넣었어요. 앞에 장애물 센서가 있어요. 길이 비었으면 앞으로 가고, 장애물이 있으면 그 자리에서 오른쪽으로 돌게 해 주세요. 회로는 건드리지 말고, ROM에 넣을 프로그램만 써 주세요.",
    requirements: [
      "OUT 0번 비트 = 왼바퀴, 1번 비트 = 오른바퀴 (1 = 돈다)",
      "센서 0(길 비었음) → OUT = 3 (두 바퀴 다, 직진)",
      "센서 1(장애물) → OUT = 1 (왼바퀴만, 오른쪽으로 회전)",
      `센서가 바뀌고 ${SEG - CHECK}클럭 안에 반응, 멈추지 말고 계속 반복`,
    ],
  },
  concepts: [
    {
      title: "회로는 그대로, 프로그램만 바꾼다",
      body:
        "3-5의 CPU는 카운트다운도 하고 로봇도 움직일 수 있다. ROM에 든 명령어만 바꾸면 된다. 이것이 CPU를 쓰는 이유다: 기능을 바꿀 때 칩을 새로 만들지 않고 프로그램만 고친다. " +
        "ROM 줄은 4'd0: data = {IN, 4'd0}; 처럼 명령어 이름으로 쓴다. {IN, 4'd0}은 위 4비트 IN(6)과 아래 4비트 0을 붙인 8비트 0x60이다.",
    },
    {
      title: "갈림길과 반복",
      body:
        "‘센서가 0이면 A, 아니면 B’는 IN으로 센서를 A에 읽고 JZ로 갈라서 만든다. JZ n은 A가 0일 때만 n번으로 건너뛴다. " +
        "끝에 JMP 0을 두면 처음으로 돌아가 센서를 다시 본다. 이렇게 끝없이 도는 반복이 거의 모든 기기 프로그램의 뼈대다.",
    },
    {
      title: "채점은 구간 끝에서만",
      body:
        `프로그램마다 길이가 달라서 몇 번째 클럭에 OUT이 바뀌는지는 사람마다 다르다. 그래서 센서 값을 ${SEG}클럭씩 유지하고, 구간마다 마지막 ${CHECK}클럭에만 OUT을 확인한다. ` +
        "타임라인에서 흐린 칸은 ‘상관없음’(채점하지 않는 칸)이다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "장애물 피하기 프로그램",
      goal: "rom 모듈의 case (addr) 안에 프로그램을 쓰세요. 센서가 0이면 OUT = 3(직진), 1이면 OUT = 1(회전)을 계속 반복해서 내야 해요. 명령어: LDI n, ADD n, SUB n, OUT, JMP n, JZ n, IN, HLT.",
      top: "cpu",
      skeleton: cpuVerilog(ROM_HELP, TOY4_EXEC),
      inputs: [
        { name: "clk", width: 1 },
        { name: "rst", width: 1 },
        { name: "sensor", width: 4 },
      ],
      outputs: [
        { name: "out", width: 4 },
        { name: "pc", width: 4 },
      ],
      labels: { rst: "리셋", sensor: "장애물", out: "바퀴 OUT", pc: "PC" },
      seq: {
        from: 1, // 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다
        steps: clocked(
          [{ rst: 1, sensor: 0 }, ...SENSOR.flatMap((sensor) => Array.from({ length: SEG }, () => ({ rst: 0, sensor })))],
          ["rst"],
        ),
        model() {
          let k = 0; // 단계 번호(주기마다 두 단계)
          return () => {
            const c = Math.floor(k++ / 2) - 1; // 리셋 주기 다음부터 0
            const seg = Math.floor(c / SEG);
            const check = c >= 0 && c % SEG >= SEG - CHECK;
            // undefined = 채점하지 않는 칸(상관없음)
            return { out: check ? want(SENSOR[seg]) : (undefined as unknown as number), pc: undefined as unknown as number };
          };
        },
      },
      reference: cpuVerilog(romCases(R), TOY4_EXEC),
      wrong: [
        cpuVerilog(romCases([ins("IN"), ins("JZ", 5), ins("LDI", 3), ins("OUT"), ins("JMP", 0), ins("LDI", 1), ins("OUT"), ins("JMP", 0)]), TOY4_EXEC),
        cpuVerilog(romCases(R.slice(0, -1)), TOY4_EXEC),
        cpuVerilog(romCases([ins("LDI", 3), ins("OUT"), ins("JMP", 0)]), TOY4_EXEC),
      ],
      hint: "0 IN · 1 JZ 5 · 2 LDI 1 · 3 OUT · 4 JMP 0 · 5 LDI 3 · 6 OUT · 7 JMP 0.  예: 4'd0: data = {IN, 4'd0};  4'd1: data = {JZ, 4'd5};  4'd2: data = {LDI, 4'd1}; …",
    },
  ],
  realWorld: [
    {
      title: "이것이 펌웨어다",
      body:
        "방금 ROM에 넣은 프로그램처럼, 기기 속 칩에 넣어 두고 전원이 켜지면 바로 도는 프로그램을 [[firmware]]라고 한다. 로봇 청소기, 전자레인지, 리모컨에 다 들어 있다. " +
        "실무에서는 기계어를 직접 쓰지 않고 C 같은 언어로 쓴 뒤 컴파일러가 명령어로 바꿔 준다. 하지만 칩 안에서 도는 것은 결국 지금 쓴 것과 같은 명령어 목록이다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "로봇 프로그램 끝의 JMP 0을 빼먹으면 어떻게 될까?",
      choices: ["직진 쪽으로 간 순간 멈춰서, 그 뒤로는 센서가 바뀌어도 그대로다", "더 빨리 반응한다", "아무 차이 없다"],
      answer: 0,
      explain: "회전 쪽은 4번의 JMP 0으로 계속 돌지만, 직진 쪽(5~6번)은 끝까지 가서 ROM의 빈 칸(HLT)에서 멈춘다. 처음으로 돌아가야 센서를 다시 읽는다.",
    },
    {
      kind: "choice",
      q: "같은 CPU로 로봇 대신 카운트다운을 하게 하려면 무엇을 바꾸면 될까?",
      choices: ["ROM의 프로그램만", "ALU 회로", "프로그램 카운터 회로"],
      answer: 0,
      explain: "CPU 회로는 그대로 두고 프로그램만 바꾸면 다른 일을 한다. 그래서 CPU를 쓴다.",
    },
  ],
  glossary: ["firmware"],
};
