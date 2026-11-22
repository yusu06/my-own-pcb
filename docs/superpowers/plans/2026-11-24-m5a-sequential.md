# M5a 순차 회로 엔진 + 2장 2-1~2-5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기억하는 회로(래치·플립플롭·레지스터)를 그리기와 Verilog로 만들고 타임라인(시간 순서) 테스트로 채점받게 하고, 2장 앞 다섯 단원(2-1~2-5)을 배포한다.

**Architecture:** 게이트 시뮬레이터는 NAND를 한 개씩 차례로 갱신(제자리 갱신)해 래치가 대칭 발진 없이 자리 잡게 하고, 편집기와 채점기는 이전 넷 값(`prev`)을 다음 계산에 넘겨 상태를 이어 간다. Verilog 해석기는 `always @(posedge clk [or posedge rst])`를 받아 상태를 가진 `Design.sim()`을 만든다: 입력을 바꿀 때마다 조합 로직을 안정시키고, 0→1로 바뀐 에지 신호가 있는 블록을 실행(논블로킹은 모았다가 한꺼번에 반영)한 뒤 다시 안정시킨다. 순차 과제는 입력 각본(`steps`)과 TS로 따로 쓴 상태 모델(`model`)로 기대값을 만들고, 결과를 신호×시간 표(타임라인)로 보여 준다.

**Tech Stack:** TypeScript, Vite, Vitest, vite-plugin-pwa. 런타임 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-11-21-hw-study-tool-design.md` (§5 2장, §5.1 과제 유형, §6.3 디지털 시뮬레이터·Verilog 해석기, §6.4 TestSpec, §7-5, §8)

## Global Constraints

- 모든 문구는 한국어, 코드·식별자는 영어. 초보자 눈높이.
- 공개 저장소: 문서·코드·단원 내용에 사용자 개인 정보(일정, 신상 등)를 쓰지 않는다. push 전 pre-push 검사가 돈다.
- 런타임 의존성 추가 금지.
- §6.3: 래치를 위해 피드백 루프를 허용하고, 일정 횟수 안에 안정되지 않으면 "발진" 오류.
- §6.3: `always @(posedge clk)`(필요하면 `or posedge rst`), 블로킹 `=`과 논블로킹 `<=`. 클럭 상승 에지에서는 posedge 블록을 모두 평가하되 논블로킹 대입은 모았다가 한꺼번에 반영.
- §6.4: 순차 회로 테스트는 클럭 단계별 (입력, 기대 출력) 목록.
- §6.3 2-4: 앱의 클럭 한 칸 = "1ms". 바운스 각본으로 출력이 한 번만 바뀌는지 확인.
- §5.1: 2-1, 2-3, 2-5 = 그리기 + Verilog. 2-2 = 퀴즈 + 클럭 타임라인 관찰(채점은 퀴즈). 2-4 = Verilog만.
- 단원 id·부품 이름은 배포 후 바꾸지 않는다. 저장 형식 변경 없음(작업 값에 회로/문자열을 넣을 뿐).
- 모든 과제의 reference는 통과, wrong은 각각 실패(content.test가 검증).

## Rulings (계획 단계)

- M5를 둘로 나눈다: M5a = 엔진 + 2-1~2-5, M5b = 2-6~2-12(카운터·분주기·시프트 레지스터·FSM 4개). 엔진을 먼저 배포해 실제로 써 보고 M5b 단원을 쓴다. 틀리면: 2장 후반 배포가 한 번 더 늦어진다.
- 클럭은 새 부품 종류를 만들지 않고, id가 `clk`인 `in` 부품(이름표 "클럭")으로 둔다. 편집기에서는 사용자가 직접 탭해 에지를 만든다. 틀리면: 자동으로 깜빡이는 클럭 표시가 없다(2-2에서 그림으로 보충).
- D 플립플롭은 2-3에서 그린 회로를 부품함 `dff`로 저장해 쓴다(기본 부품 = 모범 답안). 별도 내장 부품은 만들지 않는다(§6.6 부품함 방식과 같게).
- 전원을 켠 직후 상태는 모두 0에서 시작해 자리 잡은 값이다. 단원 각본은 처음에 반드시 리셋/설정 단계를 넣어 이 값에 기대지 않는다(content.test가 첫 단계 출력을 검사하지 않도록 `from` 필드로 검사 시작 단계를 정한다).

## Review Focus

1. 홀수 개 NOT 고리(링 발진기)는 제자리 갱신에서도 계속 바뀐다 → 여전히 "발진" 오류. 1장 조합 회로 결과는 그대로. → Task 1
2. SR 래치에 S·R을 동시에 0으로 넣었다 동시에 1로 풀기 → 멈춤 없이 0 또는 1 중 하나로 자리 잡거나 발진 안내. 크래시·무한 루프 없음. → Task 1
3. posedge 블록이 만든 신호가 또 다른 posedge 블록의 클럭이 되는 연쇄(분주기) → 한 입력 단계 안에서 차례로 반영, 끝없는 연쇄는 정해진 횟수 뒤 오류. → Task 3
4. 같은 reg를 posedge 블록과 always @(*) 두 곳에서 대입, posedge 블록 안에서 wire에 대입, 에지 신호가 입력도 아닌 미구동 신호 → 정적 검사 오류. → Task 3
5. 편집기에서 칩(부품함 부품)을 지우거나 회로를 고친 뒤에도 이전 넷 값이 남아 엉뚱한 상태가 보임 → 회로 구조가 바뀌면 `prev`를 버린다. → Task 2

---

### Task 1: 제자리 갱신 게이트 시뮬레이터

**Files:**
- Modify: `src/sim/digital/sim.ts` (`simulate`의 반복 루프)
- Test: `src/sim/digital/sim.test.ts`

**Interfaces:**
- Consumes: 기존 `simulate(c, inputs, lib, prev?)`.
- Produces: 같은 시그니처. `prev`(이전 결과의 `net`)를 넘기면 그 값에서 출발한다.

- [ ] **Step 1: 실패 테스트**
  - `SR 래치는 설정·유지·리셋된다`: NAND 2개 교차 연결(입력 `s_n`, `r_n`, 출력 `q`). `s_n=0,r_n=1` → q=1; 그 net을 prev로 `s_n=1,r_n=1` → q=1(유지); `s_n=1,r_n=0` → q=0; 다시 `1,1` → q=0. 각 결과 `oscillating === false`.
  - `래치는 prev 없이도 발진하지 않고 자리 잡는다`: 같은 회로 `s_n=1,r_n=1`, prev 없음 → `oscillating === false`, q는 0 또는 1.
  - `S·R 동시 해제도 멈추지 않는다`: `s_n=0,r_n=0` 다음 그 net을 prev로 `1,1` → 결과가 돌아오고(시간 제한 안), oscillating이 false면 q ∈ {0,1}.
  - `NOT 하나 고리는 여전히 발진`: NAND의 두 입력을 자기 출력에 연결 → `oscillating === true`.
- [ ] **Step 2: 실행해 실패 확인** — `npx vitest run src/sim/digital/sim.test.ts` → 첫 두 테스트 FAIL(동시 갱신이라 대칭 발진)
- [ ] **Step 3: 구현** — 한 바퀴에서 NAND를 회로 순서대로 하나씩 계산해 `val`에 바로 쓴다(새 Map 복사 대신). 바퀴마다 `setFixed`. 한 바퀴 동안 아무 값도 안 바뀌면 안정. `MAX_STEPS`는 그대로.
- [ ] **Step 4: 전체 실행** — `npx vitest run` → 전부 PASS(1장 reference·wrong 결과가 그대로인지 content.test가 확인)
- [ ] **Step 5: 커밋** `feat: settle gate feedback loops one gate at a time so latches hold`

### Task 2: 그리기 과제의 타임라인 테스트와 상태 유지

**Files:**
- Modify: `src/lessons/types.ts` (`LogicTask.seq`), `src/grader/logic.ts`, `src/editor/adapter.ts` (`logicSim`), `src/ui/task-circuit.ts`
- Create: `src/ui/timeline.ts` (`renderTimeline`)
- Test: `src/grader/logic.test.ts`, `src/ui/timeline.test.ts`

**Interfaces:**
- Produces:
  - `interface SeqSpec<V> { steps: Record<string, V>[]; model(): (i: Record<string, V>) => Record<string, V>; from?: number }` (`from` = 이 단계부터 출력 검사, 기본 0) — `types.ts`에서 export.
  - `LogicTask.seq?: SeqSpec<0 | 1>`. `seq`가 있으면 `expect`는 `[]`.
  - `clocked(cycles: Record<string, number>[]): Record<string, number>[]` — 각 항목을 `{...c, clk: 0}`, `{...c, clk: 1}` 두 단계로 편다. `src/lessons/seq.ts`.
  - `interface TimeRow { name: string; label: string; values: (number | "X")[]; expect?: number[]; bad?: boolean[] }`
  - `gradeLogic`가 `seq` 과제에서 `CheckResult`에 `timeline: TimeRow[]`를 붙인다(입력 줄 + 출력 줄, 출력 줄에 expect/bad).
  - `renderTimeline(rows: TimeRow[]): HTMLElement` — 신호마다 한 줄, 단계마다 한 칸(0/1/X), bad 칸은 `.bad`. 가로 스크롤.

- [ ] **Step 1: 실패 테스트** (`logic.test.ts`)
  - `순차 과제는 단계마다 prev를 이어 채점한다`: SR 래치 과제(steps: 설정→유지→리셋→유지, model = 상태 변수 하나) → reference 통과, NAND 하나를 빼서 q를 `~s_n`로 만든 오답(기억 못 함) → 실패하고 `timeline`의 q 줄 `bad`에 true가 하나 이상.
  - `from 이전 단계는 검사하지 않는다`: model이 첫 단계에 틀린 값을 내도 `from: 1`이면 통과.
  - `clocked`: `clocked([{d:1},{d:0}])` → `[{d:1,clk:0},{d:1,clk:1},{d:0,clk:0},{d:0,clk:1}]`.
  - (`timeline.test.ts`) `renderTimeline`이 행 2개·칸 4개를 만들고 bad 칸에 `.bad`.
- [ ] **Step 2: 실행해 실패 확인** — `npx vitest run src/grader/logic.test.ts src/ui/timeline.test.ts` → FAIL
- [ ] **Step 3: 구현**
  - `gradeLogic`: `seq`면 `steps`를 차례로 `simulate(c, s, lib, prev)`(prev = 직전 `net`), 기대값은 `const m = seq.model()`을 단계마다 호출. 발진·충돌·없는 부품 검사는 조합과 같다. 메시지: 통과 "모든 단계에서 의뢰 조건대로 동작해요.", 실패 "N번째 단계부터 조건과 달라요. 타임라인의 빨간 칸을 확인하세요."
  - `logicSim`: 클로저에 마지막 `net`과 회로 구조 키(부품 id·종류·칩 버전 + 선 목록 JSON)를 두고, 구조가 같으면 prev로 넘긴다(Review Focus 5). 그래야 편집기에서 래치가 기억한다.
  - `task-circuit.ts`: 결과에 `timeline`이 있으면 진리표 대신 `renderTimeline`.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, `npx vitest run` → PASS
- [ ] **Step 5: 커밋** `feat: timeline tests for drawn sequential circuits`

### Task 3: Verilog posedge와 상태를 가진 시뮬레이션

**Files:**
- Modify: `src/sim/verilog/ast.ts` (always에 `edges`), `src/sim/verilog/parser.ts`, `src/sim/verilog/elaborate.ts`
- Test: `src/sim/verilog/parser.test.ts`, `src/sim/verilog/eval.test.ts`

**Interfaces:**
- Produces:
  - AST: `{ t: "always"; edges: string[] | null; body; line }` (null = 조합). Stmt assign에 `nb: boolean`(`<=`이면 true).
  - `Design.sim(): { step(inputs: Record<string, number>): Record<string, number> }` — 새 상태(모든 신호 0). 신호 값은 step 사이에 남는다: posedge 대상뿐 아니라, `always @(*)`가 어떤 경우에 값을 안 넣으면 이전 값이 남아 래치가 된다(실제 Verilog와 같음, 2-1이 쓴다). `Design.run`은 `sim().step` 한 번과 같다(조합 과제 채점은 그대로 매번 새 상태).

- [ ] **Step 1: 실패 테스트**
  - parser: `always @(posedge clk)` → edges `["clk"]`; `@(posedge clk or posedge rst)` → `["clk","rst"]`; `negedge` → "negedge는 지원하지 않아요. posedge만 써요."; `@(posedge clk or d)` → "posedge 블록에는 posedge 신호만". 기존 "2장에서" 테스트는 이 새 기대로 바꾼다.
  - eval `D 플립플롭`: `always @(posedge clk) q <= d;` — step({clk:0,d:1})→q=0, step({clk:1,d:1})→q=1, step({clk:1,d:0})→q=1(에지 없음), step({clk:0,d:0})→1, step({clk:1,d:0})→0.
  - eval `논블로킹은 한꺼번에`: `a <= b; b <= a;`(초기값은 rst로 a=1,b=0) → 에지 한 번에 맞바뀐다.
  - eval `비동기 리셋`: `@(posedge clk or posedge rst) if (rst) q <= 0; else q <= q + 1;` 4비트 — 에지 3번에 3, rst=1 단계에서 클럭 없이 0.
  - eval `연쇄 클럭`: 1비트 `t` 토글(clk) → `t`가 클럭인 두 번째 토글 `u` → clk 에지 4번에 u가 두 번 바뀜.
  - eval 오류: 같은 reg를 posedge와 @(*) 두 곳에서 대입 → "여러 곳"; posedge 안에서 wire 대입 → 기존 reg 안내; 에지 신호가 없는 이름 → "없어요".
  - eval `조합 always의 래치`: `always @(*) if (on) q = 1; else if (off) q = 0;` — step({on:1,off:0})→1, step({0,0})→1(유지), step({0,1})→0, step({0,0})→0.
  - eval `끝없는 연쇄`: `always @(posedge q) q <= ~q;` 같은 자기 클럭 → 멈추지 않고 VerilogError("클럭 연쇄").
- [ ] **Step 2: 실행해 실패 확인** — `npx vitest run src/sim/verilog` → FAIL
- [ ] **Step 3: 구현**
  - 조합 proc와 순차 proc를 나눈다. 순차 proc의 대상 신호는 상태(값이 step 사이에 남음)이고, 구동 검사(`addProc`)는 조합과 똑같이 한다.
  - `step`: 입력 반영 → 조합 안정(기존 루프) → 에지 확인: 각 순차 proc의 edges 중 이전 step(또는 직전 반영) 값 0 → 지금 1인 것이 있으면 실행. 실행은 v 복사본에서 하고 `nb` 대입은 대기 목록에 모았다가 그 바퀴의 블록을 모두 돌린 뒤 한꺼번에 쓴다. 반영 후 다시 조합 안정 → 에지 확인을 반복, `MAX_PASSES` 넘으면 "클럭 연쇄: 클럭 신호가 계속 다시 바뀌어요." 오류.
  - 비동기 리셋은 rst가 0→1인 에지로 블록이 돌고, rst가 1인 채로 clk 에지가 와도 블록 안 `if (rst)`가 처리한다(별도 규칙 없음).
- [ ] **Step 4: 통과 확인** — `npx vitest run` → PASS(1장 Verilog 과제 포함)
- [ ] **Step 5: 커밋** `feat: posedge always blocks with nonblocking updates in the Verilog interpreter`

### Task 4: 순차 Verilog 과제 채점과 화면

**Files:**
- Modify: `src/lessons/types.ts`, `src/grader/verilog.ts`, `src/ui/task-verilog.ts`, `src/lessons/content.test.ts`
- Test: `src/grader/verilog.test.ts`

**Interfaces:**
- Consumes: `SeqSpec`, `TimeRow`, `renderTimeline` (Task 2), `Design.sim` (Task 3).
- Produces: `VerilogTask = VerilogCombTask | VerilogSeqTask` (둘 다 `kind: "verilog"`; Comb은 기존 `spec`, Seq는 `seq: SeqSpec<number>`이고 `spec` 없음). `VerilogGrade.timeline?: TimeRow[]`.

- [ ] **Step 1: 실패 테스트**
  - `순차 Verilog 채점`: D 플립플롭 과제(steps = `clocked` 4주기) → reference 통과·`timeline` 있음, `q = d` 조합 오답 → 실패(에지 사이에서 다름), 포트 검사는 조합과 같다.
  - content.test: Seq 과제마다 reference 통과, wrong 각각 실패, steps의 모든 입력 값이 포트 너비 안, model 출력이 출력 너비 안. 조합 과제 검사는 그대로.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/grader/verilog.test.ts` → FAIL
- [ ] **Step 3: 구현** — `gradeVerilog`가 `"seq" in task`면 `d.sim()`과 `task.seq.model()`을 같은 steps로 돌린다. `rows`는 `[]`, `total` = 검사한 단계 수. 화면은 `timeline`이 있으면 결과표 대신 `renderTimeline`.
- [ ] **Step 4: 통과 확인** — `npx vitest run` → PASS
- [ ] **Step 5: 커밋** `feat: grade sequential Verilog tasks on a timeline`

### Task 5: 2장 단원 2-1~2-5

**Files:**
- Create: `src/lessons/ch2/2-1-toggle-light.ts`, `2-2-clock.ts`, `2-3-d-flipflop.ts`, `2-4-debounce.ts`, `2-5-register.ts`
- Modify: `src/lessons/index.ts`(2장 등록), `src/lessons/glossary.ts`, `src/sim/digital/chips.ts`(`sr`, `dlatch`, `dff` 기본 부품·라벨), `src/lessons/types.ts`(`Card.timeline?`), 카드 렌더링(`src/ui/lesson.ts`)
- Test: `src/lessons/content.test.ts`(자동), `src/sim/digital/chips.test.ts`

**Interfaces:**
- Consumes: Task 2·4의 `seq`, `clocked`, `renderTimeline`.
- Produces: `ChipName`에 `"sr" | "dlatch" | "dff"`. `CHIP_LABEL`: sr = SR 래치, dlatch = D 래치, dff = D 플립플롭. `Card.timeline?: TimeRow[]`(그림 대신 정적 타임라인).

단원 내용(의뢰서 → 개념 → 과제 → 실제 기기 → 퀴즈 2~3개, 모두 원작 문구):
- **2-1 토글 전등(래치)**: "켜기 버튼·끄기 버튼" 조명. 그리기: NAND 2개 SR 래치(입력 s_n·r_n, 0일 때 동작, saveAs `sr`, maxCost 2). Verilog: `always @(*) if (on) q = 1; else if (off) q = 0;` — 1-6에서 "버그"로 배운 래치를 이번엔 일부러 만든다(값을 안 넣은 경우 이전 값이 남는다). wrong: 마지막에 `else q = 0;`을 넣어 기억 못 함.
- **2-2 클럭**: 과제 없음(tasks: []). 개념 카드 3장 중 2장에 `timeline`(clk 8단계, 그리고 clk 에지마다 바뀌는 신호). 퀴즈 3개(주기·주파수 계산 하나 포함: 1ms 주기 → 1000Hz).
- **2-3 D 플립플롭**: 그리기 ① D 래치(NAND 4 + 필요하면 sr 블록, saveAs `dlatch`) ② dlatch 2개 + NOT으로 상승 에지 D 플립플롭(saveAs `dff`). Verilog: `always @(posedge clk) q <= d;` 기본 + 동기 리셋 `rst`.
- **2-4 버튼 두 번 눌림(디바운싱)**: Verilog만. 클럭 한 칸 = 1ms. 입력 `clk`, `btn`, 출력 `pressed`(깨끗한 버튼 상태). 규칙: btn이 같은 값으로 연속 4주기 유지되면 pressed가 그 값을 따른다. 각본: 누름 바운스(1,0,1,1,0,1,1,1,1,1…) → 유지 → 뗌 바운스 → 유지. wrong: 바운스를 그대로 따라감(`pressed <= btn`), 2주기만 기다림.
- **2-5 레지스터**: 그리기: dff 2개 + mux 2개로 2비트 레지스터(입력 en, d1, d0, clk; en=1일 때만 저장). Verilog: 4비트 레지스터 `if (en) q <= d;` + 동기 리셋.
- 용어집: latch, flip-flop, clock, edge, register, debounce, nonblocking (본문에 [[id]]로 링크).

- [ ] **Step 1: chips 테스트 먼저** — `sr`·`dlatch`·`dff` 기본 부품을 순차 각본으로 시험(`chips.test.ts`: dff는 clk 0→1에서만 d를 잡는다). `npx vitest run src/sim/digital/chips.test.ts` → FAIL
- [ ] **Step 2: 기본 부품 구현** → 같은 명령 PASS
- [ ] **Step 3: 단원 5개 작성 + 등록** — `npx vitest run` → content.test가 모든 reference 통과·wrong 실패를 확인하며 PASS
- [ ] **Step 4: 브라우저 확인**(dev 서버 재시작 후): 폰 크기로 2-1 래치를 그려 버튼을 눌렀다 떼도 LED가 유지되는지, 2-4 타임라인이 가로 스크롤되는지, PC 크기로 2-3 dff 저장 후 2-5 팔레트에 dff가 보이는지.
- [ ] **Step 5: 커밋** `feat: chapter 2 lessons 2-1 to 2-5 (latch, clock, flip-flop, debounce, register)`

### Task 6: 마무리

- [ ] 최종 리뷰(새 컨텍스트) → Critical/Important 수정(TDD) → main 병합 → push(pre-push 검사 통과) → 배포 번들에 "D 플립플롭" 문구 확인.
