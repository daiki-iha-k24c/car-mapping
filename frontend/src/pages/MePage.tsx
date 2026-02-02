import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";


type Profile = { username: string; avatar_url: string | null };

function validateUsername(s: string) {
  const v = s.trim();
  if (v.length < 2 || v.length > 16) return "ユーザーネームは2〜16文字にしてね";
  // ざっくりOK文字だけ（必要なら調整）
  if (!/^[a-zA-Z0-9._ぁ-んァ-ヶ一-龠ー]+$/.test(v)) return "使える文字は英数字・._・日本語だよ";
  return null;
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setMsg(null);

      // セッションは既にある想定（無いなら onboarding に戻す）
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        navigate("/onboarding");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle<Profile>();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const name = profile?.username ?? "";
      setCurrent(name);
      setDraft(name);
      const avatar = profile?.avatar_url ?? null;
      setCurrentAvatar(avatar);
      setDraftAvatar(avatar);
      setLoading(false);
    })();
  }, [navigate]);

  const handleAvatarChange = (file: File | null) => {
    setErr(null);
    setMsg(null);

    if (!file) {
      setDraftAvatar(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErr("画像ファイルを選んでね");
      return;
    }

    if (file.size > 512 * 1024) {
      setErr("画像サイズは512KB以下にしてね");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setDraftAvatar(result);
    };
    reader.onerror = () => {
      setErr("画像の読み込みに失敗しました");
    };
    reader.readAsDataURL(file);
  };

  async function save() {
    setErr(null);
    setMsg(null);

    const v = validateUsername(draft);
    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) throw new Error("ログイン情報がありません");

      const username = draft.trim();

      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        username,
        avatar_url: draftAvatar,
      });

      if (error) {
        // 既に使われている（unique）時によく出る
        const m = String(error.message).toLowerCase();
        if (m.includes("duplicate") || m.includes("unique")) {
          setErr("そのユーザーネームは既に使われています");
          return;
        }
        throw error;
      }

      setCurrent(username);
      setCurrentAvatar(draftAvatar);
      setMsg("保存しました");
    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function resetAccount() {
    // 匿名ユーザーを作り直したいとき用（開発中に便利）
    if (!confirm("この端末のユーザーを作り直します。よろしいですか？")) return;

    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.signOut();
    if (error) {
      setErr(error.message);
      return;
    }
    navigate("/onboarding");
  }

  const changed = draft.trim() !== current.trim() || draftAvatar !== currentAvatar;
  return (
    <div style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
      <div className="header">
        <h2 style={{ margin: "8px 0 4px" }}>ユーザー</h2>
        <Link to="/" className="btn">
          ホームに戻る
        </Link>
      </div>
      <div style={{ color: "#666", marginBottom: 16, fontSize: 13 }}>
        みんなの記録・ランキングで表示される名前です

      </div>

      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>アイコン</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  background: "#f3f4f6",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#6b7280",
                }}
              >
                {draftAvatar ? (
                  <img
                    src={draftAvatar}
                    alt="アイコン"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{draft.trim().slice(0, 1) || "?"}</span>
                )}
              </div>
              <label style={{ display: "block" }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                  style={{ display: "none" }}
                />
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  画像を選ぶ
                </span>
              </label>
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
              512KB以下の画像を設定できます
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>ユーザーネーム</div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder=""
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                outline: "none",
              }}
            />
            <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
              2〜16文字（英数字・._・日本語）
            </div>
          </div>

          {err && (
            <div style={{ background: "#ffecec", border: "1px solid #ffb4b4", color: "#a40000", padding: 10, borderRadius: 12, marginBottom: 12 }}>
              {err}
            </div>
          )}

          {msg && (
            <div style={{ background: "#ecfff1", border: "1px solid #b7f5c7", color: "#0c6b2a", padding: 10, borderRadius: 12, marginBottom: 12 }}>
              {msg}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || !changed}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: saving || !changed ? "#ddd" : "#111",
              color: "#fff",
              cursor: saving || !changed ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>

          <div style={{ height: 10 }} />

          <button
            onClick={resetAccount}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#333",
            }}
          >
            （開発用）この端末のユーザーを作り直す
          </button>
        </>
      )}
    </div>
  );
}
