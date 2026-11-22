import { CURRENT_VERSION, type SaveData } from "./schema";

/** message는 화면에 그대로 보여준다. */
export class SaveError extends Error {}

/** MIGRATIONS[n]은 버전 n 데이터를 n+1로 바꾼다. 형식을 바꿀 때마다 하나씩 추가하고 fixtures로 테스트한다. */
const MIGRATIONS: Record<number, (d: any) => any> = {
  // v1 → v2: 만든 회로(work)와 과제 통과 기록(tasksDone) 추가
  1: (d) => ({
    ...d,
    work: {},
    progress: Object.fromEntries(
      Object.entries(isObj(d.progress) ? d.progress : {}).map(([id, p]) => [id, isObj(p) ? { ...p, tasksDone: [] } : p]),
    ),
  }),
  // v2 → v3: 부품함(chips) 추가
  2: (d) => ({ ...d, chips: {} }),
};

const STATUSES = ["started", "done", "skipped"];
const THEMES = ["system", "light", "dark"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function migrate(raw: unknown): SaveData {
  if (!isObj(raw) || typeof raw.version !== "number") throw new SaveError("저장 데이터 형식이 아니에요.");
  if (raw.version > CURRENT_VERSION) throw new SaveError("이 앱보다 더 새로운 버전에서 만든 데이터예요. 앱을 새로고침해 주세요.");
  let d: any = raw;
  for (let v = d.version; v < CURRENT_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError(`버전 ${v} 데이터는 옮길 수 없어요.`);
    d = { ...step(d), version: v + 1 };
  }
  // 부품함이 망가져도 진행 기록은 지킨다: 배열이 아닌 항목만 버린다(빠진 부품은 기본 부품으로 대체된다)
  d.chips = Object.fromEntries(Object.entries(isObj(d.chips) ? d.chips : {}).filter(([, v]) => Array.isArray(v)));
  if (!isObj(d.progress) || !isObj(d.work) || !isObj(d.settings) || !THEMES.includes(d.settings.theme as string)) {
    throw new SaveError("저장 데이터가 손상됐어요.");
  }
  for (const [id, p] of Object.entries(d.progress)) {
    const ok =
      isObj(p) &&
      STATUSES.includes(p.status as string) &&
      Number.isInteger(p.step) &&
      Array.isArray(p.quizCorrect) &&
      p.quizCorrect.every(Number.isInteger) &&
      Array.isArray(p.tasksDone) &&
      p.tasksDone.every(Number.isInteger) &&
      typeof p.updatedAt === "number";
    if (!ok) throw new SaveError(`단원 ${id}의 기록이 손상됐어요.`);
  }
  return d as SaveData;
}
