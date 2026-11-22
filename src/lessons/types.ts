import type { ElectricCheck, TimeRow } from "../grader/electric";
import type { Circuit, PartKind } from "../sim/electric/types";
import type { ChipName } from "../sim/digital/chips";

/** body/q/explain 안의 [[용어id]]는 탭하면 용어 설명이 뜬다. */
export interface Card {
  title: string;
  body: string;
  figure?: "and" | "or" | "not";
  /** 그림 대신 보여 줄 타임라인(신호 × 단계) */
  timeline?: TimeRow[];
  /** FSM 상태도 그림 */
  states?: StateDiagram;
}

/** 상태도: x·y는 0~100 비율 */
export interface StateDiagram {
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: { from: string; to: string; label: string }[];
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

/**
 * 순차 과제: 입력 각본(steps)을 차례로 넣고, model()이 만든 상태 모델의 출력과 단계마다 비교한다.
 * from = 이 단계부터 검사(전원 직후 값에 기대지 않게). 기본 0
 */
export interface SeqSpec<V extends number> {
  steps: Record<string, V>[];
  model(): (i: Record<string, V>) => Record<string, V>;
  from?: number;
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
  /** 있으면 순차 과제(expect는 [])로 타임라인 채점 */
  seq?: SeqSpec<0 | 1>;
  /** 통과하면 이 이름으로 부품함에 저장 */
  saveAs?: ChipName;
  /** NAND 환산 원가 목표. costRequired면 통과 조건, 아니면 ⭐만 */
  maxCost?: number;
  costRequired?: boolean;
}

export interface VerilogPort {
  name: string;
  width: number;
}

/** 사용자가 Verilog 모듈을 쓰는 과제(공통 부분) */
interface VerilogTaskBase {
  kind: "verilog";
  title: string;
  goal: string;
  hint: string;
  /** 시험할 모듈 이름(뼈대에 이미 들어 있다) */
  top: string;
  skeleton: string;
  inputs: VerilogPort[];
  outputs: VerilogPort[];
  /** 결과표에 보일 이름(예: { d: "층 번호" }) */
  labels?: Record<string, string>;
  reference: string;
  wrong: string[];
}

/** 조합 과제: 앱이 모든 입력 조합으로 시험한다 */
export interface VerilogCombTask extends VerilogTaskBase {
  /** 기대 출력. 해석기와 따로 TS로 써서 해석기 버그가 모범 답안과 같이 숨지 않게 한다 */
  spec(i: Record<string, number>): Record<string, number>;
  seq?: undefined;
}

/** 순차 과제: 입력 각본을 차례로 넣고 TS 상태 모델과 단계마다 비교한다 */
export interface VerilogSeqTask extends VerilogTaskBase {
  seq: SeqSpec<number>;
  spec?: undefined;
}

export type VerilogTask = VerilogCombTask | VerilogSeqTask;
export type CircuitTask = ElectricTask | LogicTask;
export type Task = CircuitTask | VerilogTask;

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
