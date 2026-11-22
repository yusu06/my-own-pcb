import { DEFAULT_CHIPS, type ChipName } from "../sim/digital/chips";
import { ckt } from "../sim/electric/ckt";
import type { Circuit } from "../sim/electric/types";

/**
 * 단원 작성용 논리 회로 헬퍼. ckt와 같은 형식에 칩을 더한다: "and1:chip:and" = 기본 AND 부품.
 * (기본 부품 참조라 v는 null. 학습자 부품함과 상관없이 채점된다.)
 */
export function lckt(parts: string[], wires: string[]): Circuit {
  const chips = new Map<string, ChipName>();
  const plain = parts.map((s) => {
    const [id, kind, name] = s.split(":");
    if (kind !== "chip") return s;
    chips.set(id, name as ChipName);
    return `${id}:chip`;
  });
  const c = ckt(plain, wires);
  for (const p of c.parts) {
    const name = chips.get(p.id);
    if (name) p.chip = { name, v: null, inputs: [...DEFAULT_CHIPS[name].inputs], outputs: [...DEFAULT_CHIPS[name].outputs] };
  }
  return c;
}
