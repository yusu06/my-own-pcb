/** Verilog 부분집합의 구문 트리 */
export type Expr =
  | { t: "num"; value: number; width?: number; line: number }
  | { t: "id"; name: string; line: number }
  | { t: "index"; name: string; index: Expr; line: number }
  | { t: "range"; name: string; msb: number; lsb: number; line: number }
  | { t: "unary"; op: string; e: Expr; line: number }
  | { t: "binary"; op: string; l: Expr; r: Expr; line: number }
  | { t: "ternary"; c: Expr; a: Expr; b: Expr; line: number }
  | { t: "concat"; parts: Expr[]; line: number };

export type Stmt =
  | { t: "block"; body: Stmt[]; line: number }
  | { t: "if"; c: Expr; then: Stmt; else?: Stmt; line: number }
  | { t: "case"; e: Expr; items: { labels: Expr[] | null; body: Stmt }[]; line: number }
  /** nb = 논블로킹(<=) */
  | { t: "assign"; lhs: Expr; rhs: Expr; nb: boolean; line: number }
  | { t: "empty"; line: number };

export interface Port {
  dir: "input" | "output";
  isReg: boolean;
  msb: number;
  lsb: number;
  name: string;
  line: number;
}

export type Item =
  | { t: "decl"; kind: "wire" | "reg"; msb: number; lsb: number; names: string[]; init?: Expr; line: number }
  | { t: "param"; name: string; value: Expr; line: number }
  | { t: "assign"; lhs: Expr; rhs: Expr; line: number }
  /** edges = posedge 신호들(null이면 조합 always @(*)) */
  | { t: "always"; edges: string[] | null; body: Stmt; line: number }
  | { t: "instance"; module: string; name: string; conns: { port: string; expr: Expr | null; line: number }[]; line: number };

export interface ModuleDecl {
  name: string;
  ports: Port[];
  items: Item[];
  line: number;
}

export interface SourceFile {
  modules: ModuleDecl[];
}
