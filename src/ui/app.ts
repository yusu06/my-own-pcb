import { LESSONS, findLesson } from "../lessons";
import { parseRoute } from "../route";
import type { Store } from "../store/store";
import { renderHome } from "./home";
import { renderLesson } from "./lesson";
import { renderGlossary } from "./glossary";
import { renderSettings } from "./settings";
import { showTermPopup } from "./term-popup";

export interface Ctx {
  store: Store;
  go(hash: string): void;
  showTerm(id: string): void;
}

export function applyTheme(theme: Store["data"]["settings"]["theme"]): void {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function startApp(root: HTMLElement, store: Store): void {
  const ctx: Ctx = {
    store,
    go: (hash) => {
      if (location.hash === hash) render();
      else location.hash = hash;
    },
    showTerm: showTermPopup,
  };
  const render = () => {
    const r = parseRoute(location.hash, LESSONS.map((l) => l.id));
    root.replaceChildren();
    window.scrollTo(0, 0);
    if (r.name === "lesson") renderLesson(root, ctx, findLesson(r.id)!);
    else if (r.name === "glossary") renderGlossary(root, ctx);
    else if (r.name === "settings") renderSettings(root, ctx);
    else renderHome(root, ctx);
  };
  applyTheme(store.data.settings.theme);
  window.addEventListener("hashchange", render);
  render();
}
