import "./styles.css";
import { openStore } from "./store/store";
import { startApp } from "./ui/app";
import { initUpdates } from "./ui/update-banner";

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = openStore(safeStorage());
startApp(document.getElementById("app")!, store);
initUpdates(store);
// 브라우저가 저장 공간이 부족할 때 진행 기록을 지우지 않도록 요청 (거절돼도 괜찮다)
void navigator.storage?.persist?.().catch(() => {});
