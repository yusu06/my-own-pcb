import { expect, test } from "vitest";
import { parse } from "./parser";
import { VerilogError } from "./errors";
import type { Expr } from "./ast";

const AND = `module and2(input a, input b, output y);
  assign y = a & b;
endmodule`;

const rhs = (src: string): Expr => {
  const m = parse(`module m(input [7:0] a, input [7:0] b, input [7:0] c, input s, output [7:0] y);\n  assign y = ${src};\nendmodule`).modules[0];
  const it = m.items[0];
  if (it.t !== "assign") throw new Error("no assign");
  return it.rhs;
};
const show = (e: Expr): string => {
  switch (e.t) {
    case "num": return String(e.value);
    case "id": return e.name;
    case "unary": return `(${e.op}${show(e.e)})`;
    case "binary": return `(${show(e.l)} ${e.op} ${show(e.r)})`;
    case "ternary": return `(${show(e.c)} ? ${show(e.a)} : ${show(e.b)})`;
    case "concat": return `{${e.parts.map(show).join(",")}}`;
    case "index": return `${e.name}[${show(e.index)}]`;
    case "range": return `${e.name}[${e.msb}:${e.lsb}]`;
  }
};
const err = (src: string): string => {
  try {
    parse(src);
  } catch (e) {
    expect(e).toBeInstanceOf(VerilogError);
    return (e as Error).message;
  }
  throw new Error("오류가 나야 함");
};

test("2입력 AND 모듈", () => {
  const f = parse(AND);
  expect(f.modules).toHaveLength(1);
  const m = f.modules[0];
  expect(m.name).toBe("and2");
  expect(m.ports.map((p) => [p.dir, p.name, p.msb - p.lsb + 1])).toEqual([["input", "a", 1], ["input", "b", 1], ["output", "y", 1]]);
  expect(m.items).toHaveLength(1);
  expect(m.items[0].t).toBe("assign");
});

test("output reg 벡터와 always case", () => {
  const m = parse(`module seg7(input [3:0] d, output reg [6:0] seg);
  always @(*) begin
    case (d)
      4'd0: seg = 7'b0111111;
      4'd1, 4'd7: seg = 7'b0000110; // 주석
      default: seg = 0;
    endcase
  end
endmodule`).modules[0];
  expect(m.ports[1]).toMatchObject({ dir: "output", isReg: true, name: "seg", msb: 6, lsb: 0 });
  const al = m.items[0];
  expect(al.t).toBe("always");
  if (al.t !== "always" || al.body.t !== "block") throw new Error();
  const c = al.body.body[0];
  if (c.t !== "case") throw new Error();
  expect(c.items.map((i) => (i.labels ? i.labels.length : "default"))).toEqual([1, 2, "default"]);
});

test("리터럴", () => {
  expect(rhs("4'b1010")).toMatchObject({ t: "num", value: 10, width: 4 });
  expect(rhs("8'hFF")).toMatchObject({ t: "num", value: 255, width: 8 });
  expect(rhs("8'd5")).toMatchObject({ t: "num", value: 5, width: 8 });
  expect(rhs("12")).toMatchObject({ t: "num", value: 12 });
  expect((rhs("12") as { width?: number }).width).toBeUndefined();
  expect(rhs("4'b10_10")).toMatchObject({ value: 10, width: 4 });
  expect(rhs("'b11")).toMatchObject({ value: 3 });
});

test("연산자 우선순위", () => {
  expect(show(rhs("a | b & c"))).toBe("(a | (b & c))");
  expect(show(rhs("a + b << 1"))).toBe("((a + b) << 1)");
  expect(show(rhs("s ? a : b"))).toBe("(s ? a : b)");
  expect(show(rhs("~a & b"))).toBe("((~a) & b)");
  expect(show(rhs("a == b && c != 0 || s"))).toBe("(((a == b) && (c != 0)) || s)");
  expect(show(rhs("{a[3], b[2:0]}"))).toBe("{a[3],b[2:0]}");
  expect(show(rhs("s ? a : s ? b : c"))).toBe("(s ? a : (s ? b : c))");
  expect(show(rhs("&a"))).toBe("(&a)");
});

test("모듈 인스턴스", () => {
  const f = parse(`module ha(input a, input b, output s, output c);
  assign s = a ^ b;
  assign c = a & b;
endmodule
module top(input x, input y, output s0, output c0);
  ha h1(.a(x), .b(y), .s(s0), .c(c0));
endmodule`);
  expect(f.modules.map((m) => m.name)).toEqual(["ha", "top"]);
  const inst = f.modules[1].items[0];
  expect(inst).toMatchObject({ t: "instance", module: "ha", name: "h1" });
  if (inst.t !== "instance") throw new Error();
  expect(inst.conns.map((c) => c.port)).toEqual(["a", "b", "s", "c"]);
});

test("wire·reg·localparam 선언", () => {
  const m = parse(`module m(input [3:0] a, output y);
  localparam LIMIT = 4'd9;
  wire [3:0] t, u;
  wire v = a[0];
  reg r;
  assign y = a > LIMIT;
endmodule`).modules[0];
  expect(m.items.map((i) => i.t)).toEqual(["param", "decl", "decl", "decl", "assign"]);
});

test("오류: 줄 번호와 한국어 안내", () => {
  expect(err("module m(input a, output y);\n  assign y = a\nendmodule")).toContain("2번째 줄: 세미콜론(;)이 빠졌어요");
  expect(err("module m(input a, output y);\n  assign y = a;\n")).toContain("endmodule");
  expect(err("module m(input a, output y);\n  initial y = 0;\nendmodule")).toContain("지원하지 않아요");
  expect(err("module m(input a, output y);\n  assign #5 y = a;\nendmodule")).toContain("지원하지 않아요");
  expect(err("module m(input clk, output reg y);\n  always @(negedge clk) y <= 1;\nendmodule")).toContain("negedge");
  expect(err("module m(input clk, input d, output reg y);\n  always @(posedge clk or d) y <= 1;\nendmodule")).toContain("posedge");
  expect(err("")).toContain("module");
  expect(err("module m(input a, output [2:0] y);\n  assign y = 3'b129;\nendmodule")).toMatch(/^2번째 줄/);
  expect(err("module m(input a, output [2:0] y);\n  assign y = 3'd9;\nendmodule")).toContain("3비트");
  expect(err("module m(input a, output y);\n  always @(*) begin\n    y = a;\nendmodule")).toContain("end");
  expect(err("module m(input a, output y);\n  assign y = (a & a;\nendmodule")).toContain(")");
  expect(err("module m(input [40:0] a, output y);\nendmodule")).toContain("32비트");
  expect(err("module m(input a, output y);\n  assign y = a % 2;\nendmodule")).toContain("2번째 줄");
});

test('always @(posedge ...) 에지 목록과 논블로킹 표시', () => {
  const m = parse(`module m(input clk, input rst, input d, output reg q);
  always @(posedge clk or posedge rst) q <= d;
  always @(posedge clk, posedge rst) q = d;
  always @(*) q = d;
endmodule`).modules[0];
  const al = m.items.map((i) => (i.t === 'always' ? [i.edges, i.body.t === 'assign' ? i.body.nb : null] : null));
  expect(al).toEqual([[['clk', 'rst'], true], [['clk', 'rst'], false], [null, false]]);
});
