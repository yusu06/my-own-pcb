# M5b 카운터·분주기·시프트 레지스터·FSM + 2장 2-6~2-12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2장 나머지 일곱 단원(카운터, 분주기, 시프트 레지스터, FSM 넷)을 배포해 2장을 끝낸다.

**Architecture:** 그리기 쪽은 게이트 시뮬레이터에 기본 부품 `dff`(D 플립플롭)를 더한다(§6.3 "2-3 이후 D 플립플롭을 기본 부품으로 해금"). 기본 `dff`는 에지 순간의 d를 직전 값으로 한꺼번에 잡기 때문에, 플립플롭을 사슬로 이어도(시프트 레지스터) 부품 순서에 따라 결과가 바뀌지 않는다. NAND로 그린 플립플롭은 M5a 리뷰에서 본 것처럼 0지연 시뮬레이션에서 순서 경쟁이 생길 수 있다. Verilog 엔진은 M5a 그대로 쓴다. 긴 각본(1000주기 분주기)을 위해 타임라인은 일부 구간만 보여 주고, FSM 단원의 상태도는 카드 그림(SVG)으로 그린다.

**Tech Stack:** TypeScript, Vite, Vitest, vite-plugin-pwa. 런타임 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-11-21-hw-study-tool-design.md` (§5 2장, §5.1 과제 유형, §6.3, §6.4, §7-5)

## Global Constraints

- 모든 문구는 한국어, 코드·식별자는 영어. 초보자 눈높이. 단원 문구는 모두 새로 쓴다.
- 공개 저장소: 문서·코드·단원 내용에 사용자 개인 정보(일정, 신상 등)를 쓰지 않는다. push 전 pre-push 검사가 돈다.
- 런타임 의존성 추가 금지.
- §5.1: 2-6, 2-7, 2-8 = Verilog 주 과제 + 부품을 조립하는 짧은 그리기. 2-9~2-12 = Verilog만, 상태도는 개념 카드 그림.
- §6.3: 앱의 클럭 한 칸 = "1ms"(2-4부터).
- 단원 id·부품 이름은 배포 후 바꾸지 않는다. 저장 형식은 그대로(부품 종류 `dff`가 늘 뿐; 저장된 회로·부품함의 검증 목록에 더한다).
- 모든 과제의 reference는 통과, wrong은 각각 실패. 각본 규칙(M5a): 데이터 입력은 clk=0 단계에서 바꾸고, rst는 clk가 올라가는 단계에서만 바꾼다(`clocked(cycles, ["rst"])`). 리셋 입력이 있는 과제는 비동기 리셋으로 써도 통과(content.test가 이미 검사).

## Rulings (계획 단계)

- 기본 부품 `dff`를 새 부품 종류로 둔다(칩이 아니라 시뮬레이터가 직접 계산). 원가는 NAND 9개로 센다(2-3에서 그린 것과 같은 값). 2-5는 손대지 않는다(이미 배포, 플립플롭끼리 사슬이 없다). 틀리면: 학습자가 그린 부품함 `dff` 칩과 기본 `dff`가 둘 다 보여 헷갈릴 수 있다 — 팔레트 이름표를 "D 플립플롭(기본)"으로 구분한다.
- 2-7 분주기는 실제처럼 1kHz → 1Hz(1000주기마다 1주기 tick)로 채점한다. 각본은 약 4000단계라 타임라인은 틀린 곳 근처 48칸만 보여 준다.
- 2-12 전자레인지 종합은 클럭 한 칸을 "1초"로 둔다(2-7 분주기를 거친 클럭이라고 설명). 그래야 각본이 짧다.

## Review Focus

1. 기본 `dff` 사슬(시프트 레지스터)을 어떤 순서로 놓아도 한 에지에 한 칸만 밀린다. → Task 1
2. `dff` 출력이 다른 `dff`의 clk인 사슬(리플 분주기)이 한 입력 단계 안에서 끝까지 반영되고, 끝없는 사슬은 발진 경고로 멈춘다. → Task 1
3. `dff`의 clk나 d가 X(연결 안 됨)면 q가 X로 보이고 크래시가 없다. 저장된 회로·부품함 칩에 `dff`가 있어도 검증(sanitize, validChipDef)을 통과한다. → Task 1
4. 4000단계 각본의 채점이 폰에서 1초 안에 끝나고, 타임라인이 화면을 밀어내지 않는다. → Task 2
5. FSM 과제에서 정의하지 않은 상태 값(예: 2비트에 상태 3개)으로 가는 코드 → default 없이도 채점이 멈추지 않고 틀린 칸으로 보인다. → Task 5(content 각본에 rst 후 모든 상태를 지나는 단계)

---

### Task 1: 게이트 시뮬레이터의 기본 D 플립플롭

**Files:**
- Modify: `src/sim/electric/types.ts`(PartKind에 `"dff"`), `src/sim/electric/parts.ts`(PINS `dff: ["d", "clk", "q"]`), `src/sim/digital/sim.ts`, `src/sim/digital/chips.ts`(LOGIC_KINDS), `src/editor/symbols.ts`, `src/editor/geometry.ts`, `src/editor/view.ts`(논리 부품 목록), `src/editor/sanitize.ts`(허용 종류)
- Test: `src/sim/digital/sim.test.ts`, `src/editor/sanitize.test.ts`, `src/sim/digital/chips.test.ts`

**Interfaces:**
- Produces: 부품 `{ kind: "dff" }`, 핀 d·clk(입력), q(출력). `simulate(c, inputs, lib, prev?)` 시그니처 그대로. `nandCost`는 `dff` 하나를 9로 센다.

- [ ] **Step 1: 실패 테스트** (`sim.test.ts`, describe "기본 D 플립플롭")
  - `상승 에지에서만 d를 잡는다`: in d·clk → dff → out q. 각본 `(d,clk)` = (1,0),(1,1),(0,1),(0,0),(0,1) → q = 0,1,1,1,0 (prev 이어 가기).
  - `시프트 레지스터는 부품 순서와 상관없이 한 칸씩`: in s·clk, dff 3개 사슬(s→f1→f2→f3, 출력 q0 q1 q2). 부품 배열을 6가지 순서로 바꿔도 `clocked([{s:1},{s:0},{s:0},{s:1}])` 결과가 같고, 2주기 뒤 q1 = 첫 s.
  - `리플 분주기`: dff1(d = NOT q1, clk = clk), dff2(d = NOT q2, clk = NOT q1... 즉 q1 하강 = NOT q1 상승) → clk 8주기에 q2가 정확히 2번 바뀐다.
  - `X 처리`: clk 연결 없음 → q가 X, `oscillating === false`.
  - `원가`: dff 하나 = 9.
  - sanitize: `dff` 부품이 든 저장 회로가 그대로 남는다. chips: `dff` 부품이 든 칩 정의가 `validChipDef` 통과.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/sim/digital src/editor/sanitize.test.ts` → FAIL
- [ ] **Step 3: 구현**
  - `flatten`이 `dffs: { d, clk, q }[]`(핀 키)를 모은다. `dff.q`는 구동원(충돌 검사에 포함).
  - `simulate`: 상태 = 각 dff의 q 값(prev의 q 핀 값, 없으면 0)과 직전 clk 값(prev의 clk 핀 값, 없으면 0). 반복: ① q를 고정값으로 두고 NAND 안정화(기존 루프) ② 에지 찾기: 직전 clk가 0이고 지금 clk가 1인 dff들 ③ 그 dff들의 d를 **한꺼번에 먼저 읽고** q에 쓴다 ④ 모든 dff의 직전 clk를 지금 값으로 ⑤ 에지가 없으면 끝, 있으면 ①로. 바퀴 상한 `MAX_STEPS`를 넘으면 `oscillating`. clk가 X면 에지 없음, d가 X면 q = X.
  - 편집기 그림: 사각형 + "D FF" 글자, 왼쪽 d·clk(클럭 핀에 작은 ▷), 오른쪽 q.
- [ ] **Step 4: 통과 확인** — `npx vitest run` → 전부 PASS(1장·2-1~2-5 결과 그대로)
- [ ] **Step 5: 커밋** `feat: built-in D flip-flop part with race-free edge sampling`

### Task 2: 긴 타임라인 구간 보기

**Files:**
- Modify: `src/ui/timeline.ts`
- Test: `src/ui/timeline.test.ts`(순수 함수만)

**Interfaces:**
- Produces: `timelineWindow(rows: TimeRow[], max = 48): { start: number; end: number }` — 틀린 칸이 있으면 첫 틀린 칸이 왼쪽에서 8칸째쯤 오도록, 없으면 처음부터. `renderTimeline`은 이 구간만 그리고, 잘랐으면 위에 "단계 a~b / 전체 n" 표시. 단계 번호는 실제 번호.

- [ ] **Step 1: 실패 테스트** — 길이 10이면 `{0,10}`; 길이 4000에 bad 없음 → `{0,48}`; 첫 bad가 3000 → `{2992, 3040}`; 첫 bad가 3995 → `{3952, 4000}`(끝에 붙음).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/ui/timeline.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 규칙. DOM 쪽은 브라우저에서 확인(Task 4).
- [ ] **Step 4: 통과 확인 + 전체** — `npx vitest run` → PASS
- [ ] **Step 5: 커밋** `feat: show a window of long timelines around the first wrong step`

### Task 3: 상태도 카드 그림

**Files:**
- Modify: `src/lessons/types.ts`(`Card.states?: StateDiagram`), `src/ui/figures.ts`(`stateFigure`), `src/ui/lesson.ts`(카드에 그림)
- Test: `src/ui/figures.test.ts`(순수 배치 함수)

**Interfaces:**
- Produces: `interface StateDiagram { nodes: { id: string; label: string; x: number; y: number }[]; edges: { from: string; to: string; label: string }[] }` (x·y는 0~100 비율). `edgePath(a, b, r): { d: string; lx: number; ly: number }` — 두 원 가장자리를 잇는 곡선 경로와 이름표 위치(자기 자신으로 가는 화살표는 위쪽 고리). `stateFigure(d: StateDiagram): SVGSVGElement`.

- [ ] **Step 1: 실패 테스트** — `edgePath`: 가로로 떨어진 두 노드 → 경로가 `M`으로 시작하고 시작점이 첫 원 가장자리(중심에서 r만큼); 같은 노드 → 고리 경로, 이름표가 노드 위. 반대 방향 두 화살표는 서로 다른 쪽으로 휜다(이름표 y가 다름).
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — 노드 = 원 + 이름, 화살표 = 곡선 + 화살촉 marker + 이름표. 색은 CSS 변수(라이트·다크).
- [ ] **Step 4: 통과 확인** — `npx vitest run` → PASS
- [ ] **Step 5: 커밋** `feat: state diagram figures for FSM concept cards`

### Task 4: 단원 2-6 카운터, 2-7 분주기, 2-8 시프트 레지스터

**Files:**
- Create: `src/lessons/ch2/2-6-microwave-timer.ts`, `2-7-one-second.ts`, `2-8-led-sign.ts`
- Modify: `src/lessons/index.ts`, `src/lessons/glossary.ts`(counter, divider, shift-register, overflow)

**Interfaces:**
- Consumes: 기본 `dff` 부품(Task 1, 팔레트 `{ id: "dff", kind: "dff", label: "D 플립플롭(기본)", multi: true }`), `clocked`, `seq`.

단원 내용:
- **2-6 전자레인지 타이머(카운터)**. 그리기: 2비트 동기 업카운터 — dff 2 + 부품함 NOT·XOR(q0 ← NOT q0, q1 ← q1 XOR q0), 출력 q1 q0, 입력 clk만. 기본 dff는 전원 직후 0에서 시작하므로 `from: 0`(리셋 입력 없음). wrong: q1이 q0를 그대로 받음(시프트), XOR 대신 AND. Verilog 주 과제: 다운카운터 `module timer(input clk, input rst, input load, input [5:0] sec_in, output reg [5:0] sec, output done)` — load면 sec <= sec_in, 아니고 sec > 0이면 1 감소, `done = (sec == 0)`. 각본: 리셋 → 5 로드 → 7주기(0에서 멈춤 확인) → 3 로드 중간에 다시 로드. wrong: 0에서 멈추지 않음(63으로 넘어감), load보다 감소가 먼저.
- **2-7 1초 만들기(분주기)**. 그리기: 리플 분주기 — 기본 dff 2개 + NOT 2개로 clk의 1/4 주파수 출력 `slow`. wrong: dff 하나(1/2), NOT 없이 d = q(멈춤). Verilog 주 과제: `module one_second(input clk, input rst, output reg tick)` — 1000주기마다 1주기 동안 tick = 1(카운터 0~999, 10비트). 각본 `clocked` 2100주기, rst 첫 주기. wrong: 1001주기마다(비교 값 1000), 999에서 0으로 안 돌아가 1024 주기.
- **2-8 LED 전광판(시프트 레지스터)**. 그리기: 3비트 시프트 레지스터 — dff 3개, 입력 s·clk, 출력 q0 q1 q2. wrong: 모든 dff의 d를 s에 연결, 사슬 순서 거꾸로. Verilog 주 과제: `module led_sign(input clk, input rst, input s, output reg [7:0] leds)` — 에지마다 `leds <= {leds[6:0], s};`. wrong: 반대 방향 `leds <= {s, leds[7:1]};`, 리셋 없음(rst 주기에 leds가 남음), `leds <= leds << 1;`(s를 안 넣음).
- 퀴즈 각 2~3개(숫자 문제: 1kHz → 1Hz에 필요한 카운터 최댓값 999, 6비트 최댓값 63 등).

- [ ] **Step 1: 2-6 작성·등록** — `npx vitest run src/lessons` → PASS(reference 통과·wrong 실패)
- [ ] **Step 2: 2-7 작성·등록** — 같은 명령 PASS. 4000단계 채점 시간 확인: content.test 해당 케이스가 1초 미만(vitest 출력의 ms).
- [ ] **Step 3: 2-8 작성·등록** — PASS
- [ ] **Step 4: 브라우저 확인**(dev 서버 재시작): 폰 크기에서 2-8 그리기 팔레트에 "D 플립플롭(기본)"이 보이고 놓은 dff에 핀 d·clk·q가 보이는지, 실험 모드에서 clk를 탭할 때마다 한 칸씩 밀리는지. 2-7 Verilog에서 일부러 틀린 코드로 타임라인이 "단계 a~b / 전체 n"으로 잘려 보이는지.
- [ ] **Step 5: 커밋** `feat: chapter 2 lessons 2-6 to 2-8 (counter, divider, shift register)`

### Task 5: 단원 2-9 신호등, 2-10 도어락, 2-11 자판기 (FSM)

**Files:**
- Create: `src/lessons/ch2/2-9-traffic-light.ts`, `2-10-door-lock.ts`, `2-11-vending.ts`
- Modify: `src/lessons/index.ts`, `src/lessons/glossary.ts`(fsm, state, state-diagram)

모두 Verilog만. 개념 카드 하나 이상에 `states` 그림. 상태는 `localparam`으로 이름 붙이기를 가르친다.
- **2-9 신호등**: `module traffic(input clk, input rst, output red, output yellow, output green)` — 초록 4주기 → 노랑 1주기 → 빨강 3주기 반복, 리셋 후 초록. 상태 3개 + 머무는 시간 카운터. wrong: 노랑 없이 초록→빨강, 시간 하나씩 틀림(초록 5주기).
- **2-10 도어락**: `module door_lock(input clk, input rst, input press, input [3:0] key, output unlock)` — 비밀번호 2-5-1을 차례로 누르면(press = 1인 주기의 key) unlock = 1이 1주기. 틀린 숫자면 처음으로(단 틀린 숫자가 2면 ‘첫 숫자 맞음’ 상태로). 각본: 정답, 중간에 틀림, 2-2-5-1(겹침), press = 0일 때 key가 바뀜(무시). wrong: 틀려도 처음으로 안 감, 겹침 처리 없음, press 무시 안 함.
- **2-11 자판기**: `module vending(input clk, input rst, input c100, input c500, output reg vend, output reg [9:0] change)` — 음료 300원. 100원·500원 동전(한 주기에 하나), 300원 이상이 되면 그 주기 뒤 vend = 1 한 주기, change = 넘은 금액, 그리고 0원으로. 상태 = 모은 금액(0/100/200). wrong: 거스름돈 안 줌, 500원을 100원으로 셈.

- [ ] **Step 1~3: 단원마다 작성·등록 → `npx vitest run src/lessons` PASS**
- [ ] **Step 4: 브라우저 확인** — 폰·PC에서 2-9 상태도 카드가 라이트·다크 둘 다 읽히는지.
- [ ] **Step 5: 커밋** `feat: chapter 2 FSM lessons 2-9 to 2-11 (traffic light, door lock, vending machine)`

### Task 6: 단원 2-12 전자레인지 완성(종합)

**Files:**
- Create: `src/lessons/ch2/2-12-microwave.ts`; Modify: `src/lessons/index.ts`

- `module microwave(input clk, input rst, input add, input start, input door, output heat, output beep, output reg [7:0] sec)` — 클럭 한 칸 = 1초. 대기 중 add를 누를 때마다 30초 더하기(최대 240), start를 누르면 동작(door가 닫혔고 sec > 0일 때만), 동작 중 매초 1 감소·heat = 1, 문이 열리면 일시정지(heat = 0, 다시 닫고 start면 이어서), 0이 되면 beep = 1을 3주기, 그다음 대기. 상태도 카드(대기·동작·멈춤·끝) + 2-6 카운터를 다시 쓰는 개념 카드.
- 각본: 30초 두 번 → 시작 → 중간에 문 열기·닫기·시작 → 끝까지 → 삐 3번. wrong: 문 열려도 계속 가열, 삐 1번, 최대 240 없음.

- [ ] **Step 1: 작성·등록 → `npx vitest run` PASS**
- [ ] **Step 2: 브라우저로 2-12 끝까지 통과 확인 후 홈에서 2장 진행 표시 확인**
- [ ] **Step 3: 커밋** `feat: chapter 2 capstone 2-12 (microwave)`

### Task 7: 마무리

- [ ] 최종 리뷰(새 컨텍스트, opus) → Critical/Important 수정(TDD) → main 병합 → push(pre-push 검사 통과) → 배포 번들에 `door_lock` 확인.
