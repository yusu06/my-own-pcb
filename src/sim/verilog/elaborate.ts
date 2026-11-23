import type { Expr, ModuleDecl, Stmt } from "./ast";
import { VerilogError } from "./errors";
import { parse } from "./parser";

export interface PortInfo {
  name: string;
  width: number;
}
export interface Design {
  inputs: PortInfo[];
  outputs: PortInfo[];
  /** 조합 회로 한 번 계산(새 상태에서). 조합 루프면 VerilogError */
  run(inputs: Record<string, number>): Record<string, number>;
  /** 상태를 가진 시뮬레이션. 신호 값이 step 사이에 남고, posedge 블록은 에지(0→1)에서 돈다 */
  sim(): { step(inputs: Record<string, number>): Record<string, number> };
  /** posedge 블록이 있으면 첫 블록의 줄 번호, 없으면 null */
  seqLine: number | null;
}

interface Sig {
  id: number;
  name: string;
  width: number;
  lsb: number;
  kind: "input" | "output" | "wire" | "reg";
  line: number;
  driven: number; // 값을 넣는 곳이 있는 비트들
  read: boolean;
}
type Sym = { t: "sig"; s: Sig } | { t: "param"; value: number; width: number };
type Scope = Map<string, Sym>;
type Fn = (v: number[]) => number;
interface Proc {
  line: number;
  targets: number[];
  run: (v: number[]) => void;
  /** posedge 블록이면 에지 신호 id들 */
  edges?: number[];
}
interface Ctx {
  sigs: Sig[];
  procs: Proc[];
  mods: Map<string, ModuleDecl>;
  /** posedge 블록의 논블로킹 대입: 모든 블록을 돈 뒤 한꺼번에 반영 */
  pending: (() => void)[];
  instances: number;
}
type Mode = "assign" | "always" | "inst";
interface Lhs {
  width: number;
  bits: { s: Sig; mask: number }[];
  write: (v: number[], x: number) => void;
}

const MAX_PASSES = 200;
const MAX_DEPTH = 16;
/** 겹겹이 펼친 인스턴스 수 상한(폰이 멈추지 않게) */
const MAX_INSTANCES = 2000;
/** 펼친 뒤 assign·always·포트 연결 수 상한. 루프가 있으면 settle 한 번이 (바퀴 수 × 이 수)만큼 돈다 */
const MAX_PROCS = 3000;
/** settle 한 번에 블록을 실행하는 총 횟수 상한(폰에서 1초 안팎) */
const MAX_WORK = 2_000_000;
const fit = (x: number, w: number) => {
  const M = 2 ** w;
  return ((x % M) + M) % M;
};
const ones = (w: number) => 2 ** w - 1;
const parity = (x: number) => {
  let p = 0;
  for (; x > 0; x = Math.floor(x / 2)) p ^= x % 2;
  return p;
};
const fail = (line: number, msg: string): never => {
  throw new VerilogError(line, msg);
};

export function compile(src: string, top: string): Design {
  const file = parse(src);
  const mods = new Map<string, ModuleDecl>();
  for (const m of file.modules) {
    if (mods.has(m.name)) fail(m.line, `모듈 ‘${m.name}’을(를) 두 번 만들었어요.`);
    mods.set(m.name, m);
  }
  const topMod = mods.get(top) ?? fail(1, `모듈 ‘${top}’이(가) 없어요. 뼈대 코드의 module ${top} 이름을 바꾸지 마세요.`);
  const ctx: Ctx = { sigs: [], procs: [], mods, pending: [], instances: 0 };
  const scope = elabModule(topMod, "", ctx, []);
  const portSig = (name: string) => (scope.get(name) as { s: Sig }).s;
  const inputs = topMod.ports.filter((p) => p.dir === "input").map((p) => ({ name: p.name, width: p.msb - p.lsb + 1 }));
  const outputs = topMod.ports.filter((p) => p.dir === "output").map((p) => ({ name: p.name, width: p.msb - p.lsb + 1 }));
  const { sigs, pending } = ctx;
  const comb = ctx.procs.filter((p) => !p.edges);
  const seqs = ctx.procs.filter((p) => p.edges);

  const settle = (v: number[]) => {
    let lastLine = comb[0]?.line ?? 1;
    for (let pass = 0; ; pass++) {
      let changed = false;
      for (const p of comb) {
        const old = p.targets.map((i) => v[i]);
        p.run(v);
        if (p.targets.some((i, k) => v[i] !== old[k])) {
          if (!changed) lastLine = p.line; // 이번 바퀴에 처음 바뀐 곳이 루프의 출발점에 가깝다
          changed = true;
        }
      }
      if (!changed) return;
      // 순환이 없으면 바퀴마다 적어도 한 단은 자리를 잡으니, 긴 사슬은 그 길이만큼 더 돈다
      if (pass >= Math.min(MAX_PASSES + comb.length, Math.max(MAX_PASSES, MAX_WORK / comb.length)))
        fail(lastLine, "조합 루프: 신호가 계속 바뀌어서 값이 정해지지 않아요. 출력이 돌고 돌아 자기 자신을 바꾸고 있지 않은지 보세요.");
    }
  };

  const sim = () => {
    const v = new Array<number>(sigs.length).fill(0);
    // 에지 신호의 직전 값(전원 직후 0)
    const seen = new Map<number, number>();
    return {
      step(given: Record<string, number>) {
        for (const p of inputs) v[portSig(p.name).id] = fit(Math.trunc(Number(given[p.name]) || 0), p.width);
        settle(v);
        for (let round = 0; ; round++) {
          const fired = seqs.filter((p) => p.edges!.some((i) => (seen.get(i) ?? 0) === 0 && v[i] % 2 === 1));
          for (const p of seqs) for (const i of p.edges!) seen.set(i, v[i] % 2);
          if (!fired.length) break;
          if (round >= MAX_PASSES)
            fail(fired[0].line, "클럭 연쇄: 클럭 신호가 계속 다시 바뀌어요. posedge 블록이 바꾼 값이 자기 클럭을 또 바꾸고 있지 않은지 보세요.");
          pending.length = 0;
          for (const p of fired) p.run(v);
          for (const w of pending) w();
          pending.length = 0;
          settle(v);
        }
        return Object.fromEntries(outputs.map((p) => [p.name, v[portSig(p.name).id]]));
      },
    };
  };

  return { inputs, outputs, run: (given) => sim().step(given), sim, seqLine: seqs[0]?.line ?? null };
}

function elabModule(mod: ModuleDecl, prefix: string, ctx: Ctx, stack: string[]): Scope {
  const scope: Scope = new Map();
  const declare = (name: string, line: number, sym: Sym) => {
    if (scope.has(name)) fail(line, `‘${name}’을(를) 두 번 선언했어요.`);
    scope.set(name, sym);
  };
  const newSig = (name: string, width: number, lsb: number, kind: Sig["kind"], line: number) => {
    const s: Sig = { id: ctx.sigs.length, name: prefix + name, width, lsb, kind, line, driven: 0, read: false };
    ctx.sigs.push(s);
    declare(name, line, { t: "sig", s });
    return s;
  };
  for (const p of mod.ports) newSig(p.name, p.msb - p.lsb + 1, p.lsb, p.dir === "input" ? "input" : p.isReg ? "reg" : "output", p.line);
  // 선언을 먼저 모은다(선언 전에 써도 된다)
  for (const it of mod.items) {
    if (it.t === "decl") for (const n of it.names) newSig(n, it.msb - it.lsb + 1, it.lsb, it.kind, it.line);
    if (it.t === "param") {
      const { f, width } = constExpr(it.value, scope, it.line);
      declare(it.name, it.line, { t: "param", value: f(), width });
    }
  }

  const ex = new ExprCompiler(scope, ctx.pending);
  const addProc = (line: number, lhsList: Lhs[], run: (v: number[]) => void, edges?: number[]) => {
    if (ctx.procs.length >= MAX_PROCS) fail(line, `회로가 너무 커요. 모두 펼치면 assign·always·연결이 ${MAX_PROCS}개가 넘어요.`);
    // 같은 비트에 값을 넣는 곳이 둘 이상이면 오류
    const own = new Map<Sig, number>();
    for (const l of lhsList) for (const b of l.bits) own.set(b.s, (own.get(b.s) ?? 0) | b.mask);
    for (const [s, mask] of own) {
      if ((s.driven & mask) >>> 0) fail(line, `‘${shortName(s)}’에 값을 넣는 곳이 여러 곳이에요. 한 신호에는 한 곳에서만 값을 넣어요.`);
      s.driven = (s.driven | mask) >>> 0;
    }
    ctx.procs.push({ line, targets: [...own.keys()].map((s) => s.id), run, edges });
  };

  for (const it of mod.items) {
    if (it.t === "assign" || (it.t === "decl" && it.init)) {
      const lhsE: Expr = it.t === "assign" ? it.lhs : { t: "id", name: it.names[0], line: it.line };
      const rhsE = it.t === "assign" ? it.rhs : it.init!;
      const lhs = ex.lhs(lhsE, "assign");
      const f = ex.cx(rhsE, Math.max(lhs.width, ex.sw(rhsE)));
      addProc(it.line, [lhs], (v) => lhs.write(v, f(v)));
    } else if (it.t === "always") {
      const lhsList: Lhs[] = [];
      const edges = it.edges?.map((n) => ex.edge(n, it.line));
      const run = ex.stmt(it.body, lhsList, !!edges);
      addProc(it.line, lhsList, run, edges);
    } else if (it.t === "instance") {
      const child = ctx.mods.get(it.module) ?? fail(it.line, `모듈 ‘${it.module}’이(가) 없어요. 같은 파일에 module ${it.module} ... endmodule을 써 주세요.`);
      if (stack.includes(child.name) || child.name === mod.name) fail(it.line, `모듈 ‘${child.name}’이(가) 자기 자신을 품고 있어요. 모듈 안에 같은 모듈을 넣을 수 없어요.`);
      if (stack.length >= MAX_DEPTH) fail(it.line, "모듈을 너무 깊게 겹쳐 넣었어요.");
      if (++ctx.instances > MAX_INSTANCES) fail(it.line, `부품(인스턴스)이 너무 많아요. 모두 펼치면 ${MAX_INSTANCES}개가 넘어요.`);
      if (scope.has(it.name)) fail(it.line, `‘${it.name}’ 이름이 이미 쓰이고 있어요. 인스턴스 이름을 바꿔 주세요.`);
      const seen = new Set<string>();
      for (const c of it.conns) {
        if (!child.ports.some((p) => p.name === c.port)) fail(c.line, `모듈 ‘${child.name}’에는 ‘${c.port}’ 포트가 없어요.`);
        if (seen.has(c.port)) fail(c.line, `‘${c.port}’ 포트를 두 번 연결했어요.`);
        seen.add(c.port);
      }
      const cs = elabModule(child, `${prefix}${it.name}.`, ctx, [...stack, mod.name]);
      for (const p of child.ports) {
        const ps = (cs.get(p.name) as { s: Sig }).s;
        const conn = it.conns.find((c) => c.port === p.name);
        if (p.dir === "input") {
          if (!conn?.expr) fail(it.line, `인스턴스 ‘${it.name}’의 입력 ‘${p.name}’이(가) 연결되지 않았어요.`);
          const f = ex.cx(conn!.expr!, Math.max(ps.width, ex.sw(conn!.expr!)));
          const w = ps.width;
          addProc(conn!.line, [{ width: w, bits: [{ s: ps, mask: ones(w) }], write: () => {} }], (v) => (v[ps.id] = fit(f(v), w)));
        } else if (conn?.expr) {
          ps.read = true;
          const lhs = ex.lhs(conn.expr, "inst");
          addProc(conn.line, [lhs], (v) => lhs.write(v, v[ps.id]));
        }
      }
    }
  }

  // 값을 넣지 않은 출력, 값을 넣지 않고 읽기만 하는 신호
  for (const sym of scope.values()) {
    if (sym.t !== "sig") continue;
    const s = sym.s;
    const full = ones(s.width);
    if (s.kind === "input") continue;
    const isPort = mod.ports.some((p) => prefix + p.name === s.name);
    if (isPort && s.driven === 0) fail(s.line, `‘${shortName(s)}’에 값을 넣는 곳이 없어요.`);
    if (isPort && s.driven !== full) fail(s.line, `‘${shortName(s)}’의 일부 비트에 값을 넣는 곳이 없어요.`);
    if (!isPort && s.read && s.driven === 0) fail(s.line, `‘${shortName(s)}’을(를) 쓰고 있는데 값을 넣는 곳이 없어요.`);
  }
  return scope;
}

const shortName = (s: Sig) => s.name.slice(s.name.lastIndexOf(".") + 1);

/** 상수 식(숫자와 localparam만) */
function constExpr(e: Expr, scope: Scope, line: number): { f: () => number; width: number } {
  const check = (x: Expr): void => {
    if (x.t === "id" || x.t === "index" || x.t === "range") {
      const sym = scope.get(x.name);
      if (!sym || sym.t !== "param" || x.t !== "id") fail(line, "localparam 값에는 숫자나 앞에서 만든 localparam만 쓸 수 있어요.");
    }
    if (x.t === "unary") check(x.e);
    if (x.t === "binary") (check(x.l), check(x.r));
    if (x.t === "ternary") (check(x.c), check(x.a), check(x.b));
    if (x.t === "concat") x.parts.forEach(check);
  };
  check(e);
  const ex = new ExprCompiler(scope);
  const width = ex.sw(e);
  const f = ex.cx(e, width);
  return { f: () => f([]), width };
}

class ExprCompiler {
  constructor(
    private scope: Scope,
    private pending: (() => void)[] = [],
  ) {}

  /** posedge 신호(읽는 신호로 표시) */
  edge(name: string, line: number): number {
    const s = this.sig(name, line);
    s.read = true;
    return s.id;
  }

  private sym(name: string, line: number): Sym {
    return this.scope.get(name) ?? fail(line, `선언하지 않은 이름 ‘${name}’ — wire ${name}; 처럼 먼저 선언하거나 철자를 확인해 주세요.`);
  }
  private sig(name: string, line: number): Sig {
    const s = this.sym(name, line);
    if (s.t !== "sig") return fail(line, `‘${name}’은(는) 상수라서 비트를 고르거나 값을 넣을 수 없어요.`);
    return s.s;
  }

  /** 식 자체의 비트 너비 */
  sw(e: Expr): number {
    switch (e.t) {
      case "num":
        return e.width ?? 32;
      case "id": {
        const s = this.sym(e.name, e.line);
        return s.t === "param" ? s.width : s.s.width;
      }
      case "index":
        return 1;
      case "range":
        return e.msb - e.lsb + 1;
      case "unary":
        return ["~", "-", "+"].includes(e.op) ? this.sw(e.e) : 1;
      case "binary":
        if (["<<", ">>"].includes(e.op)) return this.sw(e.l);
        if (["&", "|", "^", "~^", "^~", "+", "-", "*"].includes(e.op)) return Math.max(this.sw(e.l), this.sw(e.r));
        return 1;
      case "ternary":
        return Math.max(this.sw(e.a), this.sw(e.b));
      case "concat":
        return e.parts.reduce((n, p) => n + this.sw(p), 0);
    }
  }

  /** 너비 W(문맥)로 계산하는 함수. 결과는 항상 0 ≤ x < 2^W */
  cx(e: Expr, W: number): Fn {
    switch (e.t) {
      case "num": {
        const k = fit(e.value, W);
        return () => k;
      }
      case "id": {
        const s = this.sym(e.name, e.line);
        if (s.t === "param") {
          const k = fit(s.value, W);
          return () => k;
        }
        const sig = s.s;
        sig.read = true;
        const i = sig.id;
        return W >= sig.width ? (v) => v[i] : (v) => fit(v[i], W);
      }
      case "index": {
        const sig = this.sig(e.name, e.line);
        sig.read = true;
        const i = sig.id;
        const at = this.cx(e.index, this.sw(e.index));
        if (e.index.t === "num" && (e.index.value < sig.lsb || e.index.value >= sig.lsb + sig.width))
          fail(e.line, `‘${e.name}’에는 [${e.index.value}] 비트가 없어요.`);
        return (v) => {
          const k = at(v) - sig.lsb;
          return k < 0 || k >= sig.width ? 0 : Math.floor(v[i] / 2 ** k) % 2;
        };
      }
      case "range": {
        const sig = this.sig(e.name, e.line);
        if (e.lsb < sig.lsb || e.msb >= sig.lsb + sig.width) fail(e.line, `‘${e.name}’에는 [${e.msb}:${e.lsb}] 범위가 없어요.`);
        sig.read = true;
        const i = sig.id;
        const off = e.lsb - sig.lsb;
        const M = 2 ** (e.msb - e.lsb + 1);
        return (v) => fit(Math.floor(v[i] / 2 ** off) % M, W);
      }
      case "unary": {
        const op = e.op;
        if (op === "~") {
          const f = this.cx(e.e, W);
          const m = ones(W);
          return (v) => m - f(v);
        }
        if (op === "-") {
          const f = this.cx(e.e, W);
          return (v) => fit(-f(v), W);
        }
        if (op === "+") return this.cx(e.e, W);
        const s = this.sw(e.e);
        const f = this.cx(e.e, s);
        const m = ones(s);
        const r: Record<string, Fn> = {
          "!": (v) => (f(v) === 0 ? 1 : 0),
          "&": (v) => (f(v) === m ? 1 : 0),
          "~&": (v) => (f(v) === m ? 0 : 1),
          "|": (v) => (f(v) !== 0 ? 1 : 0),
          "~|": (v) => (f(v) !== 0 ? 0 : 1),
          "^": (v) => parity(f(v)),
          "~^": (v) => 1 - parity(f(v)),
        };
        return r[op];
      }
      case "binary": {
        const op = e.op;
        if (op === "&&" || op === "||") {
          const a = this.cx(e.l, this.sw(e.l));
          const b = this.cx(e.r, this.sw(e.r));
          return op === "&&" ? (v) => (a(v) && b(v) ? 1 : 0) : (v) => (a(v) || b(v) ? 1 : 0);
        }
        if (["==", "!=", "<", "<=", ">", ">="].includes(op)) {
          const C = Math.max(this.sw(e.l), this.sw(e.r));
          const a = this.cx(e.l, C);
          const b = this.cx(e.r, C);
          const cmp: Record<string, Fn> = {
            "==": (v) => (a(v) === b(v) ? 1 : 0),
            "!=": (v) => (a(v) !== b(v) ? 1 : 0),
            "<": (v) => (a(v) < b(v) ? 1 : 0),
            "<=": (v) => (a(v) <= b(v) ? 1 : 0),
            ">": (v) => (a(v) > b(v) ? 1 : 0),
            ">=": (v) => (a(v) >= b(v) ? 1 : 0),
          };
          return cmp[op];
        }
        if (op === "<<" || op === ">>") {
          const a = this.cx(e.l, W);
          const b = this.cx(e.r, this.sw(e.r));
          return op === "<<" ? (v) => (b(v) >= W ? 0 : fit(a(v) * 2 ** b(v), W)) : (v) => Math.floor(a(v) / 2 ** b(v));
        }
        const a = this.cx(e.l, W);
        const b = this.cx(e.r, W);
        const m = ones(W);
        const ar: Record<string, Fn> = {
          "&": (v) => (a(v) & b(v)) >>> 0,
          "|": (v) => (a(v) | b(v)) >>> 0,
          "^": (v) => (a(v) ^ b(v)) >>> 0,
          "~^": (v) => m - ((a(v) ^ b(v)) >>> 0),
          "^~": (v) => m - ((a(v) ^ b(v)) >>> 0),
          "+": (v) => fit(a(v) + b(v), W),
          "-": (v) => fit(a(v) - b(v), W),
          // shortcut: 곱이 2^53을 넘으면 아래 비트가 부정확하다(32비트 × 32비트). 큰 곱셈 과제가 생기면 BigInt로
          "*": (v) => fit(a(v) * b(v), W),
        };
        return ar[op];
      }
      case "ternary": {
        const c = this.cx(e.c, this.sw(e.c));
        const a = this.cx(e.a, W);
        const b = this.cx(e.b, W);
        return (v) => (c(v) ? a(v) : b(v));
      }
      case "concat": {
        const parts = e.parts.map((p) => {
          if (p.t === "num" && p.width === undefined) fail(p.line, "연결 { } 안의 숫자에는 크기를 써 주세요. 예: 1'b0");
          const w = this.sw(p);
          return { w: 2 ** w, f: this.cx(p, w) };
        });
        if (this.sw(e) > 32) fail(e.line, "연결 결과가 32비트를 넘어요. 이 앱은 32비트까지만 지원해요.");
        return (v) => {
          let acc = 0;
          for (const p of parts) acc = acc * p.w + p.f(v);
          return fit(acc, W);
        };
      }
    }
  }

  /** 대입 왼쪽 */
  lhs(e: Expr, mode: Mode): Lhs {
    if (e.t === "concat") {
      const parts = e.parts.map((p) => this.lhs(p, mode));
      return {
        width: parts.reduce((n, p) => n + p.width, 0),
        bits: parts.flatMap((p) => p.bits),
        write: (v, x) => {
          for (let k = parts.length - 1; k >= 0; k--) {
            const M = 2 ** parts[k].width;
            parts[k].write(v, x % M);
            x = Math.floor(x / M);
          }
        },
      };
    }
    if (e.t !== "id" && e.t !== "index" && e.t !== "range") return fail(e.line, "값을 넣는 쪽(= 왼쪽)에는 신호 이름만 쓸 수 있어요.");
    const s = this.sig(e.name, e.line);
    const n = e.name;
    if (s.kind === "input") fail(e.line, `‘${n}’은(는) 입력이라 값을 넣을 수 없어요.`);
    if (mode === "always" && s.kind !== "reg") fail(e.line, `‘${n}’은(는) wire라서 always 안에서 값을 넣을 수 없어요. output reg(또는 reg)로 선언해 주세요.`);
    if (mode === "assign" && s.kind === "reg") fail(e.line, `‘${n}’은(는) reg라서 assign으로 값을 넣을 수 없어요. reg에는 always 안에서 값을 넣어요.`);
    if (mode === "inst" && s.kind === "reg") fail(e.line, `‘${n}’은(는) reg라서 모듈 출력에 연결할 수 없어요. wire로 선언해 주세요.`);
    const i = s.id;
    if (e.t === "id") {
      const w = s.width;
      return { width: w, bits: [{ s, mask: ones(w) }], write: (v, x) => (v[i] = fit(x, w)) };
    }
    let off: number;
    let w: number;
    if (e.t === "index") {
      const k = e.index.t === "num" ? e.index.value : e.index.t === "id" && this.scope.get(e.index.name)?.t === "param" ? (this.scope.get(e.index.name) as { value: number }).value : null;
      if (k === null) return fail(e.line, "값을 넣는 쪽의 [ ] 안에는 숫자를 써 주세요.");
      if (k < s.lsb || k >= s.lsb + s.width) fail(e.line, `‘${n}’에는 [${k}] 비트가 없어요.`);
      off = k - s.lsb;
      w = 1;
    } else {
      if (e.lsb < s.lsb || e.msb >= s.lsb + s.width) fail(e.line, `‘${n}’에는 [${e.msb}:${e.lsb}] 범위가 없어요.`);
      off = e.lsb - s.lsb;
      w = e.msb - e.lsb + 1;
    }
    const P = 2 ** off;
    const M = 2 ** w;
    return {
      width: w,
      bits: [{ s, mask: ones(w) * P }],
      write: (v, x) => {
        const cur = v[i];
        const old = Math.floor(cur / P) % M;
        v[i] = cur + (fit(x, w) - old) * P;
      },
    };
  }

  /** always 블록 안 문장. 값을 넣는 왼쪽들을 out에 모은다. seq = posedge 블록(<=는 나중에 한꺼번에 반영) */
  stmt(s: Stmt, out: Lhs[], seq = false): (v: number[]) => void {
    switch (s.t) {
      case "empty":
        return () => {};
      case "block": {
        const fs = s.body.map((b) => this.stmt(b, out, seq));
        return (v) => fs.forEach((f) => f(v));
      }
      case "if": {
        const c = this.cx(s.c, this.sw(s.c));
        const a = this.stmt(s.then, out, seq);
        const b = s.else ? this.stmt(s.else, out, seq) : null;
        return (v) => (c(v) ? a(v) : b?.(v));
      }
      case "case": {
        const sel = this.sw(s.e);
        const arms = s.items.map((it) => ({
          tests: it.labels?.map((l) => {
            const C = Math.max(sel, this.sw(l));
            const a = this.cx(s.e, C);
            const b = this.cx(l, C);
            return (v: number[]) => a(v) === b(v);
          }),
          body: this.stmt(it.body, out, seq),
        }));
        if (arms.filter((a) => !a.tests).length > 1) fail(s.line, "case 안에 default가 두 개 있어요.");
        return (v) => {
          const hit = arms.find((a) => a.tests?.some((t) => t(v))) ?? arms.find((a) => !a.tests);
          hit?.body(v);
        };
      }
      case "assign": {
        const lhs = this.lhs(s.lhs, "always");
        out.push(lhs);
        const f = this.cx(s.rhs, Math.max(lhs.width, this.sw(s.rhs)));
        if (seq && s.nb) {
          const q = this.pending;
          return (v) => {
            const x = f(v); // 오른쪽은 지금 값으로 계산하고, 쓰기는 미룬다
            q.push(() => lhs.write(v, x));
          };
        }
        return (v) => lhs.write(v, f(v));
      }
    }
  }
}
