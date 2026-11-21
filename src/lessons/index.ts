import type { Lesson } from "./types";
import { lesson as l0_1 } from "./ch0/0-1-flashlight";

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
export const LESSONS: Lesson[] = [l0_1];

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
