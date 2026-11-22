import { CHIP_LABEL, DEFAULT_CHIPS, makeLib, validChipDef, type ChipName } from "../sim/digital/chips";
import { nandCost } from "../sim/digital/sim";
import type { Ctx } from "./app";
import { h } from "./dom";

/** 부품함: 내가 만든 부품과 기본 부품 현황(읽기 전용) */
export function renderPartsBox(root: HTMLElement, ctx: Ctx): void {
  const box = ctx.store.data.chips;
  const lib = makeLib(box);
  const rows = (Object.keys(DEFAULT_CHIPS) as ChipName[]).map((name) => {
    const versions = (box[name] ?? []).filter(validChipDef);
    const mine = versions.length > 0;
    const def = mine ? versions[versions.length - 1] : DEFAULT_CHIPS[name];
    const cost = nandCost(def.circuit, lib);
    return h(
      "li",
      { class: "part-row" + (mine ? "" : " fallback") },
      h("strong", {}, CHIP_LABEL[name]),
      h(
        "span",
        { class: "muted" },
        mine ? `내가 만든 버전 ${versions.length}개 · 최신 NAND ${cost}개` : `아직 안 만듦 — 기본 부품 사용 중 (NAND ${cost}개)`,
      ),
    );
  });
  root.append(
    h("header", { class: "lesson-top" }, h("a", { href: "#/", class: "back", "aria-label": "홈으로" }, "←"), h("strong", {}, "🧩 부품함")),
    h("p", { class: "muted" }, "1장에서 만든 회로가 여기에 부품으로 저장돼요. 부품을 고치면 새 버전으로 저장되고, 이미 그 부품을 쓴 회로는 예전 버전을 그대로 써요."),
    h("ul", { class: "parts-box" }, ...rows),
  );
}
