import { CURRENT_VERSION, emptySave, type SaveData } from "./schema";
import { migrate, SaveError } from "./migrate";

export type KV = Pick<Storage, "getItem" | "setItem">;

/** 배포 후 바꾸지 않는다. */
export const KEYS = { save: "hw.save", prevBackup: "hw.backup.prev", corrupt: "hw.corrupt" } as const;

const NO_STORAGE = "이 브라우저에서는 진행 상황이 저장되지 않아요. (시크릿 모드이거나 저장 공간이 가득 찼어요)";

export interface Store {
  data: SaveData;
  warning: string | null;
  save(): void;
  snapshot(): void;
  exportBackup(now?: Date): string;
  /** 실패하면 SaveError를 던지고 data는 그대로 둔다. */
  importBackup(text: string): void;
}

export function openStore(kv: KV | null): Store {
  let warning: string | null = null;
  // 원본을 안전하게 보관하지 못했거나 더 새 버전의 데이터면, 이 세션에서는 hw.save를 덮어쓰지 않는다
  let protectSave = false;
  const write = (k: string, v: string): boolean => {
    if (!kv) return void (warning = NO_STORAGE), false;
    try {
      kv.setItem(k, v);
      return true;
    } catch {
      warning = NO_STORAGE;
      return false;
    }
  };

  let data = emptySave();
  let raw: string | null = null;
  if (!kv) warning = NO_STORAGE;
  else {
    try {
      raw = kv.getItem(KEYS.save);
    } catch {
      warning = NO_STORAGE;
    }
  }
  if (raw !== null) {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
      if (typeof parsed?.version === "number" && parsed.version < CURRENT_VERSION) write(KEYS.prevBackup, raw);
      data = migrate(parsed);
    } catch (e) {
      const kept = write(KEYS.corrupt, raw); // 데이터 손실 방지: 원문을 보관해 둔다
      const newer = typeof parsed?.version === "number" && parsed.version > CURRENT_VERSION;
      protectSave = !kept || newer;
      warning ??= e instanceof SaveError ? e.message : "저장 데이터가 손상돼서 새로 시작해요. (원본은 따로 보관했어요)";
      if (protectSave) warning += " 원래 데이터를 지키기 위해 지금은 저장하지 않아요.";
    }
  }

  const store: Store = {
    data,
    get warning() {
      return warning;
    },
    set warning(w) {
      warning = w;
    },
    save: () => void (protectSave || write(KEYS.save, JSON.stringify(store.data))),
    snapshot: () => write(KEYS.prevBackup, JSON.stringify(store.data)),
    exportBackup: (now = new Date()) =>
      JSON.stringify({ app: "my-own-pcb", exportedAt: now.toISOString(), data: store.data }, null, 2),
    importBackup(text) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new SaveError("백업 파일을 읽을 수 없어요. (JSON 형식이 아니에요)");
      }
      if (typeof parsed !== "object" || parsed === null || (parsed as any).app !== "my-own-pcb") {
        throw new SaveError("이 앱의 백업 파일이 아니에요.");
      }
      const next = migrate((parsed as any).data);
      store.snapshot();
      store.data = next;
      protectSave = false; // 사용자가 직접 고른 백업이므로 덮어써도 된다
      store.save();
    },
  };
  return store;
}
