import { SaveError } from "../store/migrate";
import { emptySave, type SaveData } from "../store/schema";
import { applyTheme, type Ctx } from "./app";
import { h } from "./dom";
import { warningBar } from "./home";

type Theme = SaveData["settings"]["theme"];
const THEMES: [Theme, string][] = [["system", "시스템"], ["light", "라이트"], ["dark", "다크"]];

export function renderSettings(root: HTMLElement, ctx: Ctx): void {
  const msg = h("p", { class: "settings-msg", role: "status", "aria-live": "polite" });
  const say = (text: string, ok = true) => {
    msg.textContent = text;
    msg.className = "settings-msg " + (ok ? "ok" : "bad");
  };

  const themeRow = h("div", { class: "segmented", role: "radiogroup", "aria-label": "테마" });
  const drawTheme = () =>
    themeRow.replaceChildren(
      ...THEMES.map(([t, label]) =>
        h(
          "button",
          {
            type: "button",
            role: "radio",
            "aria-checked": String(ctx.store.data.settings.theme === t),
            class: "btn" + (ctx.store.data.settings.theme === t ? " primary" : ""),
            onclick: () => {
              ctx.store.data = { ...ctx.store.data, settings: { ...ctx.store.data.settings, theme: t } };
              ctx.store.save();
              applyTheme(t);
              drawTheme();
            },
          },
          label,
        ),
      ),
    );
  drawTheme();

  const exportBackup = async () => {
    const now = new Date();
    const name = `my-own-pcb-backup-${now.toISOString().slice(0, 10).replaceAll("-", "")}.json`;
    const file = new File([ctx.store.exportBackup(now)], name, { type: "application/json" });
    // 아이폰 홈 화면 앱에서는 <a download>가 잘 안 되므로 공유 시트(파일에 저장, 카톡 나에게 보내기 등)를 먼저 쓴다
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "내 하드웨어 공방 백업" });
        return say("백업 파일을 공유했어요. 안전한 곳(파일 앱, 클라우드 등)에 보관하세요.");
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return say("백업을 취소했어요.", false);
      }
    }
    const a = h("a", { href: URL.createObjectURL(file), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    say("백업 파일을 저장했어요. 다운로드 폴더를 확인하고 안전한 곳에 보관하세요.");
  };

  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    file.value = "";
    if (!f || !confirm("지금 진행 상황을 이 백업으로 바꿀까요?")) return;
    try {
      ctx.store.importBackup(await f.text());
      applyTheme(ctx.store.data.settings.theme);
      drawTheme();
      say("백업을 불러왔어요.");
    } catch (e) {
      say(e instanceof SaveError ? e.message : "백업을 불러오지 못했어요.", false);
    }
  });

  const reset = () => {
    if (!confirm("진행 상황을 모두 지울까요?")) return;
    if (!confirm("정말요? 되돌릴 수 없어요. (직전 상태는 비상용 백업에 한 번 남겨 둬요)")) return;
    ctx.store.snapshot();
    ctx.store.data = emptySave();
    ctx.store.save();
    applyTheme("system");
    drawTheme();
    say("초기화했어요.");
  };

  root.append(
    ...[
      warningBar(ctx),
      h("header", { class: "lesson-top" }, h("a", { href: "#/", class: "back", "aria-label": "홈으로" }, "←"), h("strong", {}, "⚙ 설정")),
      h("section", { class: "card" }, h("h2", {}, "화면 테마"), themeRow),
      h(
        "section",
        { class: "card" },
        h("h2", {}, "백업"),
        h("p", { class: "muted" }, "진행 상황은 이 폰 안에만 저장돼요. 폰을 바꾸거나 초기화하기 전에 백업 파일을 만들어 두세요."),
        h("div", { class: "stack" },
          h("button", { class: "btn primary", type: "button", onclick: exportBackup }, "⬇ 백업 내보내기"),
          h("button", { class: "btn", type: "button", onclick: () => file.click() }, "⬆ 백업 불러오기"),
        ),
        file,
      ),
      h("section", { class: "card" }, h("h2", {}, "초기화"), h("button", { class: "btn danger", type: "button", onclick: reset }, "진행 상황 모두 지우기")),
      msg,
    ].filter((x): x is HTMLElement => x !== null),
  );
}
