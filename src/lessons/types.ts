import type { ElectricCheck } from "../grader/electric";
import type { Circuit, PartKind } from "../sim/electric/types";
import type { ChipName } from "../sim/digital/chips";

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

/**
 * 팔레트 부품은 기본 1개, id 고정(채점이 id로 부품을 찾는다). values = 저항값 선택지.
 * multi = 여러 개 놓기(id는 `${id}1`, `${id}2`…). chip = kind가 "chip"일 때 부품함 부품 이름.
 */
export interface PaletteItem {
  id: string;
  kind: PartKind;
  label: string;
  values?: number[];
  multi?: boolean;
  chip?: ChipName;
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

export interface LogicTask {
  kind: "logic";
  title: string;
  goal: string;
  hint: string;
  palette: PaletteItem[];
  /** in·out 부품(잠김). id = inputs·outputs 이름 */
  preset: Circuit;
  inputs: string[];
  outputs: string[];
  /** in·out 부품 이름표(예: { d: "문 열림" }). 없으면 id 대문자 */
  labels?: Record<string, string>;
  /** 입력 조합 순서(첫 입력이 최상위 비트)마다 출력값 */
  expect: (0 | 1)[][];
  reference: Circuit;
  wrong: Circuit[];
  /** 통과하면 이 이름으로 부품함에 저장 */
  saveAs?: ChipName;
  /** NAND 환산 원가 목표. costRequired면 통과 조건, 아니면 ⭐만 */
  maxCost?: number;
  costRequired?: boolean;
}

/** M4에서 verilog 과제를 더한다. */
export type Task = ElectricTask | LogicTask;

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
