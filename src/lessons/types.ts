/** body/q/explain 안의 [[용어id]]는 탭하면 용어 설명이 뜬다. */
export interface Card {
  title: string;
  body: string;
}

export type QuizItem =
  | { kind: "choice"; q: string; choices: string[]; answer: number; explain: string }
  /** tolerance = 상대 오차 (0.05 = ±5%) */
  | { kind: "number"; q: string; answer: number; tolerance: number; unit: string; explain: string };

/** M2~M5에서 electric/logic/verilog 과제로 확장한다. */
export type Task = never;

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
