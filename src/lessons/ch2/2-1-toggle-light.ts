import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["s_n:in", "r_n:in", "q:out"];
const HEAD = "module toggle_light(input on, input off, output reg light);\n";

/** 0일 때 누른 것(액티브 로우). 둘 다 1이면 그대로 */
const latchModel = () => {
  let q: 0 | 1 = 0;
  return (i: Record<string, 0 | 1>) => {
    if (!i.s_n) q = 1;
    else if (!i.r_n) q = 0;
    return { q };
  };
};
const press = (s_n: 0 | 1, r_n: 0 | 1) => ({ s_n, r_n });

export const lesson: Lesson = {
  id: "2-1",
  chapter: 2,
  title: "켜기·끄기 버튼 전등",
  emoji: "💡",
  minutes: 15,
  client: {
    from: "카페 ‘한잔의여유’",
    request:
      "가게 벽에 ‘켜기’ 버튼과 ‘끄기’ 버튼을 하나씩 달려고 해요. 켜기를 한 번 눌렀다 떼도 전등이 계속 켜져 있고, 끄기를 눌러야 꺼지게 해 주세요.",
    requirements: ["켜기를 눌렀다 떼도 계속 켜짐", "끄기를 눌렀다 떼도 계속 꺼짐", "아무것도 안 누르면 지금 상태 그대로"],
  },
  concepts: [
    {
      title: "지금까지의 회로는 기억을 못 한다",
      body:
        "1장의 회로는 모두 ‘지금 입력’만 보고 출력을 정했다. 그래서 버튼에서 손을 떼면 결과도 바로 돌아간다. " +
        "이번 의뢰는 다르다. 버튼을 뗀 뒤에도 ‘마지막에 무엇을 눌렀는지’를 기억해야 한다. 이렇게 과거를 기억하는 회로를 순차 회로라고 하고, 가장 단순한 기억 회로가 [[latch]]다.",
    },
    {
      title: "출력을 입력으로 되돌리기",
      body:
        "NAND 두 개의 출력을 서로의 입력에 이으면, 한쪽이 1이면 다른 쪽이 0이 되는 상태로 굳어서 스스로 버틴다. 이것이 SR 래치다. " +
        "s_n을 0으로 누르면 q = 1로 ‘설정(set)’되고, r_n을 0으로 누르면 q = 0으로 ‘리셋(reset)’된다. 둘 다 1이면 아무 일도 없이 지금 값을 유지한다.",
    },
    {
      title: "0일 때 누름: 액티브 로우",
      body:
        "이름 끝의 _n은 ‘0일 때 동작한다’는 표시다. 이런 신호를 [[active-low]]라고 한다. 실제 버튼도 누르면 신호선을 0V(GND)에 붙이는 방식이 많아서, 액티브 로우는 아주 흔하다. " +
        "주의: s_n과 r_n을 동시에 0으로 누르면 ‘켜라’와 ‘꺼라’가 겹쳐 버린다. 그래서 둘을 함께 누르지 않도록 쓰는 것이 약속이다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "NAND 두 개로 SR 래치",
      goal: "켜기 버튼(s_n)과 끄기 버튼(r_n)은 누르면 0이에요. NAND 2개로 q가 마지막 버튼을 기억하게 만드세요. 실험 모드에서 s_n을 0→1로 바꿔 보면 손을 떼도 q가 남아요. 통과하면 SR 래치가 부품함에 저장돼요.",
      palette: [{ id: "nand", kind: "nand", label: "NAND", multi: true }],
      preset: lckt(IO, []),
      inputs: ["s_n", "r_n"],
      outputs: ["q"],
      labels: { s_n: "켜기 s_n", r_n: "끄기 r_n", q: "전등 q" },
      expect: [],
      seq: {
        steps: [press(1, 0), press(1, 1), press(0, 1), press(1, 1), press(1, 1), press(1, 0), press(1, 1), press(0, 1), press(1, 1)],
        model: latchModel,
      },
      reference: lckt([...IO, "nand1:nand", "nand2:nand"], ["s_n.y~nand1.a", "nand2.y~nand1.b", "r_n.y~nand2.a", "nand1.y~nand2.b", "nand1.y~q.a"]),
      wrong: [
        // 기억 없이 q = NOT s_n: 손을 떼면 바로 꺼진다
        lckt([...IO, "nand1:nand"], ["s_n.y~nand1.a", "s_n.y~nand1.b", "nand1.y~q.a"]),
        // 반대쪽 NAND에서 출력을 꺼냄: 켜기와 끄기가 뒤바뀐다
        lckt([...IO, "nand1:nand", "nand2:nand"], ["s_n.y~nand1.a", "nand2.y~nand1.b", "r_n.y~nand2.a", "nand1.y~nand2.b", "nand2.y~q.a"]),
      ],
      saveAs: "sr",
      maxCost: 2,
      hint: "첫 NAND의 입력 하나는 s_n, 다른 하나는 둘째 NAND의 출력. 둘째 NAND도 r_n과 첫 NAND의 출력을 받아요. q는 첫 NAND 출력에서 꺼내요.",
    },
    {
      kind: "verilog",
      title: "Verilog로 기억하기",
      goal: "이번엔 버튼이 1일 때 누른 거예요. on을 누르면 light = 1, off를 누르면 light = 0, 둘 다 안 누르면 그대로 두세요.",
      top: "toggle_light",
      skeleton: HEAD + "  always @(*) begin\n    // on이면 light = 1, off면 light = 0, 아니면 아무것도 넣지 않기\n    light = 0;\n  end\nendmodule\n",
      inputs: [{ name: "on", width: 1 }, { name: "off", width: 1 }],
      outputs: [{ name: "light", width: 1 }],
      labels: { on: "켜기", off: "끄기", light: "전등" },
      seq: {
        steps: [
          { on: 0, off: 1 }, { on: 0, off: 0 }, { on: 1, off: 0 }, { on: 0, off: 0 }, { on: 0, off: 0 },
          { on: 0, off: 1 }, { on: 0, off: 0 }, { on: 1, off: 0 }, { on: 0, off: 0 },
        ],
        model() {
          let light = 0;
          return ({ on, off }) => {
            if (on) light = 1;
            else if (off) light = 0;
            return { light };
          };
        },
      },
      reference: HEAD + "  always @(*) begin\n    if (on) light = 1;\n    else if (off) light = 0;\n  end\nendmodule\n",
      wrong: [
        // 마지막 else가 있으면 기억하지 못한다
        HEAD + "  always @(*) begin\n    if (on) light = 1;\n    else light = 0;\n  end\nendmodule\n",
        HEAD + "  always @(*) light = on;\nendmodule\n",
      ],
      hint: "if (on) light = 1; else if (off) light = 0; — 여기서 끝내요. 마지막 else를 쓰지 않으면, 아무것도 안 누른 경우 light에 값을 넣지 않아서 예전 값이 남아요.",
    },
  ],
  realWorld: [
    {
      title: "실제 기기의 래치",
      body:
        "누르는 순간만 신호가 나오는 버튼으로 상태를 바꾸는 장치(전원 버튼, 비상 정지 해제 등)에는 이런 기억 회로가 들어 있다. " +
        "1-6에서 ‘default를 빠뜨리면 래치가 생겨 버그’라고 배웠다. 래치 자체가 나쁜 것은 아니다. 일부러 만든 래치는 기능이고, 모르고 생긴 래치가 버그다. " +
        "실제 FPGA 설계에서는 래치보다 다음 단원들에서 배울 클럭 기반 플립플롭을 주로 쓴다. 타이밍을 예측하기 쉽기 때문이다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "SR 래치(NAND)에서 s_n = 1, r_n = 1이면?",
      choices: ["q가 1이 된다", "q가 0이 된다", "q가 지금 값을 유지한다"],
      answer: 2,
      explain: "둘 다 1이면 아무 버튼도 안 누른 상태. 서로 물린 NAND가 지금 값을 계속 붙잡는다.",
    },
    {
      kind: "choice",
      q: "신호 이름 reset_n의 _n은 무슨 뜻일까?",
      choices: ["숫자(number) 신호", "0일 때 동작하는 신호(액티브 로우)", "음수 값"],
      answer: 1,
      explain: "_n(또는 위에 줄을 그은 이름)은 0일 때 동작한다는 표시다. reset_n = 0이면 리셋.",
    },
    {
      kind: "choice",
      q: "always @(*) 안에서 어떤 경우에 출력에 값을 넣지 않으면?",
      choices: ["그 경우 출력이 0이 된다", "그 경우 예전 값이 남는다(래치)", "문법 오류"],
      answer: 1,
      explain: "값을 안 넣은 경우에는 출력이 예전 값을 유지한다. 이번 과제에서는 이걸 일부러 썼다.",
    },
  ],
  glossary: ["latch", "active-low"],
};
