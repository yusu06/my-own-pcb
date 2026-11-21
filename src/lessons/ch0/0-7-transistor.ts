import type { Lesson } from "../types";
import { ckt } from "../../sim/electric/ckt";

const P = ["bat:battery:3", "btn:button", "rb:resistor:10000", "q:npn", "r:resistor:100", "led:led"];
const LOAD = ["bat.+~r.a", "r.b~led.a", "led.k~q.c", "q.e~bat.-"];

export const lesson: Lesson = {
  id: "0-7",
  chapter: 0,
  title: "전기로 누르는 스위치",
  emoji: "🔌",
  minutes: 14,
  client: {
    from: "장난감 회사 ‘꼬마발명가’",
    request: "아주 약한 전류만 흘릴 수 있는 버튼 신호로 LED를 켜야 합니다. 버튼에는 큰 전류가 흐르면 안 됩니다.",
    requirements: ["버튼을 누르면 LED가 켜질 것", "버튼 쪽에는 아주 작은 전류만 흐를 것", "타는 부품이 없을 것"],
  },
  concepts: [
    {
      title: "손가락 대신 전기로 누르는 스위치",
      body:
        "[[transistor]]는 다리가 세 개다: 베이스(B), 컬렉터(C), 이미터(E). " +
        "베이스→이미터로 아주 작은 [[current]]가 흐르면, 컬렉터→이미터 사이의 ‘스위치’가 닫혀서 훨씬 큰 전류가 흐를 수 있다.",
    },
    {
      title: "베이스 저항",
      body:
        "베이스도 [[led]]처럼 약 0.7V를 넘으면 전류가 쉽게 흐르므로, [[resistor]](여기서는 10kΩ)로 전류를 제한한다. " +
        "그러면 베이스 전류는 약 0.2mA로 아주 작고, LED 쪽은 약 10mA가 흐른다. 작은 전류로 수십 배 큰 전류를 조종하는 셈이다.",
    },
  ],
  tasks: [
    {
      kind: "electric",
      title: "트랜지스터 스위치 만들기",
      goal: "① 전지 + → 버튼 → 베이스 저항 → [[transistor]] B. ② 전지 + → 저항 → [[led]] → [[transistor]] C. ③ [[transistor]] E → 전지 −.",
      palette: [
        { id: "btn", kind: "button", label: "버튼" },
        { id: "rb", kind: "resistor", label: "베이스 저항", values: [10000] },
        { id: "q", kind: "npn", label: "트랜지스터" },
        { id: "r", kind: "resistor", label: "LED 저항", values: [100] },
        { id: "led", kind: "led", label: "LED" },
      ],
      preset: ckt(["bat:battery:3"], []),
      checks: [
        { kind: "truth", inputs: ["btn"], output: "led", expect: [0, 1] },
        { kind: "noBurn" },
        { kind: "noShort" },
      ],
      reference: ckt(P, ["bat.+~btn.a", "btn.b~rb.a", "rb.b~q.b", ...LOAD]),
      wrong: [ckt(P, ["bat.+~btn.a", "btn.b~rb.a", ...LOAD])],
      hint: "트랜지스터의 왼쪽 핀이 B(베이스), 오른쪽 위가 C(컬렉터), 오른쪽 아래가 E(이미터)예요.",
    },
  ],
  realWorld: [
    {
      title: "작은 칩이 큰 모터를 돌리는 법",
      body:
        "나중에 배울 마이크로컨트롤러(MCU)의 핀은 아주 작은 전류(수 mA~수십 mA)만 내보낼 수 있다. " +
        "모터, 릴레이, 밝은 LED처럼 전류가 많이 필요한 부품은 이렇게 [[transistor]]를 사이에 두고 켠다. 실무 회로에서 가장 흔한 패턴 중 하나다.",
    },
  ],
  quiz: [
    {
      kind: "choice",
      q: "트랜지스터에서 작은 전류로 ‘조종’하는 다리는?",
      choices: ["베이스(B)", "컬렉터(C)", "이미터(E)"],
      answer: 0,
      explain: "베이스에 작은 전류를 흘리면 컬렉터–이미터 사이로 큰 전류가 흐른다.",
    },
    {
      kind: "choice",
      q: "이 회로에서 베이스 전류와 LED 전류를 비교하면?",
      choices: ["베이스 전류가 훨씬 작다", "둘이 같다", "베이스 전류가 훨씬 크다"],
      answer: 0,
      explain: "베이스는 약 0.2mA, LED는 약 10mA. 작은 전류로 큰 전류를 켜는 것이 트랜지스터 스위치의 핵심이다.",
    },
    {
      kind: "choice",
      q: "베이스 저항을 빼고 버튼을 베이스에 바로 이으면?",
      choices: ["베이스로 전류가 너무 많이 흘러 위험하다", "LED가 더 오래 간다", "아무 차이 없다"],
      answer: 0,
      explain: "베이스–이미터도 약 0.7V를 넘으면 전류가 쉽게 흐르므로 저항으로 제한해야 한다.",
    },
  ],
  glossary: ["transistor"],
};
