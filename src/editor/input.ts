export type Pt = { x: number; y: number };

export interface GestureHandlers {
  /** 손가락이 닿는 순간(실험 모드의 버튼 누르기용) */
  down(p: Pt): void;
  /** 모든 손가락을 뗐을 때 */
  up(): void;
  tap(p: Pt): void;
  longPress(p: Pt): void;
  /** 끌기 시작 — true를 돌려주면 끌기를 가져가고(부품 이동), false면 화면 이동 */
  dragStart(p: Pt): boolean;
  dragMove(p: Pt): void;
  dragEnd(p: Pt): void;
  pan(dx: number, dy: number): void;
  /** factor = 이번 이동에서의 확대 배율, center = 화면 좌표 */
  pinch(factor: number, center: Pt): void;
}

const TAP_SLOP = 8;
const LONG_MS = 500;

/** Pointer Events로 탭·길게 누르기·끌기·두 손가락 확대를 구분한다. 좌표는 요소 기준 px. */
export function attachGestures(el: HTMLElement | SVGElement, h: GestureHandlers): () => void {
  const pts = new Map<number, Pt>();
  let start: Pt | null = null;
  let moved = false;
  let multi = false;
  let longFired = false;
  let dragging = false;
  let captured = false;
  let last: Pt | null = null;
  let timer: number | undefined;

  const local = (e: PointerEvent): Pt => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pair = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  let prevPair: { d: number; c: Pt } | null = null;

  const onDown = (e: PointerEvent) => {
    (el as Element).setPointerCapture?.(e.pointerId);
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pts.size === 1) {
      start = last = p;
      moved = multi = longFired = dragging = captured = false;
      h.down(p);
      timer = window.setTimeout(() => {
        if (!moved && !multi && pts.size === 1) {
          longFired = true;
          h.longPress(p);
        }
      }, LONG_MS);
    } else {
      multi = true;
      clearTimeout(timer);
      if (dragging && captured) h.dragEnd(last!);
      dragging = false;
      prevPair = pair();
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pts.size >= 2) {
      const cur = pair();
      if (prevPair && prevPair.d > 0) {
        h.pinch(cur.d / prevPair.d, cur.c);
        h.pan(cur.c.x - prevPair.c.x, cur.c.y - prevPair.c.y);
      }
      prevPair = cur;
      return;
    }
    if (multi || !start) return;
    if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < TAP_SLOP) return;
    moved = true;
    clearTimeout(timer);
    if (!dragging) {
      dragging = true;
      captured = h.dragStart(start);
    }
    if (captured) h.dragMove(p);
    else h.pan(p.x - last!.x, p.y - last!.y);
    last = p;
  };

  const onUp = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e);
    pts.delete(e.pointerId);
    if (pts.size === 1) prevPair = null;
    if (pts.size > 0) return;
    clearTimeout(timer);
    if (!multi && !moved && !longFired && e.type === "pointerup") h.tap(p);
    if (dragging && captured) h.dragEnd(p);
    dragging = false;
    h.up();
  };

  el.addEventListener("pointerdown", onDown as EventListener);
  el.addEventListener("pointermove", onMove as EventListener);
  el.addEventListener("pointerup", onUp as EventListener);
  el.addEventListener("pointercancel", onUp as EventListener);
  return () => {
    clearTimeout(timer);
    el.removeEventListener("pointerdown", onDown as EventListener);
    el.removeEventListener("pointermove", onMove as EventListener);
    el.removeEventListener("pointerup", onUp as EventListener);
    el.removeEventListener("pointercancel", onUp as EventListener);
  };
}
