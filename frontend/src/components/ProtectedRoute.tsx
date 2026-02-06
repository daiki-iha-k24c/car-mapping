import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import LoadingPlate from "../components/LoadingPlate";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { userId, authChecking, profileStatus,loading } = useUser();
  const loc = useLocation();

if (authChecking) return <LoadingPlate />;
if (loading) return <LoadingPlate/>;

  if (!userId) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (profileStatus === "missing" && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (profileStatus === "error") {
    // ここはあなたの既存UIでOK（ログアウト扱いしない）
    return (
      <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <h3 style={{ marginTop: 0 }}>接続が不安定です</h3>
        <div style={{ color: "#666", marginBottom: 12 }}>
          ユーザー情報を確認できませんでした。通信が戻ったら自動復旧します。
        </div>
        <button className="btn" type="button" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  return children;
}
