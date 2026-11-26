# M7b: 4장 커패시터·시간 해석 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전기 시뮬레이터에 커패시터와 시간 해석(후진 오일러)을 더하고, `timing` 채점·실험 모드 실시간 재생을 붙여 단원 4-5 딜레이 램프를 낸다.

**Architecture:** `solve`에 선택 인자 `tr = { dt, vc }`를 더해, 있으면 커패시터를 컨덕턴스 C/Δt + 전류원으로 찍고 없으면(직류) 끊긴 선으로 둔다. `simulateTime`이 구간 각본을 Δt = 10 ms씩 돌며 커패시터 전압을 이어 받는다. 편집기는 회로에 커패시터가 있으면 실험 모드에서 100 ms마다 한 프레임씩 진행한다.

**Tech Stack:** TypeScript, Vitest(node), 기존 `src/sim/electric`, `src/grader/electric.ts`, `src/editor`.

**Spec:** `docs/superpowers/specs/2026-11-26-ch4-analog-power-design.md` (§5.2 cap, §5.3, §5.4 timing, §5.5 재생, §6 4-5, §11-6)

## Global Constraints

- 커패시터가 없는 회로의 결과는 지금과 완전히 같아야 한다(0~4-4 테스트 그대로 통과). `tr`이 없으면 커패시터는 끊긴 선.
- 커패시터 `value`는 µF, Δt = 10 ms(`C.DT`), 시작 전압 0 V.
- `timing` 각본(§11-6): 0.5 s 아무것도 안 누름 → `holdMs` 누름 → 놓고 최대 10 s. `onFor` = 놓은 순간부터 처음 꺼질 때까지 연속 켜짐 시간. 10 s까지 안 꺼지면 "너무 길다"로 실패.
- 재생: 실험 모드에서 실제 시간, 100 ms 프레임마다 10 ms × 10단계.
- 단원 id `4-5`, `LESSONS`에서 `l4_4` 바로 뒤. `minutes` ≤ 20, 퀴즈 2~3, 오답 ≥ 1.
- 공개 저장소 개인정보 점검, 커밋 신원·`Co-Authored-By` 줄, heredoc에 백슬래시 금지(M7a와 같음). 기존 파일을 `cat >`로 덮어쓰지 말 것(덧붙일 때는 `>>`, 새 파일은 Write 도구).

## Review Focus

1. 커패시터를 빼먹은 회로에 `timing` 검사 → 놓자마자 꺼져 "너무 짧다"로 실패(오류·멈춤 없이). → Task 2 테스트.
2. 저항 없이 버튼으로 커패시터를 전지에 바로 잇는 회로 → 순간 합선으로 실패해야 한다(직류 검사만으로는 커패시터가 끊긴 선이라 놓친다). → Task 2 테스트.
3. 커패시터가 없는 회로에서 `solve(c, p, s)`와 `solve(c, p, s, tr)`가 같은 값 → Task 1 테스트.
4. 실험 모드를 나가거나 과제 화면을 떠나면 재생 타이머가 멈춘다(타이머가 쌓이지 않는다). → Task 3 브라우저 확인 + `destroy`에서 정리.
5. 10 s 안에 안 꺼지는 회로가 무한히 돌지 않고 "너무 길다"로 끝난다. → Task 2 테스트.

---

### Task 1: 커패시터 부품과 시간 해석

**Files:**
- Modify: `src/sim/electric/types.ts` (PartKind에 `"cap"`)
- Modify: `src/sim/electric/parts.ts` (PINS `cap: ["a","b"]`, C에 `CAP_UF: 1000, DT: 0.01`)
- Modify: `src/sim/electric/solve.ts`
- Create: `src/sim/electric/time.ts`
- Modify: `src/editor/geometry.ts` (cap 핀 = 저항과 같게)
- Test: `src/sim/electric/time.test.ts`

**Interfaces:**
- Produces:
  - `export interface Transient { dt: number; vc: Record<string, number> }` (solve.ts), vc = 커패시터 id → Va − Vb.
  - `solve(c, pressed, settings = {}, tr?: Transient): Solution`; `Solution.capV: Record<string, number>`(이번 단계 끝의 Va − Vb, 직류면 노드 전압 차).
  - `export interface Segment { ms: number; pressed?: Pressed; settings?: Settings }`
  - `simulateTime(c: Circuit, script: Segment[], dt = C.DT): { t: number; sol: Solution }[]` (time.ts) — 각 단계 끝 시각 t(초)와 해. vc는 0에서 시작해 단계마다 `sol.capV`를 이어 받는다.
- 모델: tr이 있으면 cap a–b에 컨덕턴스 G = C·10⁻⁶/dt, 전류원 G·vc[id]를 a로(b에서). 떠 있는 점 판정에서 tr이 있을 때 cap은 전도, 없으면 끊김.

- [ ] **Step 1: 실패하는 테스트** (`time.test.ts`)

```ts
test("RC 충전: 3 V, 1 kΩ, 1000 µF → 1초 뒤 약 1.9 V", () => {
  // bat.+ → r(1k) → cap.a, cap.b → bat.-; script [{ ms: 1000 }]
  // 마지막 프레임 sol.capV.cap ≈ 1.896 (±0.05), 첫 프레임 < 0.1
});
test("방전: 충전 뒤 전지를 떼는 대신 버튼으로 끊으면 저항으로 줄어든다", () => {
  // bat.+ → btn → r1(100) → cap.a, cap.a → r(1k) → bat.-, cap.b → bat.-
  // [{ ms: 1000, pressed: {btn:true} }, { ms: 1000 }]: 누른 뒤 ≈ 3·1000/1100 ≈ 2.73 V, 놓고 1초 뒤 ≈ 2.73·e^-1 ≈ 1.0 (±0.1)
});
test("커패시터가 없으면 tr이 있어도 직류 해와 같다", ...); // 0-2 LED 회로 nodeV 비교
test("직류 해에서 커패시터는 끊긴 선", ...); // 3 V → cap → LED → −: LED 꺼짐, cap.a 쪽 넷이 floating 아님(전지 단자) / 반대쪽 floating
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/sim/electric/time.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 Interfaces 그대로.
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npx vitest run` 전체 PASS, `npx tsc --noEmit`
- [ ] **Step 5: 커밋** — `feat(sim): capacitor and time-step simulation`

### Task 2: `timing` 채점

**Files:**
- Modify: `src/grader/electric.ts`
- Test: `src/grader/electric.test.ts` (끝에 덧붙임)

**Interfaces:**
- Consumes: Task 1 `simulateTime`, `Segment`
- Produces: `ElectricCheck`에 `{ kind: "timing"; part: string; press: string; holdMs: number; onFor: [number, number] }` (ms). 결과 `CheckResult.timeline`: 250 ms마다 표본 2줄(`press` 0/1, `part` 켜짐 0/1, expect 없음 — 보여 주기만).
- 판정: 각본 `[{ ms: 500 }, { ms: holdMs, pressed: {[press]: true} }, { ms: 10000 }]`. 어느 단계든 `short`이면 "합선! …", 탄 부품이 있으면 "<부품>가 탔어요…", 수렴 실패면 기존 불안정 문구. onFor = 놓은 뒤 첫 꺼짐까지(ms). 놓는 순간 이미 꺼져 있으면 0.
- 메시지: 통과 `"버튼을 놓은 뒤 <부품>가 X.X초 동안 켜져 있어요 (알맞은 범위 a~b초)"`, 짧음 `"…X.X초 만에 꺼져요. 더 오래 켜져 있어야 해요 (…)"`, 10 s까지 안 꺼짐 `"버튼을 놓고 10초가 지나도 <부품>가 꺼지지 않아요 (…)"`.

- [ ] **Step 1: 실패하는 테스트**

```ts
test("timing: 커패시터가 LED를 몇 초 더 켜 둔다", ...);      // Task 4 모범 회로와 같은 꼴, onFor [2000, 5000] 통과
test("timing: 커패시터가 없으면 너무 짧다", ...);            // 같은 회로에서 cap 제거 → ok false, message "만에 꺼져요"
test("timing: 10초 안에 안 꺼지면 너무 길다", ...);          // cap 1000 µF → "꺼지지 않아요"
test("timing: 저항 없이 커패시터를 바로 충전하면 합선", ...); // bat.+ → btn → cap.a 직결 → "합선"
```

- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4:** 전체 PASS·tsc → **Step 5: 커밋** `feat(grader): timing check`

### Task 3: 편집기 — 기호와 실시간 재생

**Files:**
- Modify: `src/editor/symbols.ts` (cap: 평행판 두 개, 원본 그림)
- Modify: `src/editor/adapter.ts` (electricSim을 `createElectricSim()`이 만든 객체로: 안에 커패시터 상태 `{ shape, vc }`. 회로 모양이 바뀌면 vc를 버린다. `Sim`에 선택 메서드 `advance?(c, pressed, settings, ms): void` — 10 ms씩 ms/10 단계 진행. `frame`은 커패시터가 있으면 지금 vc로 `solve(..., { dt: C.DT, vc })`, 결과를 vc에 쓰지 않는다. `reset?(): void` — vc 비움. `partTip`(cap) = `"X.XX V"`)
- Modify: `src/ui/task-circuit.ts` (`electricSim` → `createElectricSim()`; 과제 화면마다 새 상태)
- Modify: `src/editor/view.ts` (실험 모드 진입 시 `sim.reset?.()`; 회로에 cap이 있으면 `setInterval(() => { sim.advance!(st.circuit, pressed, settings, 100); render(); }, 100)`, 편집 모드로 가거나 `destroy()`에서 `clearInterval`)
- Test: `src/editor/adapter.test.ts` (끝에 덧붙임)

**Interfaces:**
- Consumes: Task 1 `solve(…, tr)`, `Solution.capV`, `C.DT`
- Produces: `createElectricSim(): Sim`(기존 `electricSim` 이름은 지우고 호출부를 모두 고친다 — `grep -rn electricSim src`)

- [ ] **Step 1: 실패하는 테스트**

```ts
test("advance: 버튼을 1초 누르면 커패시터 전압이 오른다", () => {
  // sim = createElectricSim(); RC 충전 회로; sim.advance(c, {btn:true}, {}, 1000)
  // sim.frame(c, {btn:true}, {}).partTip(cap) 의 숫자 > 1.5
});
test("reset 뒤에는 다시 0 V", ...);
test("회로 모양이 바뀌면 커패시터 상태를 버린다", ...);
```

- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4:** 전체 PASS·tsc·`npm run build`
- [ ] **Step 5: 커밋** — `feat(editor): capacitor symbol and real-time playback`
- 브라우저 확인은 Task 4에서(단원이 있어야 한다).

### Task 4: 단원 4-5 딜레이 램프

**Files:** Create `src/lessons/ch4/4-5-delay-lamp.ts`; Modify `src/lessons/index.ts`, `src/lessons/glossary.ts`(추가: `capacitor`, `time-constant`)

- 부품: 3 V 전지(잠금), 버튼 `btn`, 충전 저항 `rc`(100 Ω), 커패시터 `cap`(values [100, 220, 1000] µF), 베이스 저항 `rb`(10 kΩ), 트랜지스터 `q`, LED 저항 `rl`(100 Ω), LED `led`.
- 모범: `bat.+ → btn → rc → cap.a`, `cap.b → bat.-`, `cap.a → rb → q.b`, `q.e → bat.-`, `bat.+ → rl → led → q.c`, cap 220 µF.
- 요구: 버튼을 0.5 s 누르면 LED가 켜지고, 놓은 뒤 2~5 s 더 켜져 있다. 검사: `timing`(led, btn, holdMs 500, onFor [2000, 5000]), `noBurn`, `noShort`.
- 오답: 100 µF(너무 짧음), 1000 µF(너무 김), 커패시터 없음, `rc` 없이 버튼 → cap 직결(합선).
- 계산 근거(카드에 쓴다): 방전 시간 상수 τ = rb × C. 220 µF × 10 kΩ = 2.2 s, 꺼지는 시점 ≈ τ × ln(2.3 V ÷ 0.5 V) ≈ 3.4 s. **실제 값은 시뮬레이터로 확인하고, 범위를 벗어나면 커패시터 값 선택지를 조정한 뒤 ledger에 Ruling으로 남긴다.**
- 개념 카드: 커패시터 = 전하를 담는 물통, RC 시간 상수, 트랜지스터가 "남은 물"로 LED를 켠다.

- [ ] **Step 1: RED** — `reference`를 미리 놓인 부품만 있는 빈 회로로 두고 등록 → `npx vitest run src/lessons/content.test.ts` "모범 답안" FAIL
- [ ] **Step 2: GREEN** — 모범 회로 → 전체 PASS, tsc, build
- [ ] **Step 3: 브라우저 확인** — `preview_start {name: "hw-study-dev"}`, 4-5에서 모범 답안 → 테스트 통과·타임라인 표시, 실험 모드에서 버튼을 누르고 놓은 뒤 LED가 몇 초 켜졌다 꺼지는지, 편집 모드로 바꾸면 타이머가 멈추는지(Review Focus 4). 화면이 숨겨져 있으면 DOM으로 확인하고 기록.
- [ ] **Step 4: 커밋** — `feat(ch4): 4-5 delay lamp lesson`
