import { GLOSSARY } from "../lessons/glossary";
import type { Ctx } from "./app";
import { h } from "./dom";

export function renderGlossary(root: HTMLElement, _ctx: Ctx): void {
  const entries = Object.values(GLOSSARY).sort((a, b) => a.term.localeCompare(b.term, "ko"));
  const list = h("dl", { class: "glossary" });
  const search = h("input", { type: "search", placeholder: "용어 찾기", "aria-label": "용어 찾기", class: "search" });
  const fill = () => {
    const q = search.value.trim().toLowerCase();
    const hits = entries.filter((e) => !q || e.term.toLowerCase().includes(q) || e.short.toLowerCase().includes(q));
    list.replaceChildren(...hits.flatMap((e) => [h("dt", {}, e.term), h("dd", {}, e.short)]));
    if (hits.length === 0) list.append(h("p", { class: "muted" }, "찾는 용어가 없어요."));
  };
  search.addEventListener("input", fill);
  fill();
  root.append(
    h("header", { class: "lesson-top" }, h("a", { href: "#/", class: "back", "aria-label": "홈으로" }, "←"), h("strong", {}, "📖 용어집")),
    search,
    list,
  );
}
