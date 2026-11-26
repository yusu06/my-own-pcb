import type { Lesson } from "./types";
import { lesson as l0_1 } from "./ch0/0-1-flashlight";
import { lesson as l0_2 } from "./ch0/0-2-flashlight-led";
import { lesson as l0_3 } from "./ch0/0-3-car-light";
import { lesson as l0_4 } from "./ch0/0-4-microwave-easy";
import { lesson as l0_5 } from "./ch0/0-5-fridge-light";
import { lesson as l0_6 } from "./ch0/0-6-ones-and-zeros";
import { lesson as l0_7 } from "./ch0/0-7-transistor";
import { lesson as l1_1 } from "./ch1/1-1-interlock";
import { lesson as l1_2 } from "./ch1/1-2-stair-light";
import { lesson as l1_3 } from "./ch1/1-3-safe-alarm";
import { lesson as l1_4 } from "./ch1/1-4-fewer-parts";
import { lesson as l1_5 } from "./ch1/1-5-first-verilog";
import { lesson as l1_6 } from "./ch1/1-6-floor-display";
import { lesson as l1_7 } from "./ch1/1-7-joystick";
import { lesson as l1_8 } from "./ch1/1-8-tv-select";
import { lesson as l1_9 } from "./ch1/1-9-calculator";
import { lesson as l1_10 } from "./ch1/1-10-calculator-v2";
import { lesson as l1_11 } from "./ch1/1-11-boiler";
import { lesson as l2_1 } from "./ch2/2-1-toggle-light";
import { lesson as l2_2 } from "./ch2/2-2-clock";
import { lesson as l2_3 } from "./ch2/2-3-d-flipflop";
import { lesson as l2_4 } from "./ch2/2-4-debounce";
import { lesson as l2_5 } from "./ch2/2-5-register";
import { lesson as l2_6 } from "./ch2/2-6-microwave-timer";
import { lesson as l2_7 } from "./ch2/2-7-one-second";
import { lesson as l2_8 } from "./ch2/2-8-led-sign";
import { lesson as l2_9 } from "./ch2/2-9-traffic-light";
import { lesson as l2_10 } from "./ch2/2-10-door-lock";
import { lesson as l2_11 } from "./ch2/2-11-vending";
import { lesson as l2_12 } from "./ch2/2-12-microwave";
import { lesson as l3_1 } from "./ch3/3-1-memory";
import { lesson as l3_2 } from "./ch3/3-2-alu";
import { lesson as l3_3 } from "./ch3/3-3-instruction";
import { lesson as l3_4 } from "./ch3/3-4-program-counter";
import { lesson as l3_5 } from "./ch3/3-5-cpu";
import { lesson as l3_6 } from "./ch3/3-6-robot";
import { lesson as l3_7 } from "./ch3/3-7-why-mcu";
import { lesson as l4_1 } from "./ch4/4-1-volume-knob";
import { lesson as l4_2 } from "./ch4/4-2-joystick";

export const CHAPTERS: { n: number; title: string }[] = [
  { n: 0, title: "스위치에서 게이트까지" },
  { n: 1, title: "조합 논리" },
  { n: 2, title: "순차 논리" },
  { n: 3, title: "작은 컴퓨터" },
  { n: 4, title: "아날로그와 전원" },
  { n: 5, title: "MCU와 펌웨어" },
  { n: 6, title: "PCB와 실무" },
  { n: 7, title: "종합 의뢰" },
];

/** 진행 순서대로. 배포된 id는 바꾸지 않는다. */
export const LESSONS: Lesson[] = [l0_1, l0_2, l0_3, l0_4, l0_5, l0_6, l0_7, l1_1, l1_2, l1_3, l1_4, l1_5, l1_6, l1_7, l1_8, l1_9, l1_10, l1_11, l2_1, l2_2, l2_3, l2_4, l2_5, l2_6, l2_7, l2_8, l2_9, l2_10, l2_11, l2_12, l3_1, l3_2, l3_3, l3_4, l3_5, l3_6, l3_7, l4_1, l4_2];

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
