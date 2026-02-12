import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";

const USERNAME_MIN = 2;
const USERNAME_MAX = 16;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const AVATAR_BUCKET = "avatars";

function normalizeUsername(s: string) {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function isProbablyReserved(name: string) {
  const n = name.toLowerCase();
  return [
    "admin",
    "root",
    "support",
    "staff",
    "system",
    "owner",
    "me",
    "login",
    "signup",
    "Onboarding",
  ].includes(n);
}

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function asPromise<T>(thenable: any): Promise<T> {
  return Promise.resolve(thenable as any) as Promise<T>;
}

function prettyErr(e: any) {
  return e?.message ?? e?.error_description ?? (typeof e === "string" ? e : JSON.stringify(e));
}

function guessExtFromMime(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

async function uploadAvatar(userId: string, file: File) {
  const path = `${userId}/avatar.png`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/png",
      cacheControl: "60",
    });

  if (upErr) throw upErr;

  return path; // ✅ ここで path だけ返す
}


export default function OnboardingPage() {
  const navigate = useNavigate();

  const { userId, loading, username: currentUsername, refreshProfile } = useUser() as any;

  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const prevObjectUrlRef = useRef<string | null>(null);

  // ✅ 未ログインならログインへ
  useEffect(() => {
    if (!loading && !userId) navigate("/login", { replace: true });
  }, [loading, userId, navigate]);

  // ✅ すでに username があるなら onboarding 不要（保険）
  useEffect(() => {
    if (!loading && userId && currentUsername) {
      navigate("/", { replace: true });
    }
  }, [loading, userId, currentUsername, navigate]);

  // objectURL cleanup
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) URL.revokeObjectURL(prevObjectUrlRef.current);
    };
  }, []);

  const previewLetter = useMemo(() => {
    const t = normalizeUsername(name);
    return t.slice(0, 1) || "?";
  }, [name]);

  const handleAvatarChange = (file: File | null) => {
    setErr(null);

    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }

    if (!file) {
      setAvatarFile(null);
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
    const url = URL.createObjectURL(file);
    prevObjectUrlRef.current = url;
    setAvatarPreviewUrl(url);
  };

  async function save() {
    setErr(null);

    if (!userId) {
      navigate("/login", { replace: true });
      return;
    }

    const u = normalizeUsername(name);

    if (!u) {
      setErr("ユーザー名を入力してください");
      return;
    }
    if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
      setErr(`ユーザーネームは${USERNAME_MIN}〜${USERNAME_MAX}文字にしてね`);
      return;
    }
    if (isProbablyReserved(u)) {
      setErr("そのユーザーネームは使えません。別の名前にしてね。");
      return;
    }

    setSaving(true);
    try {
      // 1) avatar を storage にアップ（選ばれている時だけ）
      let avatarPath: string | null = null;
      if (avatarFile) {
        avatarPath = await withTimeout(uploadAvatar(userId, avatarFile), 12000);
      }

      const q = supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          username: u,
          avatar_url: avatarPath, // ✅ path保存
          updated_at: new Date().toISOString(),
        })
        .select("username")
        .maybeSingle();


      const { error } = await withTimeout(asPromise<{ data: any; error: any }>(q), 8000);

      if (error) {
        const msg = (error.message || "").toLowerCase();
        // @ts-ignore
        if (error.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
          setErr("そのユーザーネームは既に使われています。別の名前にしてね。");
          return;
        }
        throw error;
      }

      if (typeof refreshProfile === "function") {
        await withTimeout(Promise.resolve(refreshProfile()), 8000);
      }

      navigate("/", { replace: true });
    } catch (e: any) {
      const msg = prettyErr(e);
      if (msg === "timeout") {
        setErr("通信が混んでいて保存がタイムアウトしました。もう一度「保存する」を押してください。");
      } else {
        setErr(msg ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading... (auth)</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>ユーザーネーム登録</h2>
      <p style={{ marginTop: 4, color: "#6b7280" }}>初回だけ入力してね（後から変更できます）</p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "1px solid #e5e7eb",
            background: "#f3f4f6",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "#6b7280",
            flex: "0 0 auto",
          }}
        >
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt="アイコン"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>{previewLetter}</span>
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
            アイコンを選ぶ
          </span>
        </label>

        {avatarPreviewUrl && (
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

      <div style={{ display: "grid", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ユーザー名（2〜16文字）"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          autoComplete="off"
        />

        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {USERNAME_MIN}〜{USERNAME_MAX}文字 / 他の人と重複不可
        </div>
      </div>

      {err && (
        <div style={{ color: "crimson", marginTop: 10, whiteSpace: "pre-wrap" }}>{err}</div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 10,
          width: "100%",
          opacity: saving ? 0.8 : 1,
        }}
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
