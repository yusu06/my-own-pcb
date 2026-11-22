import type { Lesson } from "../types";
import { clocked } from "../seq";

const HEAD = "module debounce(input clk, input btn, output reg pressed);\n";
const body = (logic: string) => HEAD + "  reg [1:0] cnt;\n  always @(posedge clk) begin\n" + logic + "  end\nendmodule\n";

/** 주기마다 버튼 값(1주기 = 1ms). 누를 때와 뗄 때 접점이 튄다 */
const BTN = [0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0];
const NEED = 4;

export const lesson: Lesson = {
  id: "2-4",
  chapter: 2,
  title: "한 번 눌렀는데 두 번?",
  emoji: "🔘",
  minutes: 18,
  client: {
    from: "주방 가전 회사 ‘따끈’",
    request:
      "전기 포트의 ‘온도 올리기’ 버튼을 한 번 눌렀는데 가끔 두세 칸씩 올라간다는 불만이 들어와요. 버튼 신호를 깨끗하게 정리하는 회로를 만들어 주세요.",
    requirements: ["클럭 한 칸 = 1ms", "btn이 같은 값으로 4ms(4주기) 연속이면 pressed가 그 값을 따른다", "그 전에 튀면 처음부터 다시 센다"],
  },
  concepts: [
    {
      title: "버튼은 튄다(바운스)",
      body:
        "버튼 속 금속 접점은 눌리는 순간 아주 잠깐 붙었다 떨어졌다를 반복한다. 사람에게는 한 번이지만, 1ms마다 보는 회로에게는 0, 1, 0, 1, 1…처럼 여러 번 누른 것으로 보인다. " +
        "튀는 시간은 보통 수 ms이고 버튼마다, 오래 쓸수록 달라진다. 이것을 한 번의 누름으로 정리하는 일이 [[debounce]]다.",
    },
    {
      title: "같은 값이 오래 유지될 때만 믿기",
      body:
        "방법: 지금 믿고 있는 값(pressed)과 btn이 다르면 카운터 cnt를 1씩 올린다. 중간에 btn이 다시 pressed와 같아지면(튀면) cnt를 0으로 되돌린다. 4번 연속 다르면 그제야 pressed <= btn. " +
        "cnt는 0~3을 세므로 2비트면 된다: reg [1:0] cnt; cnt가 3인데 또 다르면 그것이 4번째다.",
    },
    {
      title: "여러 값을 한 에지에",
      body:
        "posedge 블록 안에서 pressed와 cnt를 함께 바꿀 수 있다. 둘 다 <= 라서, 같은 에지 안에서는 모두 ‘에지 직전 값’을 보고 계산한 뒤 한꺼번에 바뀐다. " +
        "그래서 if (btn == pressed) 의 pressed는 이번 에지에 바뀌기 전 값이다.",
    },
  ],
  tasks: [
    {
      kind: "verilog",
      title: "디바운서",
      goal: "btn이 pressed와 다른 값으로 4주기 연속이면 pressed <= btn. 중간에 같아지면 cnt를 0으로. 결과 타임라인에서 튀는 btn과 깨끗한 pressed를 비교해 보세요.",
      top: "debounce",
      skeleton: body("    // btn == pressed 이면 cnt <= 0\n    // 아니고 cnt == 3 이면 pressed <= btn; cnt <= 0;\n    // 그 밖에는 cnt <= cnt + 1\n"),
      inputs: [{ name: "clk", width: 1 }, { name: "btn", width: 1 }],
      outputs: [{ name: "pressed", width: 1 }],
      labels: { btn: "버튼(튐)", pressed: "정리됨" },
      seq: {
        steps: clocked(BTN.map((btn) => ({ btn }))),
        model() {
          let pressed = 0;
          let cnt = 0;
          let last = 0;
          return ({ clk, btn }) => {
            if (clk && !last) {
              if (btn === pressed) cnt = 0;
              else if (cnt === NEED - 1) {
                pressed = btn;
                cnt = 0;
              } else cnt++;
            }
            last = clk;
            return { pressed };
          };
        },
      },
      reference: body(
        "    if (btn == pressed) cnt <= 0;\n    else if (cnt == 3) begin\n      pressed <= btn;\n      cnt <= 0;\n    end\n    else cnt <= cnt + 1;\n",
      ),
      wrong: [
        // 정리하지 않고 그대로 따라감
        HEAD + "  always @(posedge clk) pressed <= btn;\nendmodule\n",
        // 2주기만 기다림: 짧게 튄 것도 누름으로 본다
        body("    if (btn == pressed) cnt <= 0;\n    else if (cnt == 1) begin\n      pressed <= btn;\n      cnt <= 0;\n    end\n    else cnt <= cnt + 1;\n"),
        // 튀어도 cnt를 되돌리지 않음: 흩어진 것을 모아 세 버린다
        body("    if (btn != pressed) begin\n      if (cnt == 3) begin\n        pressed <= btn;\n        cnt <= 0;\n      end\n      else cnt <= cnt + 1;\n    end\n"),
      ],
      hint: "if (btn == pressed) cnt <= 0; else if (cnt == 3) begin pressed <= btn; cnt <= 0; end else cnt <= cnt + 1;",
    },
  ],
  realWorld: [
    {
      title: "하드웨어로 거르기, 소프트웨어로 거르기",
      body:
        "버튼 옆에 저항과 커패시터(RC)를 달아 튀는 신호를 부드럽게 만드는 하드웨어 방법도 있다. 4장에서 다룬다. MCU에서는 이번 회로와 같은 생각을 펌웨어로 짠다: 몇 ms 동안 같은 값이면 누른 것으로 친다. " +
        "기다리는 시간이 너무 짧으면 튐이 새어 나오고, 너무 길면 버튼이 둔하게 느껴진다. 보통 5~20ms 사이에서 고른다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "버튼 하나를 눌렀는데 회로가 여러 번 누른 것으로 보는 이유는?",
      choices: ["전지가 약해서", "접점이 눌리는 순간 잠깐 붙었다 떨어지기를 반복해서", "클럭이 너무 느려서"],
      answer: 1,
      explain: "금속 접점이 튀는 바운스 때문이다. 클럭이 빠를수록 더 잘 보인다.",
    },
    {
      kind: "number",
      q: "클럭 한 주기가 1ms이고 4주기 연속을 기다린다면, 버튼을 누른 뒤 최소 몇 ms 뒤에 pressed가 바뀔까?",
      answer: 4,
      tolerance: 0.01,
      unit: "ms",
      explain: "튀지 않는다면 4주기 × 1ms = 4ms. 튀면 그만큼 더 늦어진다.",
    },
  ],
  glossary: ["debounce"],
};
