import type { ElectricCheck } from "../grader/electric";
import type { Circuit, PartKind } from "../sim/electric/types";

/** body/q/explain 안의 [[용어id]]는 탭하면 용어 설명이 뜬다. */
export interface Card {
  title: string;
  body: string;
  figure?: "and" | "or" | "not";
}

export type QuizItem =
  | { kind: "choice"; q: string; choices: string[]; answer: number; explain: string }
  /** tolerance = 상대 오차 (0.05 = ±5%) */
  | { kind: "number"; q: string; answer: number; tolerance: number; unit: string; explain: string };

/** 팔레트 부품은 각각 1개, id 고정(채점이 id로 부품을 찾는다). values = 저항값 선택지 */
export interface PaletteItem {
  id: string;
  kind: PartKind;
  label: string;
  values?: number[];
}

export interface ElectricTask {
  kind: "electric";
  title: string;
  goal: string;
  palette: PaletteItem[];
  /** 미리 놓인 부품(예: 전지). 사용자가 지울 수 없다. */
  preset: Circuit;
  checks: ElectricCheck[];
  reference: Circuit;
  wrong: Circuit[];
  hint: string;
}

/** M3 이후 logic/verilog 과제로 확장한다. */
export type Task = ElectricTask;

export interface Lesson {
  id: string;
  chapter: number;
  title: string;
  emoji: string;
  minutes: number;
  client: { from: string; request: string; requirements: string[] };
  concepts: Card[];
  tasks: Task[];
  realWorld: Card[];
  quiz: QuizItem[];
  glossary?: string[];
}
