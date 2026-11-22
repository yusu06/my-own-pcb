import type { CircuitTask } from "../lessons/types";
import { makeLib } from "../sim/digital/chips";
import type { ChipLib } from "../sim/digital/sim";
import { pinNames } from "../sim/electric/parts";
import type { ChipRef, Circuit, Part, PinRef } from "../sim/electric/types";

const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const ROTS = [0, 90, 180, 270];

/**
 * 저장된 회로(신뢰할 수 없는 데이터)를 과제에 맞게 정리한다.
 * 형식이 틀리면 null. 업데이트로 사라졌거나 종류가 바뀐 부품, 그 부품을 가리키는 선은 버린다.
 */
export function sanitizeCircuit(raw: unknown, task: CircuitTask, lib: ChipLib = makeLib({})): Circuit | null {
  if (!isObj(raw) || !Array.isArray(raw.parts) || !Array.isArray(raw.wires)) return null;
  const strs = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((s, i) => s === b[i]);
  /** 팔레트 항목: id가 같거나, multi면 `${id}숫자` */
  const itemOf = (id: string) => task.palette.find((i) => i.id === id || (i.multi && new RegExp(`^${i.id}\\d+$`).test(id)));
  const kindOf = (id: string) => task.preset.parts.find((q) => q.id === id)?.kind ?? itemOf(id)?.kind;
  /** 칩은 스냅샷 형식이 맞고, 팔레트의 그 부품이고, 찾을 수 있으며 입출력이 정의와 같아야 남긴다 */
  const okChip = (id: string, c: unknown): c is ChipRef => {
    if (!isObj(c) || typeof c.name !== "string" || !strs(c.inputs) || !strs(c.outputs)) return false;
    if (!(c.v === null || (Number.isInteger(c.v) && c.v >= 0)) || itemOf(id)?.chip !== c.name) return false;
    const found = lib(c as ChipRef);
    return !!found && same(found.def.inputs, c.inputs) && same(found.def.outputs, c.outputs);
  };
  const parts: Part[] = [];
  for (const p of raw.parts) {
    if (!isObj(p) || typeof p.id !== "string" || kindOf(p.id) !== p.kind) continue;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !ROTS.includes(p.rot)) continue;
    if (parts.some((q) => q.id === p.id)) continue;
    if (p.kind === "chip" && !okChip(p.id, p.chip)) continue;
    const part: Part = { id: p.id, kind: p.kind, x: p.x, y: p.y, rot: p.rot };
    if (p.kind === "chip") part.chip = { name: p.chip.name, v: p.chip.v, inputs: [...p.chip.inputs], outputs: [...p.chip.outputs] };
    // 값은 신뢰하지 않는다: 프리셋은 프리셋 값, 팔레트는 목록 안의 값(아니면 첫 값), 그 외엔 버린다
    const pre = task.preset.parts.find((q) => q.id === p.id);
    const values = itemOf(p.id)?.values;
    if (pre) {
      if (pre.value !== undefined) part.value = pre.value;
    } else if (values?.length) part.value = values.includes(p.value) ? p.value : values[0];
    parts.push(part);
  }
  for (const pre of task.preset.parts) if (!parts.some((q) => q.id === pre.id)) parts.unshift({ ...pre });

  const validPin = (r: unknown): r is PinRef => {
    if (!isObj(r)) return false;
    const part = parts.find((q) => q.id === r.part);
    return !!part && pinNames(part).includes(r.pin);
  };
  const wires = raw.wires
    .filter((w: unknown) => isObj(w) && validPin(w.a) && validPin(w.b))
    .map((w: any) => ({ a: { part: w.a.part, pin: w.a.pin }, b: { part: w.b.part, pin: w.b.pin } }));
  return { parts, wires };
}
