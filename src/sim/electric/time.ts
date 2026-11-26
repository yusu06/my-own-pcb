import { C } from "./parts";
import { solve, type Solution } from "./solve";
import type { Circuit, Pressed, Settings } from "./types";

/** 각본 한 구간: ms 동안 이 버튼·조작 값을 유지한다 */
export interface Segment {
  ms: number;
  pressed?: Pressed;
  settings?: Settings;
}

/**
 * 시간 해석. dt(초)마다 한 번씩 풀며 커패시터 전압을 다음 단계로 넘긴다(0 V에서 시작).
 * 돌려주는 t는 각 단계가 끝난 시각(초).
 */
export function simulateTime(c: Circuit, script: Segment[], dt: number = C.DT): { t: number; sol: Solution }[] {
  const out: { t: number; sol: Solution }[] = [];
  let vc: Record<string, number> = {};
  let step = 0;
  for (const seg of script) {
    const n = Math.round(seg.ms / 1000 / dt);
    for (let k = 0; k < n; k++) {
      const sol = solve(c, seg.pressed ?? {}, seg.settings ?? {}, { dt, vc });
      vc = sol.capV;
      out.push({ t: ++step * dt, sol });
    }
  }
  return out;
}
