import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const em = email.trim();
    if (!em || !pw) {
      setErr("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });
      if (error) throw error;

      // ✅ 成功した時だけ遷移（自動では飛ばない）
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>ログイン</h2>

      {/* ✅ 自動で飛ばさない代わりに“状態表示＋手動ボタン” */}
      <div style={{ marginBottom: 12 }}>

      </div>

      {info && (
        <div style={{ color: "#064", fontSize: 14, whiteSpace: "pre-wrap", marginBottom: 10 }}>
          {info}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div className="small">メールアドレス</div>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="small">パスワード</div>
          <input
            type="password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="********"
          />
        </label>

        {err && <div style={{ color: "#c00", fontSize: 14, whiteSpace: "pre-wrap" }}>{err}</div>}

        <button
          className="btn"
          type="submit"
          style={{ 
            background: "#8ec6ff",
          }}
        disabled={loading}
        >
        {loading ? "ログイン中..." : "ログイン"}
      </button>

      <button
        type="button"
        className="btn"
        onClick={() => nav("/signup", { replace: true })}
        style={{ marginRight: 8 }}
      >
        新規登録に進む
      </button>
    </form>
    </div >
  );
}
