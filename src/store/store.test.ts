import { expect, test } from "vitest";
import { KEYS, openStore, type KV } from "./store";
import { emptySave } from "./schema";
import { migrate, SaveError } from "./migrate";
import v1 from "./fixtures/v1.json";

function memKV(init: Record<string, string> = {}): KV & { map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}
const throwingKV: KV = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

test("빈 저장소는 빈 저장으로 연다", () => {
  const s = openStore(memKV());
  expect(s.data).toEqual(emptySave());
  expect(s.warning).toBeNull();
});

test("저장 후 다시 열면 진행 상황이 남아 있다", () => {
  const kv = memKV();
  const s = openStore(kv);
  s.data = { ...s.data, progress: { "0-1": { status: "done", step: 5, quizCorrect: [0, 1, 2], updatedAt: 1 } } };
  s.save();
  expect(openStore(kv).data.progress["0-1"].status).toBe("done");
});

test("저장소를 못 쓰면 경고만 띄우고 죽지 않는다", () => {
  for (const kv of [null, throwingKV]) {
    const s = openStore(kv);
    expect(s.data).toEqual(emptySave());
    expect(s.warning).toContain("진행 상황이 저장되지 않아요");
    expect(() => s.save()).not.toThrow();
    expect(() => s.snapshot()).not.toThrow();
  }
});

test("깨진 저장 데이터는 지우지 않고 hw.corrupt에 보관한다", () => {
  const kv = memKV({ [KEYS.save]: "{깨진json" });
  const s = openStore(kv);
  expect(s.data).toEqual(emptySave());
  expect(kv.map.get(KEYS.corrupt)).toBe("{깨진json");
  expect(s.warning).not.toBeNull();
});

test("미래 버전 데이터는 보관하고 경고한다", () => {
  const raw = JSON.stringify({ ...emptySave(), version: 99 });
  const kv = memKV({ [KEYS.save]: raw });
  const s = openStore(kv);
  expect(kv.map.get(KEYS.corrupt)).toBe(raw);
  expect(s.warning).toContain("더 새로운 버전");
});

test("백업 내보내기 → 불러오기 왕복", () => {
  const a = openStore(memKV());
  a.data = { ...a.data, settings: { theme: "dark" } };
  const text = a.exportBackup(new Date("2026-11-22T00:00:00Z"));
  expect(JSON.parse(text)).toMatchObject({ app: "my-own-pcb", exportedAt: "2026-11-22T00:00:00.000Z" });
  const b = openStore(memKV());
  b.importBackup(text);
  expect(b.data).toEqual(a.data);
});

test("엉뚱한 백업 파일은 거부하고 현재 데이터를 지킨다", () => {
  const s = openStore(memKV());
  s.data = { ...s.data, settings: { theme: "light" } };
  const before = structuredClone(s.data);
  expect(() => s.importBackup('{"app":"other"}')).toThrow(SaveError);
  expect(() => s.importBackup("not json")).toThrow(SaveError);
  expect(() => s.importBackup(JSON.stringify({ app: "my-own-pcb", data: { version: 1 } }))).toThrow(SaveError);
  expect(s.data).toEqual(before);
});

test("snapshot은 현재 데이터를 hw.backup.prev에 남긴다", () => {
  const kv = memKV();
  const s = openStore(kv);
  s.snapshot();
  expect(JSON.parse(kv.map.get(KEYS.prevBackup)!)).toEqual(s.data);
});

test("미래 버전 데이터는 그 세션 동안 hw.save를 덮어쓰지 않는다", () => {
  const raw = JSON.stringify({ ...emptySave(), version: 99 });
  const kv = memKV({ [KEYS.save]: raw });
  const s = openStore(kv);
  s.data = { ...s.data, settings: { theme: "dark" } };
  s.save();
  expect(kv.map.get(KEYS.save)).toBe(raw);
});

test("hw.corrupt에 보관하지 못하면 hw.save를 덮어쓰지 않는다", () => {
  const map = new Map<string, string>([[KEYS.save, "{깨진"]]);
  const kv: KV = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (k === KEYS.corrupt) throw new Error("QuotaExceededError");
      map.set(k, v);
    },
  };
  const s = openStore(kv);
  s.save();
  expect(map.get(KEYS.save)).toBe("{깨진");
});

test("백업을 불러오면 읽기 전용이 풀리고 저장된다", () => {
  const kv = memKV({ [KEYS.save]: JSON.stringify({ ...emptySave(), version: 99 }) });
  const s = openStore(kv);
  s.importBackup(JSON.stringify({ app: "my-own-pcb", data: emptySave() }));
  expect(JSON.parse(kv.map.get(KEYS.save)!).version).toBe(1);
});

test("옛 버전 데이터는 마이그레이션 전에 hw.backup.prev에 원문을 남긴다", () => {
  const raw = JSON.stringify({ ...emptySave(), version: 0 });
  const kv = memKV({ [KEYS.save]: raw });
  openStore(kv);
  expect(kv.map.get(KEYS.prevBackup)).toBe(raw);
});

test("백업을 불러오기 전에 현재 데이터를 hw.backup.prev에 남긴다", () => {
  const kv = memKV();
  const s = openStore(kv);
  s.data = { ...s.data, settings: { theme: "dark" } };
  s.importBackup(JSON.stringify({ app: "my-own-pcb", data: emptySave() }));
  expect(JSON.parse(kv.map.get(KEYS.prevBackup)!).settings.theme).toBe("dark");
});

test("v1 샘플 파일이 migrate를 통과한다", () => {
  expect(migrate(v1).progress["0-1"].status).toBe("done");
});

test("형식이 틀린 progress 항목은 SaveError", () => {
  expect(() => migrate({ ...emptySave(), progress: { "0-1": { status: "weird" } } })).toThrow(SaveError);
  expect(() => migrate(null)).toThrow(SaveError);
});
