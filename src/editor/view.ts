import type { CircuitTask, PaletteItem } from "../lessons/types";
import { pinNames } from "../sim/electric/parts";
import type { ChipRef, Circuit, Part, PinRef, Pressed } from "../sim/electric/types";
import type { Frame, Sim } from "./adapter";
import { h } from "../ui/dom";
import { GRID, outward, pinPos, pointsPath, snap, wireRoute } from "./geometry";
import { attachGestures, type Pt } from "./input";
import { editorKey, typingIn } from "./keys";
import { initEditor, reduce, type Action, type EditorState } from "./state";
import { svg } from "./symbols";

export interface EditorHandle {
  el: HTMLElement;
  getCircuit(): Circuit;
  /** 모범 답안 불러오기 등 외부에서 회로를 바꿀 때 (실행 취소 가능) */
  load(c: Circuit): void;
  destroy(): void;
}

const PIN_HIT_PX = 22;
const WIRE_HIT_PX = 10;
const PIN_NAMES: Partial<Record<Part["kind"], Record<string, string>>> = {
  led: { a: "+", k: "−" },
  npn: { b: "B", c: "C", e: "E" },
};
export function mountEditor(opts: {
  task: CircuitTask;
  saved: Circuit | null;
  sim: Sim;
  /** 칩 팔레트 항목을 놓을 때 붙일 참조(부품함 최신 버전, 없으면 기본 부품) */
  chipRef?: (name: string) => ChipRef | null;
  onChange(c: Circuit): void;
  onTest(c: Circuit): void;
}): EditorHandle {
  const { task, sim } = opts;
  const itemOf = (id: string): PaletteItem | undefined =>
    task.palette.find((i) => i.id === id || (i.multi && new RegExp(`^${i.id}\\d+$`).test(id)));
  const labelOf = (p: Part) =>
    p.kind === "nand" || p.kind === "chip"
      ? "" // 기호 안에 이름이 있다
      : (task.kind === "logic" ? task.labels?.[p.id] : undefined) ?? itemOf(p.id)?.label ?? (p.kind === "battery" ? "전지" : p.id.toUpperCase());

  // 마우스가 있는 PC면 안내 문구를 "클릭"으로
  const fine = typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const tapW = fine ? "클릭" : "탭";
  let st: EditorState = initEditor(task.preset, opts.saved);
  let selWire = -1; // 한 번 탭해서 선택한 선 (한 번 더 탭하면 삭제)
  let mode: "edit" | "run" = "edit";
  let pressed: Pressed = {};
  let view = { s: 1, tx: 0, ty: 0 };
  let drag: { id: string; dx: number; dy: number; pos: Pt } | null = null;
  let held: string | null = null; // 실험 모드에서 누르고 있는 버튼

  // ---------- DOM ----------
  const modeBtns = (["edit", "run"] as const).map((m) =>
    h("button", { type: "button", class: "btn", "aria-pressed": "false", onclick: () => setMode(m) }, m === "edit" ? "✏ 편집" : "▶ 실험"),
  );
  const canvas = svg("svg", { class: "circuit", role: "img", "aria-label": "회로 편집 화면" });
  const world = svg("g");
  canvas.append(world);
  const status = h("div", { class: "ed-status", role: "status", "aria-live": "polite" });
  const palette = h("div", { class: "ed-palette" });
  const tools = h(
    "div",
    { class: "ed-tools" },
    h("button", { type: "button", class: "btn", "aria-label": "실행 취소", onclick: () => apply({ t: "undo" }) }, "↶"),
    h("button", { type: "button", class: "btn", "aria-label": "다시 실행", onclick: () => apply({ t: "redo" }) }, "↷"),
    h("button", { type: "button", class: "btn primary", onclick: () => opts.onTest(st.circuit) }, "🧪 테스트 실행"),
  );
  const canvasBox = h("div", { class: "ed-canvas" });
  canvasBox.append(canvas);
  const el = h("div", { class: "editor" }, h("div", { class: "segmented ed-mode" }, ...modeBtns), canvasBox, status, palette, tools);

  // ---------- 좌표 ----------
  const toWorld = (p: Pt): Pt => ({ x: (p.x - view.tx) / view.s, y: (p.y - view.ty) / view.s });
  const toScreen = ([x, y]: [number, number]): Pt => ({ x: x * view.s + view.tx, y: y * view.s + view.ty });

  const shown = (): Circuit =>
    drag ? { ...st.circuit, parts: st.circuit.parts.map((p) => (p.id === drag!.id ? { ...p, x: drag!.pos.x, y: drag!.pos.y } : p)) } : st.circuit;

  function pinAt(p: Pt): PinRef | null {
    let best: { ref: PinRef; d: number } | null = null;
    for (const part of st.circuit.parts) {
      for (const pin of pinNames(part)) {
        const s = toScreen(pinPos(part, pin));
        const d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d <= PIN_HIT_PX && (!best || d < best.d)) best = { ref: { part: part.id, pin }, d };
      }
    }
    return best?.ref ?? null;
  }
  function partAt(p: Pt): Part | null {
    const w = toWorld(p);
    return st.circuit.parts.find((q) => Math.hypot(q.x * GRID - w.x, q.y * GRID - w.y) <= 1.8 * GRID) ?? null;
  }
  function route(c: Circuit, wr: Circuit["wires"][number]): [number, number][] | null {
    const a = c.parts.find((q) => q.id === wr.a.part);
    const b = c.parts.find((q) => q.id === wr.b.part);
    return a && b ? wireRoute(a, wr.a.pin, b, wr.b.pin, c.parts) : null;
  }
  function wireAt(p: Pt): number {
    return st.circuit.wires.findIndex((wr) => {
      const pts = route(st.circuit, wr)?.map(toScreen);
      if (!pts) return false;
      // 가로·세로 선분과의 거리
      return pts.slice(1).some((B, i) => {
        const A = pts[i];
        return (
          p.x >= Math.min(A.x, B.x) - WIRE_HIT_PX && p.x <= Math.max(A.x, B.x) + WIRE_HIT_PX &&
          p.y >= Math.min(A.y, B.y) - WIRE_HIT_PX && p.y <= Math.max(A.y, B.y) + WIRE_HIT_PX
        );
      });
    });
  }

  // ---------- 상태 변경 ----------
  function apply(a: Action) {
    const before = st.circuit;
    selWire = -1; // 선 번호는 편집하면 바뀐다
    st = reduce(st, a);
    if (st.circuit !== before) opts.onChange(st.circuit);
    render();
  }
  function setMode(m: "edit" | "run") {
    mode = m;
    st = { ...st, pending: null };
    closeMenu();
    render();
  }

  let tipTimer: number | undefined;
  const tip = h("div", { class: "ed-tip", hidden: true });
  canvasBox.append(tip);
  function showTip(p: Pt, text: string) {
    tip.textContent = text;
    tip.hidden = false;
    tip.style.left = `${p.x}px`;
    tip.style.top = `${p.y}px`;
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => (tip.hidden = true), 2000);
  }

  let menu: HTMLElement | null = null;
  function closeMenu() {
    menu?.remove();
    menu = null;
  }
  function openMenu(part: Part, p: Pt) {
    closeMenu();
    const item = task.palette.find((i) => i.id === part.id);
    const locked = st.locked.includes(part.id);
    menu = h(
      "div",
      { class: "ed-menu", role: "menu" },
      h("strong", {}, labelOf(part) || itemOf(part.id)?.label || part.kind.toUpperCase()),
      !locked && h("button", { type: "button", class: "btn", onclick: () => (apply({ t: "rotate", id: part.id }), closeMenu()) }, "⟳ 회전"),
      !locked && h("button", { type: "button", class: "btn danger", onclick: () => (apply({ t: "remove", id: part.id }), closeMenu()) }, "🗑 삭제"),
      ...(item?.values ?? []).map((v) =>
        h(
          "button",
          { type: "button", class: "btn" + (part.value === v ? " primary" : ""), onclick: () => (apply({ t: "setValue", id: part.id, value: v }), closeMenu()) },
          v >= 1000 ? `${v / 1000}kΩ` : `${v}Ω`,
        ),
      ),
      h("button", { type: "button", class: "btn ghost", onclick: closeMenu }, "닫기"),
    );
    menu.style.left = `${Math.min(p.x, canvasBox.clientWidth - 180)}px`;
    menu.style.top = `${p.y}px`;
    canvasBox.append(menu);
  }

  /** 화면에 보이면서 다른 부품과 겹치지 않는, 가운데에서 가장 가까운 칸 */
  function freeSpot(): [number, number] {
    const w = canvasBox.clientWidth;
    const hgt = canvasBox.clientHeight;
    const c = toWorld({ x: w / 2, y: hgt / 2 });
    const [cx, cy] = [snap(c.x), snap(c.y)];
    const free = (x: number, y: number) => !st.circuit.parts.some((q) => Math.abs(q.x - x) < 5 && Math.abs(q.y - y) < 4);
    const visible = (x: number, y: number) => {
      const a = toScreen([(x - 3) * GRID, (y - 2) * GRID]);
      const b = toScreen([(x + 3) * GRID, (y + 2) * GRID]);
      return a.x >= 0 && a.y >= 0 && b.x <= w && b.y <= hgt;
    };
    const cands: [number, number][] = [];
    for (let dy = -10; dy <= 10; dy += 5) for (let dx = -12; dx <= 12; dx += 6) cands.push([cx + dx, cy + dy]);
    cands.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy));
    return cands.find(([x, y]) => free(x, y) && visible(x, y)) ?? cands.find(([x, y]) => free(x, y)) ?? [cx, cy];
  }

  // ---------- 그리기 ----------
  function render() {
    const c = shown();
    const fr = sim.frame(c, pressed);
    world.setAttribute("transform", `translate(${view.tx} ${view.ty}) scale(${view.s})`);
    world.replaceChildren();
    c.wires.forEach((wr, i) => {
      const pts = route(c, wr);
      if (!pts) return;
      world.append(svg("path", { d: pointsPath(pts), class: `wire ${fr.wireClass(wr)}` + (i === selWire ? " selected" : "") }));
    });
    for (const p of c.parts) {
      const g = fr.part(p, !!pressed[p.id]);
      const label = svg("text", { x: 0, y: p.kind === "npn" ? 0 : 34, class: "part-label", "text-anchor": "middle" });
      label.textContent = labelOf(p) + (p.kind === "resistor" && p.value ? ` ${p.value >= 1000 ? `${p.value / 1000}k` : p.value}Ω` : "");
      if (p.kind === "npn") label.setAttribute("transform", "translate(0 52)");
      g.append(label);
      world.append(g);
      // 방향이 중요한 핀 이름: 회전해도 글자가 똑바로 보이게 부품 그룹 밖(월드)에 쓴다
      for (const [pin, text] of Object.entries(PIN_NAMES[p.kind] ?? {})) {
        const [x, y] = pinPos(p, pin);
        const vertical = outward(p, pin)[0] === 0; // 선이 세로로 나가면 글자는 옆에
        const t = svg("text", { x: vertical ? x + 11 : x, y: vertical ? y + 4 : y - 9, class: "pin-name", "text-anchor": "middle" });
        t.textContent = text;
        world.append(t);
      }
    }
    if (st.pending) {
      const part = c.parts.find((q) => q.id === st.pending!.part);
      if (part) {
        const [x, y] = pinPos(part, st.pending.pin);
        world.append(svg("circle", { cx: x, cy: y, r: 10, class: "pin-pending" }));
      }
    }

    modeBtns.forEach((b, i) => {
      const on = (i === 0 ? "edit" : "run") === mode;
      b.classList.toggle("primary", on);
      b.setAttribute("aria-pressed", String(on));
    });
    const warn = fr.warning();
    status.className = "ed-status" + (warn ? " bad" : "");
    status.textContent =
      warn ??
      (mode === "run"
        ? sim.runHelp
        : st.pending
          ? `연결할 다른 핀을 ${tapW}하세요. (같은 핀을 다시 누르거나 Esc면 취소)`
          : selWire >= 0
            ? `선택한 선을 한 번 더 ${tapW}하면 지워요${fine ? " (Delete 키도 돼요)" : ""}. 빈 곳을 ${tapW}하면 취소.`
            : fine
              ? "핀을 클릭해 선을 이어요. 부품은 끌어서 옮기고, 우클릭하면 회전·삭제. 휠로 확대, Ctrl+Z 취소, Ctrl+Enter 테스트."
              : "핀을 탭해 선을 이어요. 부품은 끌어서 옮기고, 길게 누르면 회전·삭제.");

    const left = task.palette.filter((i) => i.multi || !st.circuit.parts.some((p) => p.id === i.id));
    const place = (i: PaletteItem) => {
      const chip = i.chip ? opts.chipRef?.(i.chip) ?? undefined : undefined;
      if (i.kind === "chip" && !chip) return; // 부품을 찾을 수 없으면 놓지 않는다
      const [x, y] = freeSpot();
      apply({ t: "place", item: i, x, y, chip });
    };
    palette.replaceChildren(
      ...(mode === "edit" ? left.map((i) => h("button", { type: "button", class: "btn", onclick: () => place(i) }, `+ ${i.label}`)) : []),
    );
    palette.hidden = mode !== "edit" || left.length === 0;
    lastFrame = fr;
  }
  let lastFrame: Frame = sim.frame(st.circuit, pressed);

  // ---------- 처음 화면: 모든 부품이 보이게 ----------
  function fit() {
    const w = canvasBox.clientWidth || 340;
    const hgt = canvasBox.clientHeight || 360;
    const xs = st.circuit.parts.map((p) => p.x * GRID);
    const ys = st.circuit.parts.map((p) => p.y * GRID);
    const [minX, maxX] = xs.length ? [Math.min(...xs) - 80, Math.max(...xs) + 80] : [0, 400];
    const [minY, maxY] = ys.length ? [Math.min(...ys) - 80, Math.max(...ys) + 80] : [0, 300];
    view.s = Math.min(1.2, Math.max(0.5, Math.min(w / (maxX - minX), hgt / (maxY - minY))));
    view.tx = w / 2 - ((minX + maxX) / 2) * view.s;
    view.ty = hgt / 2 - ((minY + maxY) / 2) * view.s;
  }

  // ---------- 입력 ----------
  const detach = attachGestures(canvas, {
    down(p) {
      if (mode !== "run") return;
      const part = partAt(p);
      if (part && sim.hold(part)) {
        held = part.id;
        pressed = { ...pressed, [part.id]: true };
        render();
      }
    },
    up() {
      if (held) {
        pressed = { ...pressed, [held]: false };
        held = null;
        render();
      }
    },
    tap(p) {
      closeMenu();
      const pin = pinAt(p);
      if (mode === "run") {
        const part = partAt(p);
        if (part && sim.toggle(part)) {
          pressed = { ...pressed, [part.id]: !pressed[part.id] };
          return render();
        }
        if (pin) return showTip(p, lastFrame.pinTip(pin));
        const tip = part && !sim.hold(part) ? lastFrame.partTip(part) : null;
        if (tip) showTip(p, tip);
        return;
      }
      if (pin) return apply({ t: "tapPin", pin });
      const wi = wireAt(p);
      // 실수로 지우지 않게: 첫 탭은 선택, 선택된 선을 한 번 더 탭하면 삭제
      if (wi >= 0 && wi === selWire) return apply({ t: "removeWire", index: wi });
      if (wi >= 0 && !st.pending) {
        selWire = wi;
        return render();
      }
      if (st.pending || selWire >= 0) {
        st = { ...st, pending: null };
        selWire = -1;
        render();
      }
    },
    longPress(p) {
      if (mode !== "edit") return;
      const part = partAt(p);
      if (part) openMenu(part, p);
    },
    dragStart(p) {
      // 핀 위에서 시작해도 부품을 옮긴다 (축소하면 핀 범위가 부품 몸체를 다 덮는다)
      if (mode !== "edit") return false;
      const part = partAt(p);
      if (!part) return false;
      const w = toWorld(p);
      drag = { id: part.id, dx: part.x - w.x / GRID, dy: part.y - w.y / GRID, pos: { x: part.x, y: part.y } };
      closeMenu();
      return true;
    },
    dragMove(p) {
      if (!drag) return;
      const w = toWorld(p);
      drag.pos = { x: Math.round(w.x / GRID + drag.dx), y: Math.round(w.y / GRID + drag.dy) };
      render();
    },
    dragEnd() {
      if (!drag) return;
      const { id, pos } = drag;
      drag = null;
      apply({ t: "move", id, x: pos.x, y: pos.y });
    },
    pan(dx, dy) {
      view.tx += dx;
      view.ty += dy;
      render();
    },
    pinch(f, c) {
      const s = Math.min(3, Math.max(0.5, view.s * f));
      const k = s / view.s;
      view.tx = c.x - (c.x - view.tx) * k;
      view.ty = c.y - (c.y - view.ty) * k;
      view.s = s;
      render();
    },
  });

  // PC 키보드: Ctrl+Z/Y, Delete(선택한 선), Esc, Ctrl+Enter(테스트)
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) return document.removeEventListener("keydown", onKey);
    if (typingIn(e.target)) return;
    const a = editorKey(e);
    if (!a) return;
    if (a === "undo" || a === "redo") apply({ t: a });
    else if (a === "test") opts.onTest(st.circuit);
    else if (a === "deleteWire") {
      if (mode !== "edit" || selWire < 0) return;
      apply({ t: "removeWire", index: selWire });
    } else {
      st = { ...st, pending: null };
      selWire = -1;
      closeMenu();
      render();
    }
    e.preventDefault();
  };
  document.addEventListener("keydown", onKey);

  requestAnimationFrame(() => {
    fit();
    render();
  });
  render();

  return {
    el,
    getCircuit: () => st.circuit,
    load(c) {
      const before = st.circuit;
      st = { ...st, circuit: c, pending: null, past: [...st.past, before].slice(-50), future: [] };
      opts.onChange(c);
      fit();
      render();
    },
    destroy() {
      detach();
      document.removeEventListener("keydown", onKey);
      clearTimeout(tipTimer);
    },
  };
}
