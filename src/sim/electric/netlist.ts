import { PINS } from "./parts";
import type { Circuit, PinRef } from "./types";

export const pinKey = (r: PinRef) => `${r.part}.${r.pin}`;

/** 선으로 이어진 핀들을 하나의 넷(번호)으로 묶는다. 모든 부품의 모든 핀이 들어간다. */
export function buildNets(c: Circuit): { netOf: Map<string, number>; count: number } {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  for (const p of c.parts) for (const pin of PINS[p.kind] ?? []) parent.set(`${p.id}.${pin}`, `${p.id}.${pin}`);
  for (const w of c.wires) {
    const a = pinKey(w.a);
    const b = pinKey(w.b);
    if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  }
  const ids = new Map<string, number>();
  const netOf = new Map<string, number>();
  for (const k of parent.keys()) {
    const root = find(k);
    if (!ids.has(root)) ids.set(root, ids.size);
    netOf.set(k, ids.get(root)!);
  }
  return { netOf, count: ids.size };
}
