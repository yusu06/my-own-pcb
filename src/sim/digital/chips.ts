import { ckt } from "../electric/ckt";
import type { ChipDef, ChipLib } from "./sim";

export type ChipName = "not" | "and" | "or" | "xor" | "mux" | "ha" | "fa" | "sr" | "dlatch" | "dff";

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
  // 반가산기: s = a XOR b, c = a AND b (XOR 안의 NAND(a,b)를 다시 써서 5개)
  ha: {
    inputs: ["a", "b"],
    outputs: ["s", "c"],
    circuit: ckt(
      ["a:in", "b:in", "n1:nand", "n2:nand", "n3:nand", "n4:nand", "n5:nand", "s:out", "c:out"],
      ["a.y~n1.a", "b.y~n1.b", "a.y~n2.a", "n1.y~n2.b", "n1.y~n3.a", "b.y~n3.b", "n2.y~n4.a", "n3.y~n4.b", "n4.y~s.a", "n1.y~n5.a", "n1.y~n5.b", "n5.y~c.a"],
    ),
  },
  // 전가산기: NAND 9개 (XOR 두 번 + 두 XOR의 첫 NAND를 다시 NAND하면 cout)
  fa: {
    inputs: ["a", "b", "cin"],
    outputs: ["s", "cout"],
    circuit: ckt(
      ["a:in", "b:in", "cin:in", "n1:nand", "n2:nand", "n3:nand", "x:nand", "n5:nand", "n6:nand", "n7:nand", "n8:nand", "n9:nand", "s:out", "cout:out"],
      [
        "a.y~n1.a", "b.y~n1.b", "a.y~n2.a", "n1.y~n2.b", "b.y~n3.a", "n1.y~n3.b", "n2.y~x.a", "n3.y~x.b",
        "x.y~n5.a", "cin.y~n5.b", "x.y~n6.a", "n5.y~n6.b", "cin.y~n7.a", "n5.y~n7.b", "n6.y~n8.a", "n7.y~n8.b", "n8.y~s.a",
        "n1.y~n9.a", "n5.y~n9.b", "n9.y~cout.a",
      ],
    ),
  },
  // SR 래치(0일 때 동작): s_n=0이면 q=1, r_n=0이면 q=0, 둘 다 1이면 유지
  sr: {
    inputs: ["s_n", "r_n"],
    outputs: ["q"],
    circuit: ckt(["s_n:in", "r_n:in", "n1:nand", "n2:nand", "q:out"], ["s_n.y~n1.a", "n2.y~n1.b", "r_n.y~n2.a", "n1.y~n2.b", "n1.y~q.a"]),
  },
  // D 래치: en=1이면 q=d, en=0이면 유지 (NAND 2개가 SR 래치를 0으로 눌러 준다)
  dlatch: {
    inputs: ["d", "en"],
    outputs: ["q"],
    circuit: ckt(
      ["d:in", "en:in", "s:nand", "r:nand", "n1:nand", "n2:nand", "q:out"],
      ["d.y~s.a", "en.y~s.b", "s.y~r.a", "en.y~r.b", "s.y~n1.a", "n2.y~n1.b", "r.y~n2.a", "n1.y~n2.b", "n1.y~q.a"],
    ),
  },
  // 상승 에지 D 플립플롭: clk=0일 때 열리는 앞 래치(master) + clk=1일 때 열리는 뒤 래치(slave)
  dff: {
    inputs: ["d", "clk"],
    outputs: ["q"],
    circuit: ckt(
      ["d:in", "clk:in", "nc:nand", "ms:nand", "mr:nand", "m1:nand", "m2:nand", "ss:nand", "sr:nand", "s1:nand", "s2:nand", "q:out"],
      [
        "clk.y~nc.a", "clk.y~nc.b",
        "d.y~ms.a", "nc.y~ms.b", "ms.y~mr.a", "nc.y~mr.b", "ms.y~m1.a", "m2.y~m1.b", "mr.y~m2.a", "m1.y~m2.b",
        "m1.y~ss.a", "clk.y~ss.b", "ss.y~sr.a", "clk.y~sr.b", "ss.y~s1.a", "s2.y~s1.b", "sr.y~s2.a", "s1.y~s2.b", "s1.y~q.a",
      ],
    ),
  },
};

export const CHIP_LABEL: Record<string, string> = {
  not: "NOT", and: "AND", or: "OR", xor: "XOR", mux: "MUX", ha: "반가산기", fa: "전가산기",
  sr: "SR 래치", dlatch: "D 래치", dff: "D 플립플롭",
};

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
