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
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("新しいバージョンがあります（更新は手動）");
    if (confirm("新しいバージョンがあります。更新しますか？")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("オフライン準備OK");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
);
