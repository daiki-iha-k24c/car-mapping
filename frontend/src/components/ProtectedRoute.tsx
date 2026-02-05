import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { userId, username, loading, profileStatus } = useUser();
  const loc = useLocation();

  if (loading) return <div style={{ padding: 16 }}>Loading... (auth)</div>;
  if (!userId) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  if (profileStatus === "error") {
    return (
      <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <h3 style={{ marginTop: 0 }}>接続が不安定です</h3>
        <div style={{ color: "#666", marginBottom: 12 }}>
          ユーザー情報を確認できませんでした。再試行してください。
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (profileStatus === "ready" && !username && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
