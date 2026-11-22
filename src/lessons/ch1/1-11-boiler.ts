import type { Lesson } from "../types";
import { lckt } from "../lckt";

const IO = ["a:in", "b:in", "gt:out", "eq:out"];
const HEAD = "module boiler(input [3:0] t, input [3:0] set, output heat, output ok, output over);\n";

export const lesson: Lesson = {
  id: "1-11",
  chapter: 1,
  title: "보일러 온도 설정",
  emoji: "🌡️",
  minutes: 15,
  client: {
    from: "난방 회사 ‘따숨’",
    request:
      "보일러 조절기를 만들고 있습니다. 온도 센서 값 t와 사용자가 정한 온도 set(둘 다 4비트 단계값)을 비교해서, 낮으면 보일러를 켜고 같으면 ‘적정’ 등을, 높으면 ‘과열’ 등을 켜 주세요.",
    requirements: ["1비트 비교기 그리기: a > b, a = b", "4비트: t < set → heat, t = set → ok, t > set → over", "세 출력 중 항상 딱 하나만 1"],
  },
  concepts: [
    {
      title: "한 자리 비교",
      body:
        "1비트 두 개를 비교하면 경우는 넷뿐이다. a > b는 a = 1, b = 0일 때만 → a AND (NOT b). a = b는 둘이 같을 때 → NOT (a XOR b). " +
        "이렇게 크기를 비교하는 회로를 [[comparator]]라고 한다.",
    },
    {
      title: "여러 자리는 윗자리부터",
      body:
        "두 수를 비교할 때 사람도 맨 앞자리부터 본다. 윗자리가 다르면 거기서 결론이 나고, 같으면 다음 자리로 내려간다. " +
        "그래서 4비트 비교기를 게이트로 그리면 꽤 크다. Verilog에서는 <, ==, > 연산자 한 글자면 합성 도구가 이 회로를 만들어 준다.",
    },
  ],
  tasks: [
    {
      kind: "logic",
      title: "1비트 비교기",
      goal: "a > b이면 gt, a = b이면 eq가 켜지게 하세요.",
      palette: [
        { id: "not", kind: "chip", chip: "not", label: "NOT", multi: true },
        { id: "and", kind: "chip", chip: "and", label: "AND", multi: true },
        { id: "xor", kind: "chip", chip: "xor", label: "XOR", multi: true },
      ],
      preset: lckt(IO, []),
      inputs: ["a", "b"],
      outputs: ["gt", "eq"],
      labels: { a: "a", b: "b", gt: "a > b", eq: "a = b" },
      expect: [
        [0, 1],
        [0, 0],
        [1, 0],
        [0, 1],
      ],
      reference: lckt(
        [...IO, "not1:chip:not", "and1:chip:and", "xor1:chip:xor", "not2:chip:not"],
        ["b.y~not1.a", "a.y~and1.a", "not1.y~and1.b", "and1.y~gt.a", "a.y~xor1.a", "b.y~xor1.b", "xor1.y~not2.a", "not2.y~eq.a"],
      ),
      wrong: [
        lckt(
          [...IO, "not1:chip:not", "and1:chip:and", "xor1:chip:xor"],
          ["a.y~not1.a", "not1.y~and1.a", "b.y~and1.b", "and1.y~gt.a", "a.y~xor1.a", "b.y~xor1.b", "xor1.y~eq.a"],
        ),
      ],
      hint: "gt = AND(a, NOT b). eq = NOT(XOR(a, b)).",
    },
    {
      kind: "verilog",
      title: "4비트 보일러 조절기",
      goal: "현재 온도 t가 설정 set보다 낮으면 heat, 같으면 ok, 높으면 over를 1로 하세요.",
      top: "boiler",
      skeleton: HEAD + "\nendmodule\n",
      inputs: [
        { name: "t", width: 4 },
        { name: "set", width: 4 },
      ],
      outputs: [
        { name: "heat", width: 1 },
        { name: "ok", width: 1 },
        { name: "over", width: 1 },
      ],
      labels: { t: "현재 t", set: "설정 set" },
      spec: ({ t, set }) => ({ heat: t < set ? 1 : 0, ok: t === set ? 1 : 0, over: t > set ? 1 : 0 }),
      reference: HEAD + "  assign heat = t < set;\n  assign ok = t == set;\n  assign over = t > set;\nendmodule\n",
      wrong: [
        HEAD + "  assign heat = t <= set;\n  assign ok = t == set;\n  assign over = t > set;\nendmodule\n",
        HEAD + "  assign heat = t > set;\n  assign ok = t == set;\n  assign over = t < set;\nendmodule\n",
      ],
      hint: "assign heat = t < set; 처럼 비교 연산자 결과는 1비트(참 1, 거짓 0)예요. ok는 ==, over는 >.",
    },
  ],
  realWorld: [
    {
      title: "히스테리시스",
      body:
        "실제 보일러를 ‘같으면 끄고 낮으면 켜기’로만 만들면, 온도가 설정값 근처에서 오르내릴 때 보일러가 몇 초마다 켜졌다 꺼졌다 해서 고장 난다. " +
        "그래서 ‘설정보다 2도 낮으면 켜고, 설정에 닿으면 끈다’처럼 켜는 점과 끄는 점을 다르게 둔다(히스테리시스). 켜짐 상태를 기억해야 하니 2장의 순차 회로가 필요하다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "1비트 비교에서 a = b를 만드는 식은?",
      choices: ["a AND b", "NOT (a XOR b)", "a OR b"],
      answer: 1,
      explain: "XOR은 다를 때 1이니, 뒤집으면 같을 때 1(XNOR).",
    },
    {
      kind: "choice",
      q: "Verilog에서 assign y = (t > set); 의 y는 몇 비트면 충분할까?",
      choices: ["1비트", "4비트", "8비트"],
      answer: 0,
      explain: "비교 결과는 참(1) 또는 거짓(0) 한 비트다.",
    },
  ],
  glossary: ["comparator"],
};
