/**
 * 주기마다 clk 0 → 1 두 단계로 편다(1주기 = 상승 에지 한 번).
 * late에 든 신호(예: rst)는 clk가 올라가는 단계에서만 새 값으로 바뀌고 clk=0 단계에는 앞 주기 값(처음은 0)을 둔다.
 * 그러면 동기 리셋과 비동기 리셋(or posedge rst)이 같은 타임라인을 낸다.
 * 주의: 다른 데이터 입력은 clk=0 단계에서 바뀐다. clk가 올라가는 단계에 데이터를 같이 바꾸면 그린 회로는 부품 순서에 따라 결과가 달라질 수 있다.
 */
export function clocked<T extends Record<string, number>>(cycles: T[], late: string[] = []): (T & { clk: number })[] {
  return cycles.flatMap((c, k) => {
    const before = { ...c, clk: 0 } as T & { clk: number };
    for (const n of late) (before as Record<string, number>)[n] = k > 0 ? cycles[k - 1][n] : 0;
    return [before, { ...c, clk: 1 }];
  });
}
