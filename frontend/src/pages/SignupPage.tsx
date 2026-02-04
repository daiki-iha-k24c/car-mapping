import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SignUpPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const em = email.trim();
    if (!em || !pw) return setErr("メールアドレスとパスワードを入力してください");
    if (pw.length < 6) return setErr("パスワードは6文字以上にしてください");
    if (pw !== pw2) return setErr("パスワード（確認）が一致しません");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: em, password: pw });
      if (error) throw error;

      // Confirm email OFF 前提：session が入る
      if (!data.session) {
        setInfo("登録できましたが、セッションが作成されませんでした。ログインしてください。");
        return;
      }

      // ✅ 成功した時だけ遷移（自動では飛ばない）
      nav("/onboarding", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "新規登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>新規登録</h2>

      <div style={{ marginBottom: 12 }}>
        <button type="button" className="btn" onClick={() => nav("/", { replace: true })} style={{ marginRight: 8 }}>
          ホームへ戻る
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await supabase.auth.signOut({ scope: "local" });
            setInfo("ログアウトしました。別アカウントで登録できます。");
          }}
        >
          ログアウト
        </button>
      </div>

      {info && (
        <div style={{ color: "#064", fontSize: 14, whiteSpace: "pre-wrap", marginBottom: 10 }}>
          {info}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div className="small">メールアドレス（IDとして使用）</div>
          <input
            type="email"
            autoComplete="username"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="small">パスワード</div>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="6桁以上＆1種類以上"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="small">パスワード（確認）</div>
          <input
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </label>

        {err && <div style={{ color: "#c00", fontSize: 14, whiteSpace: "pre-wrap" }}>{err}</div>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "登録中..." : "登録する"}
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => nav("/login", { replace: true })}
          style={{ marginRight: 8 }}
        >
          ログイン画面へ
        </button>
      </form>
    </div>
  );
}
