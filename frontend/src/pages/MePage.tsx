import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 1024 * 1024;

type Profile = { username: string; avatar_url: string | null };

function validateUsername(s: string) {
  const v = s.trim();
  if (v.length < 2 || v.length > 16) return "ユーザーネームは2〜16文字にしてね";
  if (!/^[a-zA-Z0-9._ぁ-んァ-ヶ一-龠ー]+$/.test(v)) return "使える文字は英数字・._・日本語だよ";
  return null;
}

function guessExtFromMime(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

function isLikelyHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}
function isDataUrl(s: string) {
  return /^data:image\//i.test(s);
}

function publicUrlFromAvatarValue(avatarUrlOrPath: string | null) {
  if (!avatarUrlOrPath) return null;

  // 互換：昔の http URL / dataURL が残ってても表示だけはできるようにする
  if (isLikelyHttpUrl(avatarUrlOrPath) || isDataUrl(avatarUrlOrPath)) return avatarUrlOrPath;

  // 新方式：storage path
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarUrlOrPath);
  return data.publicUrl ?? null;
}

async function uploadAvatarToStorage(userId: string, file: File) {
  const ext = guessExtFromMime(file.type);
  const path = `${userId}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (upErr) throw upErr;

  return path; // DBにはpathを保存
}

export default function MePage() {
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState<string>("");
  const [draft, setDraft] = useState<string>("");

  // DBに入ってる値（新方式: path / 旧方式: http or dataURL）
  const [currentAvatarValue, setCurrentAvatarValue] = useState<string | null>(null);
  const [draftAvatarValue, setDraftAvatarValue] = useState<string | null>(null);

  // 新しく選択された file（ある時だけ storage upload）
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // プレビュー（選択したfileがあれば objectURL を優先）
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const prevObjectUrlRef = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();

  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) URL.revokeObjectURL(prevObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setMsg(null);

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
      const avatarVal = profile?.avatar_url ?? null;

      setCurrent(name);
      setDraft(name);

      setCurrentAvatarValue(avatarVal);
      setDraftAvatarValue(avatarVal);

      // file選択は初期化
      setAvatarFile(null);

      // プレビューは「DB値→URL化」
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current);
        prevObjectUrlRef.current = null;
      }
      setAvatarPreviewUrl(publicUrlFromAvatarValue(avatarVal));

      setLoading(false);
    })();
  }, [navigate]);

  const handleAvatarChange = (file: File | null) => {
    setErr(null);
    setMsg(null);

    // 既存 objectURL を破棄
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }

    if (!file) {
      // 「解除」扱い（DBは null 保存したいので draftAvatarValue を null）
      setAvatarFile(null);
      setDraftAvatarValue(null);
      setAvatarPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErr("画像ファイルを選んでね");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setErr("画像サイズは512KB以下にしてね");
      return;
    }

    setAvatarFile(file);

    // draftAvatarValue は「まだ確定してない」ので現時点ではそのままでもOKだけど、
    // 解除判定や changed 判定がややこしくなるので「仮で現状維持」にしておく
    // ※保存時に upload → path を入れ直す
    // setDraftAvatarValue(draftAvatarValue);

    const url = URL.createObjectURL(file);
    prevObjectUrlRef.current = url;
    setAvatarPreviewUrl(url);
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

      // 1) avatar の確定値を作る
      let nextAvatarValue: string | null = draftAvatarValue;

      // file が選ばれていれば upload して path を採用
      if (avatarFile) {
        nextAvatarValue = await uploadAvatarToStorage(user.id, avatarFile);
      }

      // 2) upsert
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        username,
        avatar_url: nextAvatarValue, // ✅ path or null
      });

      if (error) {
        const m = String(error.message).toLowerCase();
        if (m.includes("duplicate") || m.includes("unique")) {
          setErr("そのユーザーネームは既に使われています");
          return;
        }
        throw error;
      }

      // 3) 画面 state 更新
      setCurrent(username);
      setCurrentAvatarValue(nextAvatarValue);
      setDraftAvatarValue(nextAvatarValue);
      setAvatarFile(null);

      // プレビューを「確定値」から作り直す（objectURL の場合は破棄）
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current);
        prevObjectUrlRef.current = null;
      }
      setAvatarPreviewUrl(publicUrlFromAvatarValue(nextAvatarValue));

      setMsg("保存しました");
    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function resetAccount() {
    if (!confirm("この端末のユーザーを作り直します。よろしいですか？")) return;

    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setErr(error.message);
      return;
    }
    navigate("/onboarding");
  }

  async function logout() {
    const ok = confirm("ログアウトしてよろしいですか？");
    if (!ok) return;

    setErr(null);
    setMsg(null);

    await supabase.auth.signOut({ scope: "local" });
    navigate("/login", { replace: true });
  }

  const changed =
    draft.trim() !== current.trim() ||
    // draftAvatarValue の変更（解除など） or avatarFile の新規選択
    draftAvatarValue !== currentAvatarValue ||
    !!avatarFile;

  const shownLetter = useMemo(() => draft.trim().slice(0, 1) || "?", [draft]);

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
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="アイコン"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{shownLetter}</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

                {(avatarPreviewUrl || draftAvatarValue) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleAvatarChange(null)}
                    style={{ padding: "8px 12px" }}
                  >
                    解除
                  </button>
                )}
              </div>
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
            <div
              style={{
                background: "#ffecec",
                border: "1px solid #ffb4b4",
                color: "#a40000",
                padding: 10,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              {err}
            </div>
          )}

          {msg && (
            <div
              style={{
                background: "#ecfff1",
                border: "1px solid #b7f5c7",
                color: "#0c6b2a",
                padding: 10,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              {msg}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || !changed}
            style={{
              width: "100%",
              fontSize: "18px",
              fontWeight: "bold",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: saving || !changed ? "#ddd" : "#8ec6ff",
              color: "#fff",
              cursor: saving || !changed ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>

          <div style={{ height: 10 }} />

          <button
            type="button"
            onClick={logout}
            style={{
              width: "100%",
              fontSize: "18px",
              fontWeight: "bold",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#ff7f7f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ログアウト
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
