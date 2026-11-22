import { expect, test } from "vitest";
import { compile, VerilogError } from "./index";

const run = (src: string, inputs: Record<string, number>, top = "m") => compile(src, top).run(inputs);
const err = (src: string, top = "m", inputs: Record<string, number> = {}): string => {
  try {
    compile(src, top).run(inputs);
  } catch (e) {
    expect(e).toBeInstanceOf(VerilogError);
    return (e as Error).message;
  }
  throw new Error("오류가 나야 함");
};
const mod = (ports: string, body: string) => `module m(${ports});\n${body}\nendmodule`;

test("기본 게이트와 포트 목록", () => {
  const d = compile(mod("input a, input b, output y", "  assign y = a & b;"), "m");
  expect(d.inputs).toEqual([{ name: "a", width: 1 }, { name: "b", width: 1 }]);
  expect(d.outputs).toEqual([{ name: "y", width: 1 }]);
  expect([0, 1, 2, 3].map((n) => d.run({ a: n >> 1, b: n & 1 }).y)).toEqual([0, 0, 0, 1]);
  const x = compile(mod("input a, input b, output y", "  assign y = a ^ b;"), "m");
  expect([0, 1, 2, 3].map((n) => x.run({ a: n >> 1, b: n & 1 }).y)).toEqual([0, 1, 1, 0]);
  const nand = compile(mod("input a, input b, output y", "  assign y = ~(a & b);"), "m");
  expect([0, 1, 2, 3].map((n) => nand.run({ a: n >> 1, b: n & 1 }).y)).toEqual([1, 1, 1, 0]);
});

test("MUX와 반가산기", () => {
  const mux = compile(mod("input a, input b, input s, output y", "  assign y = s ? b : a;"), "m");
  expect(mux.run({ a: 1, b: 0, s: 0 }).y).toBe(1);
  expect(mux.run({ a: 1, b: 0, s: 1 }).y).toBe(0);
  const ha = compile(mod("input a, input b, output s, output c", "  assign {c, s} = a + b;"), "m");
  expect(ha.run({ a: 1, b: 1 })).toEqual({ s: 0, c: 1 });
  expect(ha.run({ a: 1, b: 0 })).toEqual({ s: 1, c: 0 });
});

test("always @(*) + case 7세그", () => {
  const src = mod(
    "input [3:0] d, output reg [6:0] seg",
    `  always @(*) begin
    case (d)
      4'd0: seg = 7'b0111111;
      4'd1: seg = 7'b0000110;
      4'd8, 4'd9: seg = 7'b1111111;
      default: seg = 7'b0000000;
    endcase
  end`,
  );
  const d = compile(src, "m");
  expect(d.run({ d: 0 }).seg).toBe(0b0111111);
  expect(d.run({ d: 1 }).seg).toBe(0b0000110);
  expect(d.run({ d: 9 }).seg).toBe(0b1111111);
  expect(d.run({ d: 12 }).seg).toBe(0);
});

test("if/else if/else 와 블로킹 대입 순서", () => {
  const pri = mod(
    "input [3:0] r, output reg [1:0] y, output reg v",
    `  always @(*) begin
    v = 1;
    if (r[3]) y = 3;
    else if (r[2]) y = 2;
    else if (r[1]) y = 1;
    else begin y = 0; v = r[0]; end
  end`,
  );
  expect(run(pri, { r: 0b1010 })).toEqual({ y: 3, v: 1 });
  expect(run(pri, { r: 0b0110 })).toEqual({ y: 2, v: 1 });
  expect(run(pri, { r: 0 })).toEqual({ y: 0, v: 0 });
  const seq = mod("input a, input b, input c, output reg y", "  reg t;\n  always @(*) begin\n    t = a & b;\n    y = t | c;\n  end");
  expect(run(seq, { a: 1, b: 1, c: 0 }).y).toBe(1);
  expect(run(seq, { a: 1, b: 0, c: 0 }).y).toBe(0);
});

test("비트·범위 선택, 연결, 너비", () => {
  expect(run(mod("input [3:0] a, output y", "  assign y = a[3];"), { a: 8 }).y).toBe(1);
  expect(run(mod("input [3:0] a, output [1:0] y", "  assign y = a[2:1];"), { a: 0b0110 }).y).toBe(3);
  expect(run(mod("input [1:0] a, input [1:0] b, output [3:0] y", "  assign y = {a, b};"), { a: 2, b: 1 }).y).toBe(9);
  const add = mod("input [3:0] a, input [3:0] b, input cin, output [3:0] s, output cout", "  assign {cout, s} = a + b + cin;");
  expect(run(add, { a: 15, b: 1, cin: 0 })).toEqual({ s: 0, cout: 1 });
  expect(run(add, { a: 7, b: 8, cin: 1 })).toEqual({ s: 0, cout: 1 });
  expect(run(add, { a: 3, b: 4, cin: 1 })).toEqual({ s: 8, cout: 0 });
  expect(run(mod("input [3:0] a, input [3:0] b, output [3:0] d", "  assign d = a - b;"), { a: 3, b: 5 }).d).toBe(14);
  expect(run(mod("input [3:0] a, output [3:0] y", "  assign y = ~a;"), { a: 5 }).y).toBe(10);
  expect(run(mod("input [3:0] a, output [7:0] y", "  assign y = ~a;"), { a: 5 }).y).toBe(250);
  expect(run(mod("input [3:0] a, output [3:0] y", "  assign y = a << 1;"), { a: 9 }).y).toBe(2);
  expect(run(mod("input [3:0] a, output y", "  assign y = &a;"), { a: 15 }).y).toBe(1);
  expect(run(mod("input [3:0] a, output y", "  assign y = ^a;"), { a: 7 }).y).toBe(1);
  expect(run(mod("input [3:0] a, output y", "  assign y = !a;"), { a: 0 }).y).toBe(1);
  // 입력값이 너비보다 크면 잘린다
  expect(run(mod("input [1:0] a, output [1:0] y", "  assign y = a;"), { a: 7 }).y).toBe(3);
  // 비트 하나씩 따로 대입
  expect(run(mod("input a, input b, output [1:0] y", "  assign y[0] = a;\n  assign y[1] = b;"), { a: 1, b: 0 }).y).toBe(1);
});

test("비교 연산과 localparam", () => {
  const cmp = mod(
    "input [3:0] a, input [3:0] b, output gt, output eq, output lt, output big",
    "  localparam LIMIT = 4'd9;\n  assign gt = a > b;\n  assign eq = a == b;\n  assign lt = a < b;\n  assign big = a > LIMIT;",
  );
  expect(run(cmp, { a: 10, b: 3 })).toEqual({ gt: 1, eq: 0, lt: 0, big: 1 });
  expect(run(cmp, { a: 3, b: 3 })).toEqual({ gt: 0, eq: 1, lt: 0, big: 0 });
  expect(run(cmp, { a: 2, b: 3 })).toEqual({ gt: 0, eq: 0, lt: 1, big: 0 });
});

const HA = `module ha(input a, input b, output s, output c);
  assign s = a ^ b;
  assign c = a & b;
endmodule
`;
const FA =
  HA +
  `module fa(input a, input b, input cin, output s, output cout);
  wire s1, c1, c2;
  ha h1(.a(a), .b(b), .s(s1), .c(c1));
  ha h2(.a(s1), .b(cin), .s(s), .c(c2));
  assign cout = c1 | c2;
endmodule
`;

test("모듈 인스턴스: 전가산기와 4비트 리플 덧셈기", () => {
  const fa = compile(FA, "fa");
  for (let n = 0; n < 8; n++) {
    const a = n >> 2, b = (n >> 1) & 1, cin = n & 1;
    const sum = a + b + cin;
    expect(fa.run({ a, b, cin })).toEqual({ s: sum & 1, cout: sum >> 1 });
  }
  const add4 = compile(
    FA +
      `module add4(input [3:0] a, input [3:0] b, output [3:0] s, output cout);
  wire c0, c1, c2;
  fa f0(.a(a[0]), .b(b[0]), .cin(1'b0), .s(s[0]), .cout(c0));
  fa f1(.a(a[1]), .b(b[1]), .cin(c0), .s(s[1]), .cout(c1));
  fa f2(.a(a[2]), .b(b[2]), .cin(c1), .s(s[2]), .cout(c2));
  fa f3(.a(a[3]), .b(b[3]), .cin(c2), .s(s[3]), .cout(cout));
endmodule`,
    "add4",
  );
  for (const [a, b] of [[0, 0], [7, 9], [15, 15], [5, 6]]) {
    expect(add4.run({ a, b })).toEqual({ s: (a + b) & 15, cout: (a + b) >> 4 });
  }
});

test("정적 검사 오류", () => {
  expect(err(mod("input a, output y", "  assign y = q;"))).toContain("선언하지 않은 이름 ‘q’");
  expect(err(mod("input a, output y", "  assign a = 1;\n  assign y = a;"))).toContain("입력");
  expect(err(mod("input a, output reg y", "  assign y = a;"))).toContain("always 안에서");
  expect(err(mod("input a, output y", "  always @(*) y = a;"))).toContain("output reg");
  expect(err(mod("input a, output y, output z", "  assign y = a;"))).toContain("‘z’에 값을 넣는 곳이 없어요");
  expect(err(mod("input a, output y", "  assign y = a;\n  assign y = ~a;"))).toContain("여러 곳");
  expect(err(mod("input a, output y", "  wire t;\n  assign y = t;"))).toContain("‘t’");
  expect(err(mod("input a, output y", "  foo f(.a(a), .y(y));"))).toContain("모듈 ‘foo’이(가) 없어요");
  expect(err("module m(input a, output y);\n  m inner(.a(a), .y(y));\nendmodule")).toContain("자기 자신");
  expect(err(HA, "top")).toContain("‘top’");
  expect(err(HA + "module m(input a, output s);\n  ha h(.a(a), .s(s));\nendmodule")).toContain("‘b’");
  expect(err(HA + "module m(input a, input b, output s);\n  ha h(.a(a), .b(b), .q(s));\nendmodule")).toContain("‘q’");
  expect(err(mod("input a, output y", "  wire a;\n  assign y = a;"))).toContain("두 번");
});

test("조합 루프는 멈추고 오류", () => {
  const t0 = Date.now();
  const msg = err(mod("input a, output y", "  wire t;\n  assign t = ~t;\n  assign y = t & a;"), "m", { a: 1 });
  expect(msg).toContain("조합 루프");
  expect(msg).toMatch(/^3번째 줄/);
  expect(Date.now() - t0).toBeLessThan(500);
  // 안정되는 되먹임(래치처럼 값을 유지)은 오류가 아니다
  expect(run(mod("input a, output y", "  wire t;\n  assign t = a | (t & 0);\n  assign y = t;"), { a: 1 }).y).toBe(1);
});

const steps = (src: string, ins: Record<string, number>[]) => {
  const s = compile(src, "m").sim();
  return ins.map((i) => s.step(i));
};
const serr = (src: string, ins: Record<string, number>[]): string => {
  try {
    steps(src, ins);
  } catch (e) {
    expect(e).toBeInstanceOf(VerilogError);
    return (e as Error).message;
  }
  throw new Error("오류가 나야 함");
};

test("D 플립플롭은 상승 에지에서만 d를 잡는다", () => {
  const src = mod("input clk, input d, output reg q", "  always @(posedge clk) q <= d;");
  const r = steps(src, [{ clk: 0, d: 1 }, { clk: 1, d: 1 }, { clk: 1, d: 0 }, { clk: 0, d: 0 }, { clk: 1, d: 0 }]);
  expect(r.map((o) => o.q)).toEqual([0, 1, 1, 1, 0]);
});

test("논블로킹 대입은 한꺼번에 반영된다(맞바꾸기)", () => {
  const src = mod(
    "input clk, input rst, output reg a, output reg b",
    "  always @(posedge clk) begin\n    if (rst) begin a <= 1; b <= 0; end\n    else begin a <= b; b <= a; end\n  end",
  );
  const r = steps(src, [{ clk: 0, rst: 1 }, { clk: 1, rst: 1 }, { clk: 0, rst: 0 }, { clk: 1, rst: 0 }, { clk: 0, rst: 0 }, { clk: 1, rst: 0 }]);
  expect(r.map((o) => [o.a, o.b])).toEqual([[0, 0], [1, 0], [1, 0], [0, 1], [0, 1], [1, 0]]);
});

test("블로킹 대입은 posedge 안에서 바로 반영된다", () => {
  const src = mod("input clk, output reg [3:0] a, output reg [3:0] b", "  always @(posedge clk) begin\n    a = a + 1;\n    b = a;\n  end");
  const r = steps(src, [{ clk: 0 }, { clk: 1 }]);
  expect(r[1]).toEqual({ a: 1, b: 1 });
});

test("비동기 리셋: rst가 올라가면 클럭 없이도 0", () => {
  const src = mod(
    "input clk, input rst, output reg [3:0] q",
    "  always @(posedge clk or posedge rst)\n    if (rst) q <= 0;\n    else q <= q + 1;",
  );
  const c = (clk: number, rst = 0) => ({ clk, rst });
  const r = steps(src, [c(0), c(1), c(0), c(1), c(0), c(1), c(0, 1)]);
  expect(r.map((o) => o.q)).toEqual([0, 1, 1, 2, 2, 3, 0]);
});

test("posedge 블록이 만든 신호가 다른 블록의 클럭이 된다(연쇄)", () => {
  const src = mod(
    "input clk, output reg t, output reg u",
    "  always @(posedge clk) t <= ~t;\n  always @(posedge t) u <= ~u;",
  );
  const r = steps(src, [0, 1, 0, 1, 0, 1, 0, 1].map((clk) => ({ clk })));
  expect(r.map((o) => o.t)).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
  expect(r.map((o) => o.u)).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
});

test("조합 always에서 값을 안 넣으면 이전 값이 남는다(래치)", () => {
  const src = mod("input on, input off, output reg q", "  always @(*)\n    if (on) q = 1;\n    else if (off) q = 0;");
  const r = steps(src, [{ on: 1, off: 0 }, { on: 0, off: 0 }, { on: 0, off: 1 }, { on: 0, off: 0 }]);
  expect(r.map((o) => o.q)).toEqual([1, 1, 0, 0]);
});

test("순차 회로 정적 검사", () => {
  expect(err(mod("input clk, input d, output reg q", "  always @(posedge clk) q <= d;\n  always @(*) q = d;"))).toContain("여러 곳");
  expect(err(mod("input clk, input d, output q", "  always @(posedge clk) q <= d;"))).toContain("wire");
  expect(err(mod("input d, output reg q", "  always @(posedge clk) q <= d;"))).toContain("clk");
});

test("자기 자신을 클럭으로 쓰는 끝없는 연쇄는 오류", () => {
  // x가 바뀌면 g2가, y가 바뀌면 g1이 다시 올라가 서로를 끝없이 깨운다
  const src = mod(
    "input clk, output reg x, output reg y",
    "  wire g1 = clk & ~(x ^ y);\n  wire g2 = clk & (x ^ y);\n  always @(posedge g1) x <= ~x;\n  always @(posedge g2) y <= ~y;",
  );
  expect(serr(src, [{ clk: 0 }, { clk: 1 }])).toContain("클럭 연쇄");
});
