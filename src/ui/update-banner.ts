import { registerSW } from "virtual:pwa-register";
import type { Store } from "../store/store";
import { h } from "./dom";

/** 새 버전이 오면 배너만 띄운다. 적용 직전에 현재 데이터를 hw.backup.prev에 남긴다. */
export function initUpdates(store: Store): void {
  if (!("serviceWorker" in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      if (document.querySelector(".update-banner")) return;
      const banner = h(
        "div",
        { class: "update-banner", role: "status" },
        h("span", {}, "새 버전이 있어요"),
        h(
          "button",
          {
            class: "btn primary",
            type: "button",
            onclick: () => {
              store.snapshot();
              void updateSW(true);
            },
          },
          "새로고침",
        ),
        h("button", { class: "btn ghost", type: "button", "aria-label": "나중에", onclick: () => banner.remove() }, "✕"),
      );
      document.body.append(banner);
    },
  });
}
