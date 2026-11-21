import "./styles.css";
import { openStore } from "./store/store";
import { startApp } from "./ui/app";

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

startApp(document.getElementById("app")!, openStore(safeStorage()));
