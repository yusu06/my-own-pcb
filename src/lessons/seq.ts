/** 주기마다 clk 0 → 1 두 단계로 편다(1주기 = 상승 에지 한 번) */
export function clocked<T extends Record<string, number>>(cycles: T[]): (T & { clk: number })[] {
  return cycles.flatMap((c) => [{ ...c, clk: 0 }, { ...c, clk: 1 }]);
}
