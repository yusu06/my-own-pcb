import type { Expr, Item, ModuleDecl, Port, SourceFile, Stmt } from "./ast";
import { VerilogError } from "./errors";
import { lex, type Tok } from "./lexer";

/** 이항 연산자 우선순위(낮음 → 높음) */
const LEVELS = [["||"], ["&&"], ["|"], ["^", "~^", "^~"], ["&"], ["==", "!="], ["<", "<=", ">", ">="], ["<<", ">>"], ["+", "-"], ["*"]];
const UNARY = ["~", "!", "-", "+", "&", "|", "^", "~&", "~|", "~^"];
const NON_ANSI = "포트는 module 괄호 안에 input/output과 함께 써 주세요. 예: module m(input a, output y);";

export function parse(src: string): SourceFile {
  return new Parser(lex(src)).file();
}

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}

  private get tok(): Tok {
    return this.toks[this.i];
  }
  private get prevLine(): number {
    return this.toks[Math.max(0, this.i - 1)].line;
  }
  private next(): Tok {
    const t = this.toks[this.i];
    if (t.k !== "eof") this.i++;
    return t;
  }
  private is(v: string): boolean {
    return (this.tok.k === "op" || this.tok.k === "kw") && this.tok.v === v;
  }
  private accept(v: string): boolean {
    if (!this.is(v)) return false;
    this.next();
    return true;
  }
  private fail(msg: string, line = this.tok.line): never {
    throw new VerilogError(line, msg);
  }
  private expect(v: string): Tok {
    if (this.is(v)) return this.next();
    if (v === ";") this.fail("세미콜론(;)이 빠졌어요.", this.prevLine);
    if (v === ")") this.fail("괄호 ‘(’를 닫는 ‘)’가 빠졌어요.");
    if (v === "]") this.fail("대괄호 ‘[’를 닫는 ‘]’가 빠졌어요.");
    if (v === "}") this.fail("중괄호 ‘{’를 닫는 ‘}’가 빠졌어요.");
    this.fail(`여기에는 ‘${v}’이(가) 와야 해요 (지금: ‘${this.tok.v}’).`);
  }
  private ident(what: string): string {
    if (this.tok.k !== "id") {
      if (this.tok.k === "kw") this.fail(`‘${this.tok.v}’는 Verilog 예약어라 ${what}으로 쓸 수 없어요.`);
      this.fail(`여기에는 ${what}이 와야 해요 (지금: ‘${this.tok.v}’).`);
    }
    return this.next().v;
  }
  private atEof(): boolean {
    return this.tok.k === "eof";
  }
  private atEnd(): boolean {
    return this.tok.k === "eof" || this.is("endmodule");
  }

  file(): SourceFile {
    if (this.tok.k === "eof") this.fail("module이 없어요. module 이름(input a, output y); ... endmodule 형태로 써 주세요.");
    const modules: ModuleDecl[] = [];
    while (!this.atEof()) {
      if (!this.is("module")) this.fail(`모듈 밖에는 module ... endmodule만 쓸 수 있어요 (지금: ‘${this.tok.v}’).`);
      modules.push(this.module());
    }
    return { modules };
  }

  private module(): ModuleDecl {
    const line = this.next().line;
    const name = this.ident("모듈 이름");
    const ports: Port[] = [];
    if (this.accept("(")) {
      let last: Omit<Port, "name" | "line"> | null = null;
      while (!this.is(")")) {
        if (this.tok.k === "eof") this.expect(")");
        if (this.is("input") || this.is("output")) {
          const dir = this.next().v as "input" | "output";
          let isReg = false;
          if (this.accept("reg")) isReg = true;
          else this.accept("wire");
          if (isReg && dir === "input") this.fail("input은 reg가 될 수 없어요.", this.prevLine);
          const [msb, lsb] = this.optRange();
          last = { dir, isReg, msb, lsb };
        } else if (!last) this.fail(NON_ANSI);
        const pl = this.tok.line;
        ports.push({ ...last, name: this.ident("포트 이름"), line: pl });
        if (!this.accept(",")) break;
      }
      this.expect(")");
    }
    this.expect(";");
    const items: Item[] = [];
    while (!this.is("endmodule")) {
      if (this.tok.k === "eof") this.fail(`모듈 ‘${name}’ 끝에 endmodule이 없어요.`);
      items.push(...this.item());
    }
    this.next();
    return { name, ports, items, line };
  }

  /** [msb:lsb] 없으면 1비트 */
  private optRange(): [number, number] {
    if (!this.is("[")) return [0, 0];
    const line = this.next().line;
    const msb = this.constNum("비트 범위");
    this.expect(":");
    const lsb = this.constNum("비트 범위");
    this.expect("]");
    if (msb < lsb) this.fail(`[${msb}:${lsb}]: 큰 번호를 앞에 써 주세요. 예: [3:0]`, line);
    if (msb - lsb + 1 > 32) this.fail(`[${msb}:${lsb}]: 이 앱은 32비트까지만 지원해요.`, line);
    return [msb, lsb];
  }
  private constNum(what: string): number {
    if (this.tok.k !== "num") this.fail(`${what}에는 숫자를 써 주세요.`);
    return (this.next() as Extract<Tok, { k: "num" }>).value;
  }

  private item(): Item[] {
    const t = this.tok;
    const line = t.line;
    if (this.is("input") || this.is("output")) this.fail(NON_ANSI);
    if (this.is("wire") || this.is("reg")) {
      const kind = this.next().v as "wire" | "reg";
      const [msb, lsb] = this.optRange();
      const names = [this.ident("신호 이름")];
      let init: Expr | undefined;
      if (this.is("=")) {
        if (kind === "reg") this.fail("reg에 처음 값을 주는 문법은 지원하지 않아요. always 안에서 값을 넣어 주세요.");
        this.next();
        init = this.expr();
      } else while (this.accept(",")) names.push(this.ident("신호 이름"));
      this.expect(";");
      return [{ t: "decl", kind, msb, lsb, names, init, line }];
    }
    if (this.is("localparam") || this.is("parameter")) {
      this.next();
      this.optRange();
      const out: Item[] = [];
      do {
        const pl = this.tok.line;
        const name = this.ident("상수 이름");
        this.expect("=");
        out.push({ t: "param", name, value: this.expr(), line: pl });
      } while (this.accept(","));
      this.expect(";");
      return out;
    }
    if (this.is("assign")) {
      this.next();
      const out: Item[] = [];
      do {
        const al = this.tok.line;
        const lhs = this.lvalue();
        this.expect("=");
        out.push({ t: "assign", lhs, rhs: this.expr(), line: al });
      } while (this.accept(","));
      this.expect(";");
      return out;
    }
    if (this.is("always")) {
      this.next();
      if (!this.accept("@")) this.fail("always 뒤에는 @(*) 또는 @(posedge clk)를 써 주세요.");
      let edges: string[] | null = null;
      if (!this.accept("*")) {
        this.expect("(");
        if (this.is("posedge") || this.is("negedge")) {
          edges = [];
          do {
            if (this.is("negedge")) this.fail("negedge는 지원하지 않아요. 이 앱에서는 posedge만 써요.");
            if (!this.accept("posedge")) this.fail("posedge 블록에는 posedge 신호만 쓸 수 있어요. 예: @(posedge clk or posedge rst)");
            if (this.tok.k !== "id") this.fail("posedge 뒤에는 신호 이름을 써 주세요. 예: posedge clk");
            edges.push(this.next().v);
          } while (this.accept("or") || this.accept(","));
        } else if (!this.accept("*")) {
          // @(a or b) 같은 목록도 조합 회로로 본다
          while (!this.is(")")) {
            if (this.is("posedge") || this.is("negedge")) this.fail("posedge 블록에는 posedge 신호만 쓸 수 있어요. 예: @(posedge clk or posedge rst)");
            if (this.tok.k === "eof") this.expect(")");
            this.next();
          }
        }
        this.expect(")");
      }
      return [{ t: "always", edges, body: this.stmt(), line }];
    }
    if (t.k === "id") {
      const module = this.next().v;
      if (this.is("=") || this.is("<=") || this.is("[")) this.fail("모듈 안에서 값을 넣으려면 앞에 assign을 쓰거나 always 안에 써 주세요.", line);
      const name = this.ident("인스턴스 이름");
      this.expect("(");
      const conns: { port: string; expr: Expr | null; line: number }[] = [];
      while (!this.is(")")) {
        if (!this.is(".")) this.fail("포트 연결은 .포트이름(신호) 형식으로 써 주세요. 예: .a(x)");
        this.next();
        const cl = this.tok.line;
        const port = this.ident("포트 이름");
        this.expect("(");
        const expr = this.is(")") ? null : this.expr();
        this.expect(")");
        conns.push({ port, expr, line: cl });
        if (!this.accept(",")) break;
      }
      this.expect(")");
      this.expect(";");
      return [{ t: "instance", module, name, conns, line }];
    }
    this.fail(`‘${t.v}’는 여기에 올 수 없어요. 모듈 안에는 wire, reg, assign, always, 모듈 인스턴스를 써요.`);
  }

  private stmt(): Stmt {
    const line = this.tok.line;
    if (this.accept(";")) return { t: "empty", line };
    if (this.is("begin")) {
      this.next();
      if (this.is(":")) this.fail("begin에 이름을 붙이는 문법은 지원하지 않아요.");
      const body: Stmt[] = [];
      while (!this.is("end")) {
        if (this.atEnd()) this.fail("begin에 짝이 되는 end가 없어요.", line);
        body.push(this.stmt());
      }
      this.next();
      return { t: "block", body, line };
    }
    if (this.is("if")) {
      this.next();
      this.expect("(");
      const c = this.expr();
      this.expect(")");
      const then = this.stmt();
      const els = this.accept("else") ? this.stmt() : undefined;
      return { t: "if", c, then, else: els, line };
    }
    if (this.is("case")) {
      this.next();
      this.expect("(");
      const e = this.expr();
      this.expect(")");
      const items: { labels: Expr[] | null; body: Stmt }[] = [];
      while (!this.is("endcase")) {
        if (this.atEnd() || this.is("end")) this.fail("case에 짝이 되는 endcase가 없어요.", line);
        if (this.accept("default")) {
          this.accept(":");
          items.push({ labels: null, body: this.stmt() });
          continue;
        }
        const labels = [this.expr()];
        while (this.accept(",")) labels.push(this.expr());
        this.expect(":");
        items.push({ labels, body: this.stmt() });
      }
      this.next();
      return { t: "case", e, items, line };
    }
    if (this.is("assign")) this.fail("always 안에서는 assign 없이 y = ...; 처럼 써요.");
    if (this.is("else")) this.fail("else 앞에 짝이 되는 if가 없어요. (if 뒤에 문장이 여러 개면 begin ... end로 묶어요)");
    if (this.atEnd() || this.is("end") || this.is("endcase")) this.fail(`‘${this.tok.v}’ 앞에 문장이 빠졌어요.`);
    const lhs = this.lvalue();
    const nb = this.accept("<=");
    if (!nb && !this.accept("=")) this.expect("=");
    const rhs = this.expr();
    this.expect(";");
    return { t: "assign", lhs, rhs, nb, line };
  }

  /** 대입 왼쪽: 이름, 비트·범위 선택, 연결 { } */
  private lvalue(): Expr {
    if (this.tok.k !== "id" && !this.is("{")) this.fail(`값을 넣을 신호 이름이 와야 해요 (지금: ‘${this.tok.v}’).`);
    return this.primary();
  }

  expr(): Expr {
    const c = this.binary(0);
    if (!this.is("?")) return c;
    const line = this.next().line;
    const a = this.expr();
    this.expect(":");
    const b = this.expr();
    return { t: "ternary", c, a, b, line };
  }

  private binary(level: number): Expr {
    if (level === LEVELS.length) return this.unary();
    let l = this.binary(level + 1);
    while (this.tok.k === "op" && LEVELS[level].includes(this.tok.v)) {
      const t = this.next();
      l = { t: "binary", op: t.v, l, r: this.binary(level + 1), line: t.line };
    }
    return l;
  }

  private unary(): Expr {
    if (this.tok.k === "op" && UNARY.includes(this.tok.v)) {
      const t = this.next();
      return { t: "unary", op: t.v, e: this.unary(), line: t.line };
    }
    return this.primary();
  }

  private primary(): Expr {
    const t = this.tok;
    const line = t.line;
    if (t.k === "num") {
      this.next();
      return { t: "num", value: t.value, width: t.width, line };
    }
    if (t.k === "id") {
      this.next();
      if (!this.is("[")) return { t: "id", name: t.v, line };
      this.next();
      if (this.tok.k === "num" && this.toks[this.i + 1]?.v === ":") {
        const msb = this.constNum("범위 선택");
        this.next();
        const lsb = this.constNum("범위 선택 [m:l]");
        this.expect("]");
        if (msb < lsb) this.fail(`${t.v}[${msb}:${lsb}]: 큰 번호를 앞에 써 주세요.`, line);
        return { t: "range", name: t.v, msb, lsb, line };
      }
      const index = this.expr();
      if (this.is(":")) this.fail("범위 선택 [m:l]에는 숫자만 쓸 수 있어요.");
      this.expect("]");
      return { t: "index", name: t.v, index, line };
    }
    if (this.accept("(")) {
      const e = this.expr();
      this.expect(")");
      return e;
    }
    if (this.accept("{")) {
      const parts = [this.expr()];
      if (this.is("{")) this.fail("반복 연결 {n{...}}은 아직 지원하지 않아요. 같은 신호를 여러 번 써 주세요.");
      while (this.accept(",")) parts.push(this.expr());
      this.expect("}");
      return { t: "concat", parts, line };
    }
    if (t.k === "eof" || this.is(";")) this.fail("식이 끝나지 않았어요. 값이나 신호 이름이 빠졌어요.", this.prevLine);
    this.fail(`‘${t.v}’ 자리에 값이나 신호 이름이 와야 해요.`);
  }
}
