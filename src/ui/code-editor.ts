import { h } from "./dom";

/** 기호 버튼 줄(폰 키보드에서 찾기 힘든 기호) */
export const SYMBOLS = [";", "&", "|", "^", "~", "(", ")", "[", "]", "{", "}", "<=", "=", "'b", "begin", "end"];

export function insertAt(text: string, selStart: number, selEnd: number, ins: string): { text: string; caret: number } {
  const a = Math.min(Math.max(0, selStart), text.length);
  const b = Math.min(Math.max(a, selEnd), text.length);
  return { text: text.slice(0, a) + ins + text.slice(b), caret: a + ins.length };
}

export const symbolText = (s: string) => (/^[a-z]+$/.test(s) || s === "<=" ? ` ${s} ` : s);

export interface CodeEditor {
  el: HTMLElement;
  value(): string;
  setValue(v: string): void;
  /** 오류 줄 표시(null이면 지움) */
  markLine(line: number | null): void;
}

/** 고정폭 textarea + 줄 번호 + 기호 버튼. 일부러 단순하게(외부 편집기 의존성 없음) */
export function mountCodeEditor(opts: { value: string; onChange(v: string): void; onRun(): void }): CodeEditor {
  const ta = h("textarea", {
    class: "code-input",
    spellcheck: "false",
    autocapitalize: "off",
    autocomplete: "off",
    autocorrect: "off",
    wrap: "off",
    "aria-label": "Verilog 코드",
  }) as HTMLTextAreaElement;
  ta.value = opts.value;
  const gutter = h("div", { class: "code-gutter", "aria-hidden": "true" });
  let bad: number | null = null;

  const drawGutter = () => {
    const n = ta.value.split("\n").length;
    if (gutter.childElementCount !== n || bad !== null || gutter.querySelector(".bad"))
      gutter.replaceChildren(...Array.from({ length: n }, (_, i) => h("div", { class: i + 1 === bad ? "bad" : "" }, String(i + 1))));
    gutter.scrollTop = ta.scrollTop;
  };
  const put = (ins: string) => {
    const r = insertAt(ta.value, ta.selectionStart, ta.selectionEnd, ins);
    ta.value = r.text;
    ta.setSelectionRange(r.caret, r.caret);
    changed();
  };
  const changed = () => {
    bad = null;
    drawGutter();
    opts.onChange(ta.value);
  };

  ta.addEventListener("input", changed);
  ta.addEventListener("scroll", () => (gutter.scrollTop = ta.scrollTop));
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      put("  ");
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      opts.onRun();
    }
  });

  const bar = h(
    "div",
    { class: "sym-bar", role: "toolbar", "aria-label": "기호 넣기" },
    ...SYMBOLS.map((s) => {
      const b = h("button", { type: "button", class: "btn sym" }, s);
      // 버튼을 눌러도 키보드가 닫히지 않게(포커스를 textarea에 둔다)
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        ta.focus();
        put(symbolText(s));
      });
      return b;
    }),
  );

  drawGutter();
  return {
    el: h("div", { class: "code-editor" }, h("div", { class: "code-box" }, gutter, ta), bar),
    value: () => ta.value,
    setValue(v) {
      ta.value = v;
      changed();
    },
    markLine(line) {
      bad = line;
      drawGutter();
      if (line !== null) {
        // 그 줄이 보이게 스크롤
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
        ta.scrollTop = Math.max(0, (line - 3) * lh);
      }
    },
  };
}
