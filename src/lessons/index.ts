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
export const LESSONS: Lesson[] = [l0_1, l0_2, l0_3, l0_4, l0_5, l0_6, l0_7, l1_1, l1_2, l1_3, l1_4];

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
