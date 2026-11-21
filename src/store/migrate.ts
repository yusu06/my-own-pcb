import { CURRENT_VERSION, type SaveData } from "./schema";

/** message는 화면에 그대로 보여준다. */
export class SaveError extends Error {}

/** MIGRATIONS[n]은 버전 n 데이터를 n+1로 바꾼다. 형식을 바꿀 때마다 하나씩 추가하고 fixtures로 테스트한다. */
const MIGRATIONS: Record<number, (d: any) => any> = {};

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
  if (!isObj(d.progress) || !isObj(d.settings) || !THEMES.includes(d.settings.theme as string)) {
    throw new SaveError("저장 데이터가 손상됐어요.");
  }
  for (const [id, p] of Object.entries(d.progress)) {
    const ok =
      isObj(p) &&
      STATUSES.includes(p.status as string) &&
      Number.isInteger(p.step) &&
      Array.isArray(p.quizCorrect) &&
      p.quizCorrect.every(Number.isInteger) &&
      typeof p.updatedAt === "number";
    if (!ok) throw new SaveError(`단원 ${id}의 기록이 손상됐어요.`);
  }
  return d as SaveData;
}
