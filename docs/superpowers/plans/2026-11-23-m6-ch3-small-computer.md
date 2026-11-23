# 3장 "작은 컴퓨터" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3장 7단원(3-1 ~ 3-7)을 기존 과제 형식으로 추가하고, 3-6에 필요한 "상관없음" 채점 칸을 순차 채점기에 더한다.

**Architecture:** 공유 명령어 집합 토이4를 `src/lessons/ch3/toy4.ts` 한 곳에 둔다(명령어 표, TS 기준 모델, CPU Verilog 생성 함수). 단원 파일은 기존 2장 단원과 같은 모양이고, `LESSONS`에 붙이면 `content.test.ts`가 모범 답안·오답·뼈대를 자동으로 검사한다. 채점기 변경은 "모델이 `undefined`를 돌려주면 그 칸은 채점 안 함" 하나뿐이다.

**Tech Stack:** TypeScript, Vitest, 기존 Verilog 해석기(`src/sim/verilog`), 런타임 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-11-23-ch3-small-computer-design.md` (상위: `docs/superpowers/specs/2026-11-21-hw-study-tool-design.md`)

## Global Constraints

- 새 엔진 작업 금지: 메모리 배열, 어셈블러, 새 과제 종류, 3장 그리기 과제를 만들지 않는다.
- 단원 id `3-1` ~ `3-7`, 파일 `src/lessons/ch3/3-N-<이름>.ts`, `LESSONS` 끝에 순서대로. 배포된 id는 바꾸지 않는다.
- 단원당 과제 1개(3-1만 2개, 3-7은 `tasks: []`), `minutes` 20 이하.
- 순차 과제는 `clocked(cycles, ["rst"])` 각본, 첫 주기 rst = 1, `from: 1`(주석 `// 리셋 에지 전(값이 아직 정해지지 않음)은 채점하지 않는다`).
- 모범 답안과 따로 TS로 쓴 기대값(`spec`/`model`)으로 채점한다.
- 문구에 쓰는 `[[용어]]`는 모두 `src/lessons/glossary.ts`에 있어야 한다.
- 공개 저장소: 콘텐츠·주석·커밋에 개인정보 금지. 커밋 전 `grep -i -E -f .git/info/private-patterns`로 점검(패턴 자체는 어디에도 적지 않는다).
- 커밋: `git -c user.name=yusu06 -c user.email=yusu06@users.noreply.github.com commit`, 메시지 끝 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 백슬래시가 든 편집은 Bash heredoc 말고 Edit/Write 도구로.

## 토이4 (스펙 §5, 모든 태스크가 따른다)

명령어 8비트 `{op[3:0], n[3:0]}`. A·OUT·PC 4비트, SENSOR 4비트 입력, ROM 16칸.
`0 LDI n: A←n` · `1 ADD n: A←A+n` · `2 SUB n: A←A−n` · `3 OUT: OUT←A` · `4 JMP n: PC←n` · `5 JZ n: A==0이면 PC←n` · `6 IN: A←SENSOR` · `7~15 HLT: PC 그대로`. JMP/JZ(점프 시)/HLT 외에는 PC+1. 4비트 넘침은 버린다. rst 에지에 PC·A·OUT = 0.

## Review Focus

1. 3-6 "상관없음" 칸이 많은 각본: 통과 문구 "N단계 모두 맞혔어요"의 N은 실제로 채점한 단계 수여야 한다(전체 단계 수가 아니라). → Task 2 테스트.
2. 타임라인에서 상관없음 칸은 `기대 undefined` 같은 글이 아니라 "상관없음"으로 보이고, 첫 틀린 칸 찾기에 걸리지 않는다. → Task 2 테스트.
3. 뼈대의 `{IN, 4'd0}` 같은 연결식이 정확히 8비트 `0x60`이 된다(localparam 폭이 4비트여야 함). → Task 1 테스트.
4. 4비트 넘침(`ADD`로 15 넘기, `SUB`로 0 아래)이 TS 모델과 Verilog에서 같게 버려진다. → Task 1 테스트.
5. 실행 도중 다시 rst가 들어오면 PC·A·OUT이 0으로 돌아간다(3-5 각본에 두 번째 rst). → Task 6 각본.

---

### Task 1: 토이4 공유 모듈

**Files:**
- Create: `src/lessons/ch3/toy4.ts`
- Test: `src/lessons/ch3/toy4.test.ts`

**Interfaces:**
- Produces:
  - `TOY4_OPS: { op: number; name: "LDI"|"ADD"|"SUB"|"OUT"|"JMP"|"JZ"|"IN"|"HLT"; desc: string }[]` (op 0~7, 카드·퀴즈용 한국어 설명)
  - `ins(name: Toy4Name, n?: number): number` — 명령어 바이트(`(op << 4) | n`, n 기본 0)
  - `toy4(program: number[]): () => (i: Record<string, number>) => { out: number; pc: number }` — `SeqSpec.model` 그대로 넣을 수 있는 모양. 입력 `{clk, rst, sensor}`, 상승 에지에서만 한 명령 실행, 프로그램 범위 밖 주소는 HLT(0x70)로 본다.
  - `TOY4_PARAMS: string` — `"  localparam LDI = 4'd0, ADD = 4'd1, SUB = 4'd2, OUT = 4'd3, JMP = 4'd4, JZ = 4'd5, IN = 4'd6, HLT = 4'd7;\n"`
  - `romCases(program: number[]): string` — `      4'd${k}: data = {NAME, 4'd${n}};\n` 줄들(이름으로 적는다; 3-5·3-6 뼈대·답안용)
  - `cpuVerilog(rom: string, exec: string): string` — 모듈 `alu`(3-2와 같은 포트), `rom`(`always @(*) case (addr)` + 위 `rom` 줄 + `default: data = {HLT, 4'd0};`), top `cpu(input clk, input rst, input [3:0] sensor, output reg [3:0] out, output reg [3:0] pc)`를 한 문자열로. `cpu` 안에 `TOY4_PARAMS`, `reg [3:0] a`, `wire [3:0] op, n`, ALU 인스턴스(`alu_op`/`b` 선택은 이미 써 둔 `assign`)와 `always @(posedge clk) if (rst) … else case (op)` + `exec` + `default: pc <= pc;` + `endcase`.
  - `TOY4_EXEC: string` — 모범 실행부 `case` 팔들(스파이크와 같은 동작).

- [ ] **Step 1: 실패하는 테스트 작성** (`toy4.test.ts`)

```ts
test("ins는 {op, n} 바이트", () => { expect(ins("IN")).toBe(0x60); expect(ins("JZ", 5)).toBe(0x55); });
test("넘침은 4비트로 버린다", () => {
  const m = toy4([ins("LDI", 15), ins("ADD", 2), ins("OUT"), ins("SUB", 3), ins("OUT")])();
  // 각 주기 clk 0→1, 첫 주기 rst
  // ... 실행 후 첫 OUT 뒤 out === 1, 두 번째 OUT 뒤 out === 14
});
test("JZ는 A가 0일 때만 점프, HLT에서 pc가 멈춘다", ...);
test("rst 에지에 pc·a·out이 0", ...);
test("모범 CPU Verilog가 TS 모델과 클럭마다 같다(카운트다운·센서 프로그램 둘)", () => {
  // compile(cpuVerilog(romCases(p), TOY4_EXEC), "cpu").sim()와 toy4(p)()를 clocked 40주기(첫 주기 rst, sensor 0/1 섞기)로 비교
});
test("{IN, 4'd0}는 8비트 0x60", () => {
  // TOY4_PARAMS를 넣은 작은 모듈: output [7:0] y; assign y = {IN, 4'd0}; → run({}).y === 0x60
});
```

넘침 테스트 기대값: LDI 15 → ADD 2 → A = 1 → OUT = 1; SUB 3 → A = 14 → OUT = 14.

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lessons/ch3/toy4.test.ts` → FAIL(모듈 없음)
- [ ] **Step 3: `toy4.ts` 구현** — 위 Interfaces 그대로. 모델은 2-9처럼 `last` clk로 에지를 잡는다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS. 이어서 `npx vitest run` 전체 PASS.
- [ ] **Step 5: 커밋** — `feat(ch3): toy4 instruction set, model and CPU generator`

### Task 2: 순차 채점의 "상관없음" 칸

**Files:**
- Modify: `src/grader/electric.ts` (`TimeRow.expect?: (number | undefined)[]`)
- Modify: `src/grader/verilog.ts` (seq 분기: `bad`와 `total`)
- Modify: `src/ui/timeline.ts` (셀 표시)
- Modify: `src/lessons/content.test.ts` (폭 검사에서 `undefined` 건너뜀)
- Test: `src/grader/verilog.test.ts`, `src/ui/timeline.test.ts`(없으면 만든다; jsdom이 없으므로 `renderTimeline` 대신 순수 함수만 시험 — 아래 참고)

**Interfaces:**
- Produces: 순차 모델이 출력 키 값으로 `undefined`를 돌려주면 그 칸은 `bad = false`. `VerilogGrade.total` = (from 이후) 기대값이 하나라도 정의된 단계 수. 타임라인 셀: 기대값이 `undefined`인 출력 칸은 class `dc`, title `"상관없음"`.

- [ ] **Step 1: 실패하는 테스트** (`verilog.test.ts`)

```ts
test("모델이 undefined를 준 칸은 채점하지 않고 total에서도 뺀다", () => {
  // 1비트 출력 y = 0으로 고정된 순차 모듈, 6주기(12단계), from 0
  // model: 앞 8단계는 { y: undefined }(틀린 값 1이라도 무시), 뒤 4단계는 { y: 0 }
  // → passed === true, total === 4
  // model 뒤 4단계를 { y: 1 }로 → passed === false
});
```

타임라인: `cellInfo(v, expect, bad): { cls: string; title: string; text: string }`를 `timeline.ts`에서 export하고 테스트한다 — `cellInfo(1, undefined, false)` → `{ cls: "tl-cell v1 dc", title: "상관없음", text: "1" }`; 기대값 있는 경우는 지금과 같은 결과(`기대 0`, 틀리면 `1→0`).

- [ ] **Step 2: 실패 확인** — `npx vitest run src/grader/verilog.test.ts src/ui/timeline.test.ts` → FAIL
- [ ] **Step 3: 구현** — `bad: values.map((v, k) => k >= from && expect[k] !== undefined && v !== expect[k])`; `total`은 위 정의; `renderTimeline`이 `cellInfo`를 쓰게; `styles.css`에 `.tl-cell.dc { opacity: .45 }` 한 줄. `content.test.ts` 폭 검사: `if (o[p.name] !== undefined) expect(...)`.
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, 전체 `npx vitest run` PASS(기존 단원 결과 그대로).
- [ ] **Step 5: 커밋** — `feat(grader): don't-care cells in sequential grading`

### Task 3: 용어집 + 3-1 메모리

**Files:**
- Modify: `src/lessons/glossary.ts` — 추가: `memory`, `address`, `rom`, `ram`, `alu`, `instruction`, `opcode`, `pc`, `cpu`, `accumulator`, `mcu`, `firmware`, `fetch-decode-execute`(term·short는 기존 항목 말투로)
- Create: `src/lessons/ch3/3-1-memory.ts`
- Modify: `src/lessons/index.ts` (import, `LESSONS` 끝에 추가)

**Interfaces:**
- Consumes: `clocked` (`src/lessons/seq.ts`)
- Produces: `lesson` (id `"3-1"`, chapter 3)

과제 ① 조합 ROM: top `melody(input [3:0] addr, output [7:0] note)` — `always @(*) case (addr)`; `spec`은 TS 배열 표(16칸, 의뢰서에 적힌 값). 오답: 주소 하나 밀린 표, `default` 빠져 남은 칸이 다른 값.
과제 ② 순차 RAM 4칸: top `locker(input clk, input rst, input we, input [1:0] addr, input [3:0] din, output [3:0] dout)` — 레지스터 r0~r3, `we`면 에지에서 `addr` 칸에 씀, `dout`은 지금 `addr` 칸을 바로 읽음(조합), rst면 네 칸 0. 각본 ≥ 16주기(쓰기·읽기 섞고 같은 칸 덮어쓰기 포함). 오답: we 무시하고 늘 씀, 읽기가 r0 고정, 쓰기 주소 하나 밀림.
개념 카드에 "실제 Verilog는 `reg [3:0] mem [0:3]` 같은 배열로 쓰지만 이 앱에서는 레지스터를 풀어 쓴다"를 넣는다.

- [ ] **Step 1: RED** — 단원 파일을 `reference: <skeleton과 같은 문자열>`로 두고 `LESSONS`에 등록, `npx vitest run src/lessons/content.test.ts` → "모범 답안은 통과한다" FAIL(3-1 두 과제)
- [ ] **Step 2: GREEN** — 모범 답안 작성 → content.test PASS, 전체 PASS
- [ ] **Step 3: 개인정보 점검 후 커밋** — `feat(ch3): 3-1 memory lesson`

### Task 4: 3-2 ALU, 3-3 명령어

**Files:**
- Create: `src/lessons/ch3/3-2-alu.ts`, `src/lessons/ch3/3-3-instruction.ts`
- Modify: `src/lessons/index.ts`

**Interfaces:**
- Consumes: `TOY4_OPS`, `ins` (Task 1)
- Produces: 3-2의 `alu` 포트는 Task 1 `cpuVerilog`의 `alu` 모듈과 같다: `alu(input [3:0] a, input [3:0] b, input [1:0] op, output [3:0] y, output zero)`, op 0 = b, 1 = a+b, 2 = a−b, 3 = a (4비트), `zero = (y == 0)`.

3-3 top `decoder(input [7:0] ins, output [1:0] alu_op, output use_sensor, output write_a, output write_out, output jump, output jz)`. TS `spec` 표(op = ins[7:4]):

| op | alu_op | use_sensor | write_a | write_out | jump | jz |
|---|---|---|---|---|---|---|
| 0 LDI | 0 | 0 | 1 | 0 | 0 | 0 |
| 1 ADD | 1 | 0 | 1 | 0 | 0 | 0 |
| 2 SUB | 2 | 0 | 1 | 0 | 0 | 0 |
| 3 OUT | 3 | 0 | 0 | 1 | 0 | 0 |
| 4 JMP | 3 | 0 | 0 | 0 | 1 | 0 |
| 5 JZ | 3 | 0 | 0 | 0 | 0 | 1 |
| 6 IN | 0 | 1 | 1 | 0 | 0 | 0 |
| 7~15 | 3 | 0 | 0 | 0 | 0 | 0 |

오답 예: 3-2 ADD/SUB 바꿈, zero를 a로 판단; 3-3 IN의 use_sensor 빠짐, JZ를 jump로, HLT(8~15)를 default 없이 남김.
3-3 퀴즈에 "0x15는 어떤 명령?(ADD 5)" 같은 해석 문항.

- [ ] **Step 1: RED** — 두 단원 등록(reference = skeleton) → content.test FAIL
- [ ] **Step 2: GREEN** — 모범 답안 → PASS, 전체 PASS
- [ ] **Step 3: 커밋** — `feat(ch3): 3-2 ALU and 3-3 instruction decoder lessons`

### Task 5: 3-4 프로그램 카운터

**Files:** Create `src/lessons/ch3/3-4-program-counter.ts`; Modify `src/lessons/index.ts`

top `pcounter(input clk, input rst, input load, input [3:0] d, output reg [3:0] pc)`: 에지에서 rst → 0, load → d, 아니면 pc+1(15 다음 0). 각본 ≥ 24주기: 15→0 넘김, load 몇 번, 중간 rst 한 번. 오답: load 무시, rst보다 load 우선, +1 대신 그대로. 카드에서 2-6 카운터와 잇는다.

- [ ] **Step 1: RED** → **Step 2: GREEN** (Task 3과 같은 방식) → **Step 3: 커밋** `feat(ch3): 3-4 program counter lesson`

### Task 6: 3-5 4비트 CPU

**Files:** Create `src/lessons/ch3/3-5-cpu.ts`; Modify `src/lessons/index.ts`

**Interfaces:**
- Consumes: `cpuVerilog`, `romCases`, `TOY4_EXEC`, `toy4`, `ins` (Task 1)

고정 프로그램(카운트다운): `[LDI 3, OUT, JZ 5, SUB 1, JMP 1, HLT]` → out 3, 2, 1, 0 뒤 멈춤.
- `skeleton = cpuVerilog(romCases(P), "      // LDI: ... 명령마다 한 줄씩\n")` (op별 주석 8줄)
- `reference = cpuVerilog(romCases(P), TOY4_EXEC)`
- `seq: { from: 1, steps: clocked(30주기, 첫 주기와 22번째 주기 rst = 1, sensor 0), model: toy4(P) }`
- 입력 `clk, rst, sensor[4]`, 출력 `out[4], pc[4]`.
- 오답: JZ 조건 뒤집기, JMP를 pc+1로, SUB를 ADD로(각각 `TOY4_EXEC`의 한 줄을 `replace`).
- 카드: fetch → decode → execute 한 바퀴 타임라인 카드(`timeline` 필드, 손으로 쓴 짧은 TimeRow).

- [ ] **Step 1: RED** → **Step 2: GREEN** → **Step 3: 커밋** `feat(ch3): 3-5 4-bit CPU lesson`

### Task 7: 3-6 장난감 로봇 프로그램

**Files:** Create `src/lessons/ch3/3-6-robot.ts`; Modify `src/lessons/index.ts`; Test: `src/lessons/ch3/toy4.test.ts`에 한 개 추가

**Interfaces:**
- Consumes: Task 1 전부, Task 2의 "상관없음"

로봇: OUT bit0 = 왼바퀴, bit1 = 오른바퀴. SENSOR = 0(길 비었음) 또는 1(장애물). 요구: 비었으면 OUT = 3(직진), 장애물이면 OUT = 1(오른쪽으로 돈다), 센서가 바뀌고 10클럭 안에 반응.
- CPU 부분은 3-5 모범과 같다: `skeleton = cpuVerilog("", TOY4_EXEC)`에 ROM 자리 주석(“여기에 4'd0: data = {IN, 4'd0}; 처럼”), `reference = cpuVerilog(romCases(R), TOY4_EXEC)`, `R = [IN, JZ 5, LDI 1, OUT, JMP 0, LDI 3, OUT, JMP 0]`.
- 각본: 구간 6개 × 16주기, 센서 `[0, 1, 0, 1, 1, 0]`, 첫 주기 rst. 
- 모델: 상승 에지를 세어 각 구간의 마지막 4주기(두 단계씩)에만 `out` = 구간 기대값, 그 밖은 `out: undefined`; `pc`는 늘 `undefined`.
- 오답: 뼈대 그대로(전부 HLT), LDI 1/3 바꿈, 마지막 `JMP 0` 빠짐(한 번만 돌고 멈춤), 센서 무시하고 늘 3.
- 추가 테스트(`toy4.test.ts`): "3-6 모델은 구간마다 마지막 4주기만 채점한다" — 모델 출력에서 `out !== undefined`인 단계 수 === 6 × 4 × 2.

- [ ] **Step 1: RED** — 추가 테스트 + 단원 등록(reference = skeleton) → FAIL
- [ ] **Step 2: GREEN** → toy4.test·content.test·전체 PASS
- [ ] **Step 3: 커밋** `feat(ch3): 3-6 robot program lesson`

### Task 8: 3-7 왜 MCU인가 + 마무리

**Files:** Create `src/lessons/ch3/3-7-why-mcu.ts`; Modify `src/lessons/index.ts`; Modify `docs/superpowers/specs/2026-11-21-hw-study-tool-design.md` §5 3장 줄 끝에 `(설계: 2026-11-23-ch3-small-computer-design.md)` 덧붙임

`tasks: []`(2-2와 같음), 카드 3장 이상(CPU만으로는 → MCU = CPU+메모리+GPIO·타이머·ADC 한 칩 → 3-6 ROM 프로그램 = 펌웨어, 5장은 C로), 퀴즈 3문제.

- [ ] **Step 1: RED** — 등록만 하고 quiz를 빈 배열로 → content.test가 퀴즈 개수 규칙에서 FAIL하는지 확인(규칙이 없으면 이 RED는 건너뛰고 ledger에 기록)
- [ ] **Step 2: GREEN** — 카드·퀴즈 채움 → 전체 `npx vitest run`, `npx tsc --noEmit`, `npm run build` PASS
- [ ] **Step 3: 브라우저 확인** — `preview_start {name: "hw-study-dev"}`, 3장 목록에 7단원, 3-5 모범 답안 불러오기→테스트 통과, 3-6에서 회색 "상관없음" 칸이 보이는지 스크린샷
- [ ] **Step 4: 커밋** — `feat(ch3): 3-7 why MCU lesson`
