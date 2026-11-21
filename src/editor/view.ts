import { gradeElectric, type CheckResult } from "../grader/electric";
import type { ElectricTask } from "../lessons/types";
import { SWITCH_KINDS } from "../sim/electric/parts";
import { solve } from "../sim/electric/solve";
import type { Circuit, Part, PinRef, Pressed } from "../sim/electric/types";
import { h } from "../ui/dom";
import { GRID, PIN_OFFSET, pinPos, snap, wirePath } from "./geometry";
import { attachGestures, type Pt } from "./input";
import { initEditor, reduce, type Action, type EditorState } from "./state";
import { partSymbol, svg } from "./symbols";

export interface EditorHandle {
  el: HTMLElement;
  getCircuit(): Circuit;
  /** 모범 답안 불러오기 등 외부에서 회로를 바꿀 때 (실행 취소 가능) */
  load(c: Circuit): void;
  destroy(): void;
}

const PIN_HIT_PX = 22;
const WIRE_HIT_PX = 10;
const mA = (a: number) => `${(a * 1000).toFixed(1)} mA`;

export function mountEditor(opts: {
  task: ElectricTask;
  saved: Circuit | null;
  onChange(c: Circuit): void;
  onTest(results: CheckResult[]): void;
}): EditorHandle {
  const { task } = opts;
  const switchIds = task.palette.filter((p) => SWITCH_KINDS.includes(p.kind)).map((p) => p.id);
  const labelOf = (id: string) =>
    task.palette.find((p) => p.id === id)?.label ?? (task.preset.parts.find((p) => p.id === id)?.kind === "battery" ? "전지" : id);

  let st: EditorState = initEditor(task.preset, opts.saved);
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
    h("button", { type: "button", class: "btn primary", onclick: () => opts.onTest(gradeElectric(st.circuit, task.checks, switchIds)) }, "🧪 테스트 실행"),
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
      for (const pin of Object.keys(PIN_OFFSET[part.kind])) {
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
  function wireAt(p: Pt): number {
    return st.circuit.wires.findIndex((wr) => {
      const a = st.circuit.parts.find((q) => q.id === wr.a.part);
      const b = st.circuit.parts.find((q) => q.id === wr.b.part);
      if (!a || !b) return false;
      const A = toScreen(pinPos(a, wr.a.pin));
      const B = toScreen(pinPos(b, wr.b.pin));
      // 가로(A.y에서 A.x→B.x) 다음 세로(B.x에서 A.y→B.y)
      const onH = Math.abs(p.y - A.y) <= WIRE_HIT_PX && p.x >= Math.min(A.x, B.x) - WIRE_HIT_PX && p.x <= Math.max(A.x, B.x) + WIRE_HIT_PX;
      const onV = Math.abs(p.x - B.x) <= WIRE_HIT_PX && p.y >= Math.min(A.y, B.y) - WIRE_HIT_PX && p.y <= Math.max(A.y, B.y) + WIRE_HIT_PX;
      return onH || onV;
    });
  }

  // ---------- 상태 변경 ----------
  function apply(a: Action) {
    const before = st.circuit;
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
      h("strong", {}, labelOf(part.id)),
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

  function freeSpot(): [number, number] {
    const c = toWorld({ x: canvasBox.clientWidth / 2, y: canvasBox.clientHeight / 2 });
    let [x, y] = [snap(c.x), snap(c.y)];
    for (let i = 0; i < 20 && st.circuit.parts.some((q) => Math.abs(q.x - x) < 5 && Math.abs(q.y - y) < 4); i++) {
      [x, y] = i % 2 === 0 ? [x + 6, y] : [x - 6, y + 5];
    }
    return [x, y];
  }

  // ---------- 그리기 ----------
  function render() {
    const c = shown();
    const sol = solve(c, pressed);
    world.setAttribute("transform", `translate(${view.tx} ${view.ty}) scale(${view.s})`);
    world.replaceChildren();
    for (const wr of c.wires) {
      const a = c.parts.find((q) => q.id === wr.a.part);
      const b = c.parts.find((q) => q.id === wr.b.part);
      if (!a || !b) continue;
      const flowing = (sol.parts[a.id]?.current ?? 0) >= 0.001 && (sol.parts[b.id]?.current ?? 0) >= 0.001;
      world.append(svg("path", { d: wirePath(pinPos(a, wr.a.pin), pinPos(b, wr.b.pin)), class: "wire" + (flowing ? " flow" : "") }));
    }
    for (const p of c.parts) {
      const g = partSymbol(p, sol.parts[p.id], !!pressed[p.id]);
      const label = svg("text", { x: 0, y: p.kind === "npn" ? 0 : 34, class: "part-label", "text-anchor": "middle" });
      label.textContent = labelOf(p.id) + (p.kind === "resistor" && p.value ? ` ${p.value >= 1000 ? `${p.value / 1000}k` : p.value}Ω` : "");
      if (p.kind === "npn") label.setAttribute("transform", "translate(0 52)");
      g.append(label);
      world.append(g);
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
    const burnt = Object.values(sol.parts).some((r) => r.burnt);
    status.className = "ed-status" + (sol.short || burnt ? " bad" : "");
    status.textContent = sol.short
      ? "⚠ 합선! 전지가 뜨거워져요. +와 −를 바로 잇는 선을 지우세요."
      : burnt
        ? "⚠ LED가 탔어요! 저항으로 전류를 줄여 보세요."
        : !sol.converged
          ? "⚠ 회로 계산이 불안정해요."
          : mode === "run"
            ? "스위치·버튼을 눌러 보세요. 핀을 탭하면 전압, 부품을 탭하면 전류가 보여요."
            : st.pending
              ? "연결할 다른 핀을 탭하세요. (같은 핀을 다시 누르면 취소)"
              : "핀을 탭해 선을 이어요. 부품은 끌어서 옮기고, 길게 누르면 회전·삭제.";

    const left = task.palette.filter((i) => !st.circuit.parts.some((p) => p.id === i.id));
    palette.replaceChildren(
      ...(mode === "edit"
        ? left.map((i) =>
            h("button", { type: "button", class: "btn", onclick: () => { const [x, y] = freeSpot(); apply({ t: "place", item: i, x, y }); } }, `+ ${i.label}`),
          )
        : []),
    );
    palette.hidden = mode !== "edit" || left.length === 0;
    (lastSol = sol);
  }
  let lastSol = solve(st.circuit, pressed);

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
      if (part && (part.kind === "button" || part.kind === "button-nc")) {
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
        if (pin) return showTip(p, `${(lastSol.nodeV[`${pin.part}.${pin.pin}`] ?? 0).toFixed(2)} V`);
        const part = partAt(p);
        if (part?.kind === "switch") {
          pressed = { ...pressed, [part.id]: !pressed[part.id] };
          return render();
        }
        if (part && part.kind !== "button" && part.kind !== "button-nc") showTip(p, mA(lastSol.parts[part.id]?.current ?? 0));
        return;
      }
      if (pin) return apply({ t: "tapPin", pin });
      const wi = wireAt(p);
      if (wi >= 0) return apply({ t: "removeWire", index: wi });
      if (st.pending) {
        st = { ...st, pending: null };
        render();
      }
    },
    longPress(p) {
      if (mode !== "edit") return;
      const part = partAt(p);
      if (part) openMenu(part, p);
    },
    dragStart(p) {
      if (mode !== "edit" || pinAt(p)) return false;
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
      clearTimeout(tipTimer);
    },
  };
}
