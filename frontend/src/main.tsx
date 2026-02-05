import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: any }> {
  constructor(props: any) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: any) {
    return { err };
  }
  componentDidCatch(err: any) {
    console.error("App crashed:", err);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 16 }}>
          <h2>画面の描画でエラーが発生しました</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.err?.stack ?? this.state.err?.message ?? this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ PWA：更新は手動（勝手にリロードしない）
// ✅ 更新があるかどうかだけ保持
export let __needRefresh = false;
export let __doUpdate: null | (() => void) = null;

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("新しいバージョンがあります（更新は手動）");
    __needRefresh = true;
    __doUpdate = () => updateSW(true); // ← 押した時だけ更新
    // ここでは絶対に updateSW(true) を呼ばない
  },
  onOfflineReady() {
    console.log("オフライン準備OK");
  },
});


let reloaded = false;

async function hardReload() {
  if (reloaded) return;
  reloaded = true;

  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    if (regs && regs.length) {
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}

  try {
    // キャッシュ掃除（可能な環境のみ）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachesAny = caches as any;
    if (cachesAny?.keys) {
      const keys = await cachesAny.keys();
      await Promise.all(keys.map((k: string) => cachesAny.delete(k)));
    }
  } catch {}

  // 新しい index.html を確実に取りに行く
  window.location.replace(window.location.pathname + "?reload=" + Date.now());
}

function isChunkErrorMessage(msg: string) {
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

window.addEventListener("error", (e) => {
  const msg = String((e as any)?.message ?? "");
  if (isChunkErrorMessage(msg)) hardReload();
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e as any)?.reason?.message ?? (e as any)?.reason ?? "");
  if (isChunkErrorMessage(msg)) hardReload();
});


ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
);
