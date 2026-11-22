import { pinNames } from "../electric/parts";
import type { ChipRef, Circuit } from "../electric/types";

export type Bit = 0 | 1 | "X";

/** 칩 회로 안에서 입력은 in 부품(id = 입력 이름), 출력은 out 부품(id = 출력 이름) */
export interface ChipDef {
  inputs: string[];
  outputs: string[];
  circuit: Circuit;
}

/** fallback = 부품함에 없어서 기본 부품을 대신 쓴 경우 */
export type ChipLib = (ref: ChipRef) => { def: ChipDef; fallback: boolean } | null;

export interface DigitalResult {
  /** 핀 키(`id.pin`, 칩 안은 `칩id/…`) → 값 */
  net: Record<string, Bit>;
  /** 맨 위 회로의 out 부품 id → 값 */
  out: Record<string, Bit>;
  oscillating: boolean;
  conflict: boolean;
  missingChip: string | null;
}

const MAX_DEPTH = 8;
/** 펼친 NAND가 이보다 많으면 더 펼치지 않는다(손상된 부품함이 폰을 멈추지 않게) */
const MAX_NANDS = 5000;
const MAX_STEPS = 1000;

interface Flat {
  keys: string[];
  links: [string, string][];
  nands: { a: string; b: string; y: string }[];
  /** 맨 위 in 부품의 출력 핀 → 부품 id */
  sources: Map<string, string>;
  missing: string | null;
}

/** 칩을 NAND까지 펼친다. 칩 안 부품 id에는 `칩id/` 접두어가 붙는다. */
function flatten(c: Circuit, lib: ChipLib): Flat {
  const f: Flat = { keys: [], links: [], nands: [], sources: new Map(), missing: null };
  // stack = 지금 펼치는 중인 칩(이름@버전). 같은 칩이 다시 나오면 순환이므로 펼치지 않는다.
  const walk = (circ: Circuit, pre: string, depth: number, stack: string[]) => {
    for (const p of circ.parts) for (const pin of pinNames(p)) f.keys.push(`${pre}${p.id}.${pin}`);
    for (const w of circ.wires) f.links.push([`${pre}${w.a.part}.${w.a.pin}`, `${pre}${w.b.part}.${w.b.pin}`]);
    for (const p of circ.parts) {
      const k = (pin: string) => `${pre}${p.id}.${pin}`;
      if (p.kind === "nand") f.nands.push({ a: k("a"), b: k("b"), y: k("y") });
      else if (p.kind === "in" && depth === 0) f.sources.set(k("y"), p.id);
      else if (p.kind === "chip" && p.chip) {
        const key = `${p.chip.name}@${p.chip.v}`;
        const ok = depth < MAX_DEPTH && !stack.includes(key) && f.nands.length <= MAX_NANDS;
        const found = ok ? lib(p.chip) : null;
        if (!found) {
          f.missing ??= p.chip.name;
          continue;
        }
        const inner = `${pre}${p.id}/`;
        walk(found.def.circuit, inner, depth + 1, [...stack, key]);
        for (const n of p.chip.inputs) if (found.def.inputs.includes(n)) f.links.push([k(n), `${inner}${n}.y`]);
        for (const n of p.chip.outputs) if (found.def.outputs.includes(n)) f.links.push([k(n), `${inner}${n}.a`]);
      }
    }
  };
  walk(c, "", 0, []);
  return f;
}

const nand = (a: Bit, b: Bit): Bit => (a === 0 || b === 0 ? 1 : a === 1 && b === 1 ? 0 : "X");

export function simulate(c: Circuit, inputs: Record<string, 0 | 1>, lib: ChipLib, prev?: Record<string, Bit>): DigitalResult {
  const f = flatten(c, lib);
  const parent = new Map<string, string>(f.keys.map((k) => [k, k]));
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  for (const [a, b] of f.links) if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));

  // 구동원(맨 위 in, NAND 출력)이 둘 이상인 넷은 충돌 → 항상 X
  const drivers = new Map<string, number>();
  const drive = (k: string) => drivers.set(find(k), (drivers.get(find(k)) ?? 0) + 1);
  for (const k of f.sources.keys()) drive(k);
  for (const n of f.nands) drive(n.y);
  const bad = new Set([...drivers].filter(([, n]) => n > 1).map(([r]) => r));

  let val = new Map<string, Bit>();
  // 이전 값이 없으면 0에서 시작(전원을 켠 직후처럼). X로 시작하면 발진하는 루프가 X에 갇혀 안 보인다.
  // 구동원 없는 넷은 아래 setFixed가 매번 X로 되돌린다.
  for (const k of f.keys) val.set(find(k), prev?.[k] ?? val.get(find(k)) ?? 0);
  const setFixed = (m: Map<string, Bit>) => {
    for (const [k, id] of f.sources) m.set(find(k), inputs[id] ?? "X");
    for (const r of bad) m.set(r, "X");
    for (const k of f.keys) if (!drivers.has(find(k))) m.set(find(k), "X");
  };
  setFixed(val);

  let oscillating = true;
  for (let step = 0; step < MAX_STEPS; step++) {
    const next = new Map(val);
    for (const n of f.nands) next.set(find(n.y), nand(val.get(find(n.a))!, val.get(find(n.b))!));
    setFixed(next);
    const changed = [...next].some(([k, v]) => val.get(k) !== v);
    val = next;
    if (!changed) {
      oscillating = false;
      break;
    }
  }

  const net = Object.fromEntries(f.keys.map((k) => [k, val.get(find(k))!]));
  const out = Object.fromEntries(c.parts.filter((p) => p.kind === "out").map((p) => [p.id, net[`${p.id}.a`]]));
  return { net, out, oscillating, conflict: bad.size > 0, missingChip: f.missing };
}

export function nandCost(c: Circuit, lib: ChipLib): number {
  return flatten(c, lib).nands.length;
}
