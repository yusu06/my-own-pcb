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
