# M7a: 4장 손잡이·센서·전압 채점 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전기 시뮬레이터에 조작 값(settings)·가변저항·광센서·서미스터·측정 핀·떠 있는 점·전압/켜짐 채점과 슬라이더 UI를 더하고, 4장 단원 4-1 ~ 4-4를 낸다.

**Architecture:** `solve(c, pressed, settings)`에 세 번째 인자를 더하고 새 부품은 모두 저항(가변저항은 저항 둘)으로 찍는다. 채점의 `when`을 `{ pressed?, settings? }`로 바꾸고, 탐·합선 검사는 버튼 조합 × 조작 부품 끝값을 훑는다. 편집기는 실험 모드에서 settings를 들고 다니며 `Sim.frame`에 넘긴다.

**Tech Stack:** TypeScript, Vitest(node, jsdom 없음), 기존 `src/sim/electric`, `src/editor`, `src/grader/electric.ts`.

**Spec:** `docs/superpowers/specs/2026-11-26-ch4-analog-power-design.md` (§5.1, §5.2의 pot·ldr·ntc, §5.4 voltage·state, §5.5, §6의 4-1~4-4, §11의 3·4). M7b(커패시터, 4-5)와 M7c(4-6~4-11)는 별도 계획.

## Global Constraints

- 기존 `C` 상수 값은 바꾸지 않는다. 새 상수는 `C`에 추가. 0~3장 테스트는 결과 그대로 통과해야 한다.
- 채점은 동작(전압·전류·켜짐)만 본다. 다르게 꾸민 맞는 회로가 떨어지면 안 된다.
- 단원 id `4-1`~`4-4`, 파일 `src/lessons/ch4/4-N-<이름>.ts`, `LESSONS` 끝에 순서대로. `minutes` 20 이하, 퀴즈 2~3, 오답 회로 ≥ 1.
- 온도 슬라이더 0~50 °C(기본 25), 밝기 0~100(기본 50), 가변저항 손잡이 0~1(기본 0.5).
- 공개 저장소: 개인정보 금지, 커밋 전 `git diff --cached | grep -i -E -f .git/info/private-patterns`로 점검(패턴은 어디에도 적지 않는다).
- 커밋: `git -c user.name=yusu06 -c user.email=yusu06@users.noreply.github.com commit`, 끝줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 백슬래시가 든 편집은 Bash heredoc 금지(Edit/Write 또는 스크래치패드 `red.py`).

## 계획에서 더한 결정 (스펙에 없던 것)

- **측정 핀 `probe`**: 핀 하나(`p`), 전류가 흐르지 않는 부품("MCU 입력 핀"). 4장 과제의 `preset`에 잠금으로 두고 `voltage` 검사는 `probe.p`를 잰다. 버튼·가변저항을 어느 방향으로 꽂든 같은 점을 재게 하려는 것(스펙 §2 반목표 "다르게 꾸민 맞는 회로").
- `voltage` 검사의 `ref`는 이번 마일스톤에서는 생략 가능(접지 기준만 써도 4-1~4-4가 된다). 타입에는 둔다.

## Review Focus

1. 조작 부품이 있는 회로에서 손잡이를 끝까지 돌리면 LED가 타는 오답 → `noBurn`이 끝값까지 훑어 잡아야 한다. → Task 3 테스트.
2. 측정 핀이 아무 데도 안 이어졌거나 열린 버튼 뒤에만 있으면 "전압이 정해지지 않았어요"로 실패(0 V로 통과하면 안 됨). → Task 2, 3 테스트.
3. 가변저항 손잡이 0 또는 1에서 저항 0이 되어 행렬이 깨지지 않는다(최소 1 Ω). → Task 1 테스트.
4. 기존 `when: { btn: true }` 꼴이 남아 있으면 타입 오류로 드러나야 한다(조용히 무시 금지). → Task 3에서 0-2·0-6·0-7과 테스트를 새 꼴로 고치고 `tsc` 통과.
5. 실험 모드에서 슬라이더를 움직인 뒤 편집 모드로 갔다 와도 회로·저장 데이터가 바뀌지 않는다(settings는 화면 상태). → Task 4 브라우저 확인.

---

### Task 1: settings와 새 부품 pot·ldr·ntc·probe

**Files:**
- Modify: `src/sim/electric/types.ts` (PartKind에 `"pot" | "ldr" | "ntc" | "probe"`, `export type Settings = Record<string, number>`)
- Modify: `src/sim/electric/parts.ts` (PINS: pot `["a","w","b"]`, ldr/ntc `["a","b"]`, probe `["p"]`; C에 `POT_R: 10000, POT_MIN: 1, LDR_DARK: 200000, LDR_BRIGHT: 1000, NTC_R25: 10000, NTC_B: 3950`; `export function sensorR(p: Part, s: Settings): number`)
- Modify: `src/sim/electric/solve.ts` (`solve(c, pressed, settings: Settings = {})`, 스탬프)
- Modify: `src/editor/geometry.ts` (PIN_OFFSET: pot a[-2,0] w[0,1] b[2,0], ldr/ntc 저항과 같게, probe p[0,0])
- Test: `src/sim/electric/solve.test.ts`

**Interfaces:**
- Produces: `Settings`, `sensorR`, `solve(c, pressed, settings?)`. 가변저항 손잡이 = `settings[partId]`(0~1, 기본 0.5), 밝기 `settings.light`(0~100, 기본 50), 온도 `settings.temp`(°C, 기본 25).
- 모델: pot a–w = max(R·pos, 1), w–b = max(R·(1−pos), 1), R = `p.value ?? C.POT_R`. ldr = DARK·(BRIGHT/DARK)^(light/100). ntc = R25·exp(B·(1/(temp+273.15) − 1/298.15)). probe는 아무것도 찍지 않는다.

- [ ] **Step 1: 실패하는 테스트** (`solve.test.ts`, `ckt` 도우미로 회로 구성)

```ts
test("가변저항은 손잡이 위치로 전압을 나눈다", () => {
  // 3 V 전지 +→pot.a, pot.b→−, probe.p ↔ pot.w
  // settings {pot: 0} → probe 0 V(±0.01), {pot: 0.5} → 1.5, {pot: 1} → 3; settings 없음 → 1.5
});
test("손잡이 끝(0·1)에서도 행렬이 풀리고 converged", ...);
test("sensorR: ldr 밝기 0 → 200k, 100 → 1k, ntc 25 °C → 10k, 0 °C > 25k", () => {
  // ntc 0 °C ≈ 33.6k (±1k), 50 °C ≈ 3.6k (±0.3k)
});
test("probe는 전류가 흐르지 않는다(분압 전압을 바꾸지 않음)", ...);
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/sim/electric/solve.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 Interfaces 그대로. `resist`에 ldr·ntc 추가, pot은 `cond` 두 번.
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npx vitest run` 전체 PASS, `npx tsc --noEmit` 통과
- [ ] **Step 5: 커밋** — `feat(sim): settings, pot, ldr, ntc and probe parts`

### Task 2: 떠 있는 점

**Files:**
- Modify: `src/sim/electric/solve.ts` (`Solution.floating: Record<string, boolean>`, 키 = pinKey)
- Modify: `src/editor/adapter.ts` (`pinTip`: 떠 있으면 `"? V (정해지지 않음)"`)
- Test: `src/sim/electric/solve.test.ts`

**Interfaces:**
- Produces: `Solution.floating[pinKey]` — 스펙 §11-4: 수렴한 상태에서 **지금 전도하는** 부품(닫힌 스위치·버튼, 저항·전구·pot·ldr·ntc, 켜진 LED 접합·B–E, 켜진 C–E)만으로 전지 단자 넷에 닿지 못하는 넷이면 true. 전지 단자 넷 자체는 false.

- [ ] **Step 1: 실패하는 테스트**

```ts
test("열린 버튼 뒤의 측정 핀은 떠 있다, 풀업 저항이 있으면 아니다", () => {
  // A: probe.p — btn.a, btn.b — 전지 −  (버튼 안 누름) → floating["probe.p"] === true
  //    누름 → false, nodeV 0
  // B: A + 저항 10k(전지 + ↔ probe.p) → 안 누름 floating false, nodeV ≈ 3
});
test("꺼진 LED 너머의 넷은 떠 있다", ...);
```

- [ ] **Step 2: 실패 확인** → **Step 3: 구현**(전도 간선으로 BFS, 전지 단자 넷에서 출발) → **Step 4: 통과·전체·tsc** → **Step 5: 커밋** `feat(sim): floating node detection`

### Task 3: 채점 — when 새 꼴, voltage·state, 조건 훑기

**Files:**
- Modify: `src/grader/electric.ts`
- Modify: `src/lessons/ch0/0-2-flashlight-led.ts`, `0-6-ones-and-zeros.ts`, `0-7-transistor.ts`, `src/grader/electric.test.ts` (`when: {...}` → `when: { pressed: {...} }`)
- Test: `src/grader/electric.test.ts`

**Interfaces:**
- Consumes: Task 1 `Settings`, `solve(c, pressed, settings)`; Task 2 `floating`
- Produces:
  - `export interface When { pressed?: Pressed; settings?: Settings }`
  - `ElectricCheck` 추가: `{ kind: "voltage"; at: PinRef; ref?: PinRef; min: number; max: number; when: When }`, `{ kind: "state"; part: string; on: boolean; when: When }`; `current.when: When`
  - `gradeElectric(c, checks, inputs)` 시그니처 그대로. 내부 `conditions(c, inputs): When[]` = 버튼 조합 × (회로의 pot마다 0/0.5/1) × (ldr 있으면 light 0/100) × (ntc 있으면 temp 0/50). `noBurn`·`noShort`가 이것을 훑는다. 캐시 키는 `JSON.stringify([pressed 정렬, settings 정렬])`.
  - 메시지: voltage 실패 `"측정 핀 전압이 X V예요(알맞은 범위 a~b V)"`, 떠 있으면 `"측정 핀 전압이 정해지지 않았어요. 어디에도 이어지지 않은 점이 있어요."`; state 실패 `"<조건>일 때 <부품>가 켜져야/꺼져야 해요"`(조건 문구: 밝기·온도·손잡이 %).

- [ ] **Step 1: 실패하는 테스트**

```ts
test("voltage: 범위 안이면 통과, 떠 있으면 실패", ...);
test("state: light 10에서 켜짐, 90에서 꺼짐을 각각 본다", ...);
test("noBurn은 손잡이 끝값까지 훑는다", () => {
  // 3V + → pot.a, pot.w → LED.a, LED.k → −, pot.b 미연결: 손잡이 0이면 a–w = 1 Ω → LED 탐 → noBurn 실패
  // (기본 손잡이 0.5에서는 5 kΩ라 안 탄다: 끝값을 훑지 않으면 놓친다)
  // 같은 회로 + 100 Ω 직렬 → 통과
});
```

- [ ] **Step 2: 실패 확인** → **Step 3: 구현·기존 when 꼴 이전** → **Step 4:** `npx vitest run` 전체 PASS, `npx tsc --noEmit` 통과 → **Step 5: 커밋** `feat(grader): voltage/state checks and settings sweep`

### Task 4: 편집기 — 기호, 슬라이더, settings 전달

**Files:**
- Modify: `src/editor/symbols.ts` (pot: 저항 + 화살표, ldr: 저항 + 빛 화살표 둘, ntc: 저항 + 사선 "−t°", probe: 작은 원 + "IN" 글자; 원본 그림, 표준 회로 기호 모양을 따름)
- Modify: `src/editor/adapter.ts` (`Sim.frame(c, pressed, settings: Settings)`; electricSim은 solve에 넘김; logicSim은 무시; `partTip`: pot은 `"손잡이 NN%"`, ldr·ntc는 저항값 `"12.3 kΩ"`)
- Modify: `src/editor/view.ts` (`let settings: Settings = {}`; 실험 모드에서 pot 탭 → 그 부품 아래 슬라이더(`input type=range` 0~100, `aria-label="손잡이 위치"`); 회로에 ldr/ntc가 있으면 편집기 위 줄에 밝기(0~100)·온도(0~50 °C) 슬라이더; 값이 바뀌면 다시 그림; settings는 저장하지 않음)
- Modify: `src/styles.css` (슬라이더 줄)
- Test: `src/editor/adapter.test.ts`(없으면 생성) — `envKeys(c: Circuit): ("light" | "temp")[]`를 adapter에서 export하고 시험

**Interfaces:**
- Consumes: Task 1 `Settings`, `sensorR`
- Produces: `envKeys`; `Sim.frame` 새 시그니처(호출부 view.ts 2곳 모두 고침)

- [ ] **Step 1: 실패하는 테스트** — `envKeys`: ldr만 → `["light"]`, ntc+ldr → `["light","temp"]`, 없음 → `[]`
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4:** 전체 PASS·tsc·`npm run build`
- [ ] **Step 5: 브라우저 확인** — `preview_start {name: "hw-study-dev"}`, Task 5 이후에 4-1에서 손잡이를 움직이면 probe 핀 툴팁 전압이 바뀌는지, 편집↔실험 전환 뒤 저장된 회로가 그대로인지(Review Focus 5). 화면이 숨겨져 있으면 DOM으로 확인하고 그렇다고 기록.
- [ ] **Step 6: 커밋** — `feat(editor): knob and sensor sliders`

### Task 5: 단원 4-1 볼륨 노브, 4-2 아날로그 스틱

**Files:** Create `src/lessons/ch4/4-1-volume-knob.ts`, `src/lessons/ch4/4-2-joystick.ts`; Modify `src/lessons/index.ts`, `src/lessons/glossary.ts`(추가: `voltage-divider`, `potentiometer`, `analog`, `adc`)

- 4-1: 3 V 전지, 가변저항(id `pot`, 10 kΩ), 측정 핀(id `adc`, 잠금). 요구: 손잡이 0 % → 0 V, 50 % → 1.5 V, 100 % → 3 V(각 ±0.15 V). 검사: `voltage` 세 개(`when.settings.pot` 0, 0.5, 1), `noShort`. 오답: 측정 핀을 pot.a에(손잡이 무관 3 V), 가변저항 양끝을 모두 +에.
- 4-2: 가변저항 `potx`, `poty`, 측정 핀 `ax`, `ay`. 검사: 손잡이 조합 (0,1), (1,0), (0.5,0.5)에서 두 전압. 오답: X·Y 바꿔 연결, 한쪽 끝 미연결(떠 있음).
- 개념 카드: 분압 공식 V = 3 × (아래 저항)/(전체), ADC가 전압을 숫자로 바꾼다(5장 예고).

- [ ] **Step 1: RED** — 두 단원 `reference`를 `preset`과 같은 빈 회로로 두고 등록 → `npx vitest run src/lessons/content.test.ts` "모범 답안" FAIL
- [ ] **Step 2: GREEN** — 모범 회로 → content.test·전체 PASS, tsc
- [ ] **Step 3: 커밋** — `feat(ch4): 4-1 volume knob and 4-2 joystick lessons`

### Task 6: 단원 4-3 풀업/풀다운, 4-4 자동 야간등

**Files:** Create `src/lessons/ch4/4-3-pull-up.ts`, `src/lessons/ch4/4-4-night-light.ts`; Modify `src/lessons/index.ts`, `src/lessons/glossary.ts`(추가: `pull-up`, `pull-down`, `floating`, `ldr`)

- 4-3: 3 V, 버튼 `btn`, 저항 `r`(values [10, 10000]), 측정 핀 `in`. 요구: 안 누름 → 2.7~3 V, 누름 → 0~0.3 V, 누를 때 버튼 전류 ≤ 1 mA. 검사: `voltage` 두 개, `current`(btn, 0~0.001, 누름), `noShort`. 오답: 저항 없음(안 누름 때 떠 있음), 10 Ω(누를 때 300 mA), 풀다운으로 꽂아 반대 동작.
- 4-4: 3 V, 광센서 `ldr`, 저항 `r`(values [1000, 10000, 100000]), 트랜지스터 `q`, LED `led`, LED 저항 `rl`(values [100]). 요구: 밝기 10 → LED 켜짐, 90 → 꺼짐. 검사: `state` 두 개, `noBurn`. 오답: LDR과 저항 자리 바꿈(반대로 켜짐), 베이스 저항 1 kΩ(어디서나 켜짐 — 실제 값으로 확인 후 고름).
- 개념 카드: 떠 있는 입력은 잡음에 흔들린다 → 풀업. LDR은 밝을수록 저항이 작다.

- [ ] **Step 1: RED** (Task 5와 같은 방식) → **Step 2: GREEN** → **Step 3:** 전체 PASS·tsc·build, 브라우저에서 4-4 밝기 슬라이더로 LED가 켜지고 꺼지는지 확인
- [ ] **Step 4: 커밋** — `feat(ch4): 4-3 pull-up and 4-4 night light lessons`
