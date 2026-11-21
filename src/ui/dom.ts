type Child = Node | string | null | undefined | false;

/** 작은 DOM 생성 도우미. 문자열은 항상 텍스트 노드로 들어간다. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string | boolean | ((e: Event) => void)>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
    else if (v === true) el.setAttribute(k, "");
    else if (typeof v === "string") el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
}
