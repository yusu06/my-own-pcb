/** A x = b를 부분 피벗 가우스 소거로 푼다. 피벗이 0에 가까우면 그 변수는 0으로 둔다. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[best][col])) best = r;
    [M[col], M[best]] = [M[best], M[col]];
    const piv = M[col][col];
    if (Math.abs(piv) < 1e-15) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / piv;
      if (f !== 0) for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-15 ? 0 : row[n] / row[i]));
}
