import { GLOSSARY } from "./lessons/glossary";

export type Segment = { text: string } | { term: string };

export function parseRich(s: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of s.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    out.push({ term: m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** 단원 본문은 textContent로만 넣는다(innerHTML 금지). */
export function renderRich(s: string, onTerm: (id: string) => void): DocumentFragment {
  const f = document.createDocumentFragment();
  for (const seg of parseRich(s)) {
    if ("text" in seg) f.append(seg.text);
    else {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "term";
      b.textContent = GLOSSARY[seg.term]?.term ?? seg.term;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        onTerm(seg.term);
      });
      f.append(b);
    }
  }
  return f;
}
