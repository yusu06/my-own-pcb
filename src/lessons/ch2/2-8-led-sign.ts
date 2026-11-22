import type { Lesson } from "../types";
import { lckt } from "../lckt";
import { clocked } from "../seq";

const IO = ["s:in", "clk:in", "q0:out", "q1:out", "q2:out"];
const PARTS = [...IO, "dff1:dff", "dff2:dff", "dff3:dff"];
const CLK = ["clk.y~dff1.clk", "clk.y~dff2.clk", "clk.y~dff3.clk"];
const HEAD = "module led_sign(input clk, input rst, input s, output reg [7:0] leds);\n";
const code = (shift: string) =>
  HEAD + "  always @(posedge clk) begin\n    if (rst) leds <= 0;\n    else " + shift + "\n  end\nendmodule\n";

/** 전광판에 흘려 보낼 점 무늬(1 = 켜짐) */
const PATTERN = [1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1];

export const lesson: Lesson = {
  id: "2-8",
  chapter: 2,
  title: "흐르는 LED 전광판",
  emoji: "📟",
  minutes: 18,
  client: {
    from: "분식집 ‘떡볶이천국’",
    request:
      "가게 앞에 LED 8개짜리 띠를 달아 불빛이 오른쪽에서 왼쪽으로 흘러가게 하고 싶어요. 제어 칩에서 나오는 선은 한 가닥뿐이라, 그 한 가닥으로 점을 하나씩 밀어 넣어야 해요.",
    requirements: ["입력 s: 새로 들어올 점 하나(1 = 켜짐)", "에지마다 모든 점이 한 칸씩 위 비트 쪽으로", "새 점은 leds[0]에", "rst = 1이면 모두 끔"],
  },
  concepts: [
    {
      title: "줄지어 선 플립플롭",
      body:
        "플립플롭을 한 줄로 이어 앞 플립플롭의 q를 다음 플립플롭의 d에 넣고, 모두 같은 clk을 준다. 에지마다 모든 값이 한 칸씩 옆으로 옮겨 간다. 이것이 [[shift-register]]다. " +
        "같은 에지에 모두가 ‘에지 직전 값’을 받기 때문에 한 번에 딱 한 칸만 밀린다. 실제 플립플롭이 이렇게 동작하도록, 이번에는 앱에 들어 있는 기본 D 플립플롭을 쓴다.",
    },
    {
      title: "선 하나로 여러 비트: 직렬",
      body:
        "선 8가닥으로 한꺼번에 보내는 방식을 병렬, 한 가닥으로 한 비트씩 차례로 보내는 방식을 직렬이라고 한다. 시프트 레지스터는 직렬로 들어온 비트를 모아 병렬 출력으로 바꿔 준다. " +
        "선이 적으면 보드 배선과 커넥터가 간단해진다.",
    },
    {
      title: "Verilog: 연결로 밀기",
      body:
        "leds <= {leds[6:0], s}; 한 줄이면 된다. leds[6:0]을 한 칸 위로 올려 붙이고, 비어 있는 맨 아래 칸에 s를 넣는다는 뜻이다. 맨 위 leds[7]은 밖으로 밀려 사라진다. " +
        "논블로킹(<=)이라 오른쪽은 모두 에지 직전 값으로 계산된다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "3칸 시프트 레지스터 그리기",
      goal: "기본 D 플립플롭 3개로 s → q0 → q1 → q2 순서로 에지마다 한 칸씩 밀리게 하세요. 실험 모드에서 s를 정하고 clk를 0 → 1로 눌러 보세요.",
      palette: [{ id: "dff", kind: "dff", label: "D 플립플롭(기본)", multi: true }],
      preset: lckt(IO, []),
      inputs: ["s", "clk"],
      outputs: ["q0", "q1", "q2"],
      labels: { s: "새 점 s" },
      expect: [],
      seq: {
        steps: clocked(PATTERN.slice(0, 8).map((s) => ({ s }))) as Record<string, 0 | 1>[],
        model() {
          let q = [0, 0, 0];
          let last = 0;
          return ({ s, clk }) => {
            if (clk && !last) q = [s, q[0], q[1]];
            last = clk;
            return { q0: q[0] as 0 | 1, q1: q[1] as 0 | 1, q2: q[2] as 0 | 1 };
          };
        },
      },
      reference: lckt(PARTS, [...CLK, "s.y~dff1.d", "dff1.q~dff2.d", "dff2.q~dff3.d", "dff1.q~q0.a", "dff2.q~q1.a", "dff3.q~q2.a"]),
      wrong: [
        // 모두 s를 받음: 세 칸이 늘 같다
        lckt(PARTS, [...CLK, "s.y~dff1.d", "s.y~dff2.d", "s.y~dff3.d", "dff1.q~q0.a", "dff2.q~q1.a", "dff3.q~q2.a"]),
        // 출력 순서가 거꾸로
        lckt(PARTS, [...CLK, "s.y~dff1.d", "dff1.q~dff2.d", "dff2.q~dff3.d", "dff3.q~q0.a", "dff2.q~q1.a", "dff1.q~q2.a"]),
      ],
      hint: "s → 첫째 d, 첫째 q → 둘째 d, 둘째 q → 셋째 d. 세 clk은 모두 clk. q0·q1·q2는 첫째·둘째·셋째의 q.",
    },
    {
      kind: "verilog",
      title: "Verilog로 8칸 전광판",
      goal: "에지마다 leds를 한 칸 위로 밀고 맨 아래 leds[0]에 s를 넣으세요. rst면 모두 0.",
      top: "led_sign",
      skeleton: code("leds <= leds; // 여기를 고치세요"),
      inputs: [{ name: "clk", width: 1 }, { name: "rst", width: 1 }, { name: "s", width: 1 }],
      outputs: [{ name: "leds", width: 8 }],
      labels: { rst: "리셋", s: "새 점", leds: "LED" },
      seq: {
        steps: clocked(
          [{ rst: 1, s: 1 }, ...PATTERN.map((s) => ({ rst: 0, s })), { rst: 1, s: 0 }, { rst: 0, s: 1 }],
          ["rst"],
        ),
        model() {
          let leds = 0;
          let last = 0;
          return ({ clk, rst, s }) => {
            if (clk && !last) leds = rst ? 0 : ((leds << 1) | s) & 0xff;
            last = clk;
            return { leds };
          };
        },
      },
      reference: code("leds <= {leds[6:0], s};"),
      wrong: [code("leds <= {s, leds[7:1]};"), code("leds <= leds << 1;"), HEAD + "  always @(posedge clk) leds <= {leds[6:0], s};\nendmodule\n"],
      hint: "else leds <= {leds[6:0], s};",
    },
  ],
  realWorld: [
    {
      title: "실제 부품: 74HC595",
      body:
        "시프트 레지스터는 칩 하나로도 판다. 대표적인 것이 8비트 직렬 입력·병렬 출력 칩(예: 74HC595)이다. MCU 핀 3개(데이터, 클럭, 래치)로 LED 8개를 켤 수 있고, 칩을 여러 개 이어 붙이면 핀은 그대로 둔 채 LED를 16개, 24개로 늘릴 수 있다. " +
        "SPI 같은 직렬 통신도 속을 들여다보면 양쪽의 시프트 레지스터가 비트를 주고받는 구조다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "leds <= {leds[6:0], s}; 는 무엇을 할까?",
      choices: ["leds를 한 칸 위로 밀고 맨 아래에 s를 넣는다", "leds를 한 칸 아래로 밀고 맨 위에 s를 넣는다", "leds를 모두 s로 채운다"],
      answer: 0,
      explain: "연결 { }의 오른쪽이 아래 비트다. leds[6:0]이 위 7칸으로 가고, 맨 아래가 s.",
    },
    {
      kind: "number",
      q: "8칸 시프트 레지스터에 들어간 점 하나가 맨 위 leds[7]에 닿으려면 에지가 몇 번 필요할까? (들어가는 에지 포함)",
      answer: 8,
      tolerance: 0.01,
      unit: "번",
      explain: "첫 에지에 leds[0], 그다음 에지마다 한 칸씩 → 8번째 에지에 leds[7].",
    },
  ],
  glossary: ["shift-register"],
};
