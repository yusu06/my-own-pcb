import { ckt } from "../electric/ckt";
import type { ChipDef, ChipLib } from "./sim";

export type ChipName = "not" | "and" | "or" | "xor" | "mux";

/** 부품함에 없을 때 대신 쓰는 기본 부품. NAND만으로 만들었다. 이름은 배포 후 바꾸지 않는다. */
export const DEFAULT_CHIPS: Record<ChipName, ChipDef> = {
  not: { inputs: ["a"], outputs: ["y"], circuit: ckt(["a:in", "n:nand", "y:out"], ["a.y~n.a", "a.y~n.b", "n.y~y.a"]) },
  and: {
    inputs: ["a", "b"],
    outputs: ["y"],
    circuit: ckt(["a:in", "b:in", "n1:nand", "n2:nand", "y:out"], ["a.y~n1.a", "b.y~n1.b", "n1.y~n2.a", "n1.y~n2.b", "n2.y~y.a"]),
  },
  or: {
    inputs: ["a", "b"],
    outputs: ["y"],
    circuit: ckt(
      ["a:in", "b:in", "na:nand", "nb:nand", "n:nand", "y:out"],
      ["a.y~na.a", "a.y~na.b", "b.y~nb.a", "b.y~nb.b", "na.y~n.a", "nb.y~n.b", "n.y~y.a"],
    ),
  },
  xor: {
    inputs: ["a", "b"],
    outputs: ["y"],
    circuit: ckt(
      ["a:in", "b:in", "n1:nand", "n2:nand", "n3:nand", "n4:nand", "y:out"],
      ["a.y~n1.a", "b.y~n1.b", "a.y~n2.a", "n1.y~n2.b", "n1.y~n3.a", "b.y~n3.b", "n2.y~n4.a", "n3.y~n4.b", "n4.y~y.a"],
    ),
  },
  // s가 0이면 a, 1이면 b
  mux: {
    inputs: ["a", "b", "s"],
    outputs: ["y"],
    circuit: ckt(
      ["a:in", "b:in", "s:in", "ns:nand", "n1:nand", "n2:nand", "n3:nand", "y:out"],
      ["s.y~ns.a", "s.y~ns.b", "a.y~n1.a", "ns.y~n1.b", "b.y~n2.a", "s.y~n2.b", "n1.y~n3.a", "n2.y~n3.b", "n3.y~y.a"],
    ),
  },
};

export const CHIP_LABEL: Record<string, string> = { not: "NOT", and: "AND", or: "OR", xor: "XOR", mux: "MUX" };

const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const strList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string");
const LOGIC_KINDS = ["nand", "in", "out", "chip"];

/** 저장소에서 읽은(신뢰할 수 없는) 칩 정의 검사 */
export function validChipDef(x: unknown): x is ChipDef {
  if (!isObj(x) || !strList(x.inputs) || !strList(x.outputs) || !isObj(x.circuit)) return false;
  const { parts, wires } = x.circuit;
  if (!Array.isArray(parts) || !Array.isArray(wires)) return false;
  const okPart = (p: unknown) =>
    isObj(p) && typeof p.id === "string" && LOGIC_KINDS.includes(p.kind) && Number.isFinite(p.x) && Number.isFinite(p.y) &&
    (p.kind !== "chip" || (isObj(p.chip) && typeof p.chip.name === "string" && Array.isArray(p.chip.inputs) && Array.isArray(p.chip.outputs)));
  const okRef = (r: unknown) => isObj(r) && typeof r.part === "string" && typeof r.pin === "string";
  if (!parts.every(okPart) || !wires.every((w: unknown) => isObj(w) && okRef(w.a) && okRef(w.b))) return false;
  const has = (kind: string, id: string) => parts.some((p: any) => p.kind === kind && p.id === id);
  return x.inputs.every((n: string) => has("in", n)) && x.outputs.every((n: string) => has("out", n));
}

/** 부품함(이름 → 버전 목록)으로 칩 찾기. 없거나 손상되면 기본 부품, 그것도 없으면 null. */
export function makeLib(box: Record<string, unknown>): ChipLib {
  return (ref) => {
    const versions = box[ref.name];
    const mine = ref.v !== null && Array.isArray(versions) ? versions[ref.v] : undefined;
    if (validChipDef(mine)) return { def: mine, fallback: false };
    const def = DEFAULT_CHIPS[ref.name as ChipName];
    return def ? { def, fallback: true } : null;
  };
}
