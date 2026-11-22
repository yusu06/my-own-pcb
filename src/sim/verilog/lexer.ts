import { UNSUPPORTED, VerilogError } from "./errors";

export type Tok =
  | { k: "id"; v: string; line: number }
  | { k: "kw"; v: string; line: number }
  | { k: "num"; v: string; line: number; value: number; width?: number }
  | { k: "op"; v: string; line: number }
  | { k: "eof"; v: "끝"; line: number };

export const KEYWORDS = new Set([
  "module", "endmodule", "input", "output", "wire", "reg", "localparam", "parameter", "assign", "always",
  "begin", "end", "if", "else", "case", "endcase", "default", "posedge", "negedge", "or",
]);

/** 쓰면 바로 "지원하지 않아요"라고 알려 줄 키워드 */
const UNSUPPORTED_KW: Record<string, string> = {
  initial: "initial 블록은 " + UNSUPPORTED + " 테스트는 앱이 대신 해 줘요.",
  inout: "inout 포트는 " + UNSUPPORTED,
  integer: "integer는 " + UNSUPPORTED + " reg [31:0]을 써 주세요.",
  signed: "signed는 " + UNSUPPORTED,
  generate: "generate는 " + UNSUPPORTED,
  genvar: "genvar는 " + UNSUPPORTED,
  for: "for 반복문은 " + UNSUPPORTED,
  function: "function은 " + UNSUPPORTED,
  task: "task는 " + UNSUPPORTED,
  casez: "casez는 " + UNSUPPORTED + " case를 써 주세요.",
  casex: "casex는 " + UNSUPPORTED + " case를 써 주세요.",
  forever: "forever는 " + UNSUPPORTED,
};

const OPS3 = ["===", "!==", "<<<", ">>>"];
const OPS2 = ["<<", ">>", "<=", ">=", "==", "!=", "&&", "||", "~&", "~|", "~^", "^~"];
const OPS1 = "()[]{};,:.?@*=+-~!&|^<>";
const BASES: Record<string, { re: RegExp; radix: number; name: string }> = {
  b: { re: /^[01]+$/, radix: 2, name: "2진수(0, 1)" },
  d: { re: /^[0-9]+$/, radix: 10, name: "10진수(0~9)" },
  h: { re: /^[0-9a-f]+$/i, radix: 16, name: "16진수(0~9, a~f)" },
  o: { re: /^[0-7]+$/, radix: 8, name: "8진수(0~7)" },
};

export function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (src.startsWith("//", i)) {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) throw new VerilogError(line, "주석 /* 를 닫는 */ 가 없어요.");
      for (let j = i; j < end; j++) if (src[j] === "\n") line++;
      i = end + 2;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const w = src.slice(i, j);
      if (UNSUPPORTED_KW[w]) throw new VerilogError(line, UNSUPPORTED_KW[w]);
      out.push({ k: KEYWORDS.has(w) ? "kw" : "id", v: w, line } as Tok);
      i = j;
      continue;
    }
    if (/[0-9']/.test(c)) {
      // [크기]'[진법]값  또는 10진수
      let j = i;
      while (j < n && /[0-9_]/.test(src[j])) j++;
      const sizeTxt = src.slice(i, j).replace(/_/g, "");
      let k = j;
      while (k < n && (src[k] === " " || src[k] === "\t")) k++;
      if (src[k] === "'") {
        const base = (src[k + 1] ?? "").toLowerCase();
        const b = BASES[base];
        if (!b) {
          if (base === "s") throw new VerilogError(line, "signed 숫자('s)는 " + UNSUPPORTED);
          throw new VerilogError(line, "숫자의 진법은 'b, 'd, 'h 중 하나로 써 주세요. 예: 4'b1010");
        }
        let m = k + 2;
        while (m < n && (src[m] === " " || src[m] === "\t")) m++;
        let e = m;
        while (e < n && /[0-9A-Za-z_]/.test(src[e])) e++;
        const digits = src.slice(m, e).replace(/_/g, "");
        const raw = src.slice(i, e);
        if (/[xz?]/i.test(digits)) throw new VerilogError(line, `${raw}: x나 z 값은 ${UNSUPPORTED}`);
        if (!digits || !b.re.test(digits)) throw new VerilogError(line, `${raw}: ${b.name}에 쓸 수 없는 글자가 있어요.`);
        const value = parseInt(digits, b.radix);
        const width = sizeTxt ? Number(sizeTxt) : undefined;
        if (width !== undefined && (width < 1 || width > 32)) throw new VerilogError(line, `${raw}: 숫자 크기는 1~32비트만 쓸 수 있어요.`);
        if (value > 0xffffffff) throw new VerilogError(line, `${raw}: 이 앱은 32비트까지만 지원해요.`);
        if (width !== undefined && value >= 2 ** width) throw new VerilogError(line, `${raw}: ${width}비트에는 ${value}이(가) 들어가지 않아요(최대 ${2 ** width - 1}).`);
        out.push({ k: "num", v: raw, line, value, width });
        i = e;
        continue;
      }
      if (!sizeTxt) throw new VerilogError(line, "따옴표(')는 숫자 진법 표시에만 써요. 예: 4'b1010");
      if (/[A-Za-z]/.test(src[j] ?? "")) throw new VerilogError(line, `‘${src.slice(i, j + 1)}’: 이름은 숫자로 시작할 수 없어요.`);
      const value = Number(sizeTxt);
      if (value > 0xffffffff) throw new VerilogError(line, `${sizeTxt}: 이 앱은 32비트까지만 지원해요.`);
      out.push({ k: "num", v: sizeTxt, line, value });
      i = j;
      continue;
    }
    if (c === "#") throw new VerilogError(line, "지연(#)은 " + UNSUPPORTED + " 회로는 지연 없이 바로 계산돼요.");
    if (c === "$") throw new VerilogError(line, "$로 시작하는 시스템 함수는 " + UNSUPPORTED);
    if (c === "`") throw new VerilogError(line, "`define 같은 전처리기는 " + UNSUPPORTED);
    const op3 = OPS3.find((o) => src.startsWith(o, i));
    if (op3) throw new VerilogError(line, `${op3} 연산자는 ${UNSUPPORTED}`);
    const op2 = OPS2.find((o) => src.startsWith(o, i));
    if (op2) {
      out.push({ k: "op", v: op2, line });
      i += 2;
      continue;
    }
    if (OPS1.includes(c)) {
      out.push({ k: "op", v: c, line });
      i++;
      continue;
    }
    throw new VerilogError(line, `‘${c}’ 기호는 쓸 수 없어요.`);
  }
  out.push({ k: "eof", v: "끝", line });
  return out;
}
