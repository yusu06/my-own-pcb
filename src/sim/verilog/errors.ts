/** 초보자용 Verilog 오류. 메시지는 항상 "N번째 줄: ..."로 시작한다. */
export class VerilogError extends Error {
  constructor(
    public line: number,
    msg: string,
  ) {
    super(`${line}번째 줄: ${msg}`);
    this.name = "VerilogError";
  }
}

export const UNSUPPORTED = "이 앱에서는 아직 지원하지 않아요.";
