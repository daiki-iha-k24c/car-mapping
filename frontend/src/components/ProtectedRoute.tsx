import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { userId, authChecking, profileStatus } = useUser(); const loc = useLocation();

  if (authChecking) return <div style={{ padding: 16, opacity: 0.7 }}>Loading... (session)</div>;
  if (!userId) return <Navigate to="/login" replace />;

  if (profileStatus === "missing" && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // ✅ 3) profiles が取れない（不調/タイムアウト）時：ログアウト扱いにしない
  if (profileStatus === "error") {
    return (
      <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <h3 style={{ marginTop: 0 }}>接続が不安定です</h3>
        <div style={{ color: "#666", marginBottom: 12 }}>
          ユーザー情報を確認できませんでした。再試行してください。
        </div>

        <button className="btn" type="button" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  return children;
}
