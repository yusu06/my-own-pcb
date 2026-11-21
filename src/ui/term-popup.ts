import { GLOSSARY } from "../lessons/glossary";
import { h } from "./dom";

export function showTermPopup(id: string): void {
  document.querySelector(".sheet-backdrop")?.remove();
  const g = GLOSSARY[id];
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
  const backdrop: HTMLDivElement = h(
    "div",
    { class: "sheet-backdrop", onclick: (e) => e.target === backdrop && close() },
    h(
      "div",
      { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": g?.term ?? id },
      h("h3", {}, g?.term ?? id),
      h("p", {}, g?.short ?? "아직 설명이 없는 용어예요."),
      h("button", { class: "btn", type: "button", onclick: close }, "닫기"),
    ),
  );
  document.addEventListener("keydown", onKey);
  document.body.append(backdrop);
  backdrop.querySelector("button")!.focus();
}
