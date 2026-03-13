import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event("plate-app-update-available"));
  },
  onOfflineReady() {
    console.log("PWA offline ready");
  },
});

window.addEventListener("plate-app-apply-update", () => {
  updateSW(true);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);