import type { ElectricTask } from "../lessons/types";
import { PINS } from "../sim/electric/parts";
import type { Circuit, Part, PinRef } from "../sim/electric/types";

const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const ROTS = [0, 90, 180, 270];

/**
 * 저장된 회로(신뢰할 수 없는 데이터)를 과제에 맞게 정리한다.
 * 형식이 틀리면 null. 업데이트로 사라졌거나 종류가 바뀐 부품, 그 부품을 가리키는 선은 버린다.
 */
export function sanitizeCircuit(raw: unknown, task: ElectricTask): Circuit | null {
  if (!isObj(raw) || !Array.isArray(raw.parts) || !Array.isArray(raw.wires)) return null;
  const allowed = new Map<string, Part["kind"]>([
    ...task.preset.parts.map((p) => [p.id, p.kind] as const),
    ...task.palette.map((p) => [p.id, p.kind] as const),
  ]);
  const parts: Part[] = [];
  for (const p of raw.parts) {
    if (!isObj(p) || typeof p.id !== "string" || allowed.get(p.id) !== p.kind) continue;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !ROTS.includes(p.rot)) continue;
    if (parts.some((q) => q.id === p.id)) continue;
    const part: Part = { id: p.id, kind: p.kind, x: p.x, y: p.y, rot: p.rot };
    if (Number.isFinite(p.value)) part.value = p.value;
    parts.push(part);
  }
  for (const pre of task.preset.parts) if (!parts.some((q) => q.id === pre.id)) parts.unshift({ ...pre });

  const validPin = (r: unknown): r is PinRef => {
    if (!isObj(r)) return false;
    const part = parts.find((q) => q.id === r.part);
    return !!part && PINS[part.kind].includes(r.pin);
  };
  const wires = raw.wires
    .filter((w: unknown) => isObj(w) && validPin(w.a) && validPin(w.b))
    .map((w: any) => ({ a: { part: w.a.part, pin: w.a.pin }, b: { part: w.b.part, pin: w.b.pin } }));
  return { parts, wires };
}
