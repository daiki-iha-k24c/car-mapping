import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { userId, username, loading, profileStatus, retryProfile } = useUser();
  const loc = useLocation();

  // ✅ 重要：userId があるなら、loading中でも画面を止めない（復帰体験が良くなる）
  // userId が無い & loading中だけ軽い表示
  if (!userId && loading) {
    return <div style={{ padding: 16, opacity: 0.7 }}>Loading... (auth)</div>;
  }

  // ✅ 未ログイン確定ならログインへ
  if (!userId) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // ✅ profiles が取れない（不調/タイムアウト）時：画面を止めつつ、ログアウト扱いにはしない
  if (profileStatus === "error") {
    return (
      <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <h3 style={{ marginTop: 0 }}>接続が不安定です</h3>
        <div style={{ color: "#666", marginBottom: 12 }}>
          ユーザー情報を確認できませんでした。再試行してください。
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* <button
            className="btn"
            type="button"
            onClick={() => retryProfile()}
          >
            再試行
          </button> */}

          <button
            className="btn"
            type="button"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ✅ 取得できた上で username が無いなら本当に未設定 → onboardingへ
  // loading中は飛ばさない（キャッシュ表示中に誤爆しやすい）
  if (!loading && profileStatus === "ready" && !username && loc.pathname !== "/Onboarding") {
    return <Navigate to="/Onboarding" replace />;
  }

  return children;
}
