import { useEffect, useState } from "react";

type VersionInfo = {
  version: string;
  message: string;
};

const STORAGE_KEY = "plate-app-last-seen-version";

export default function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("アプリが更新されました。");
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as VersionInfo;
        if (!mounted || !data?.version) return;

        const lastSeen = localStorage.getItem(STORAGE_KEY);

        // 初回起動時は記録だけして通知しない
        if (!lastSeen) {
          localStorage.setItem(STORAGE_KEY, data.version);
          return;
        }

        // バージョンが変わっていれば通知を出す
        if (lastSeen !== data.version) {
          setMessage(data.message || "アプリが更新されました。");
          setPendingVersion(data.version);
        }
      } catch (err) {
        console.error("version.json の取得に失敗:", err);
      }
    };

    checkVersion();

    const onNeedRefresh = () => {
      setOpen(true);
    };

    window.addEventListener("plate-app-update-available", onNeedRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("plate-app-update-available", onNeedRefresh);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9999,
        background: "#111827",
        color: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        アプリを更新しました
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.95 }}>
        {message}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            if (pendingVersion) {
              localStorage.setItem(STORAGE_KEY, pendingVersion);
            }
            window.dispatchEvent(new Event("plate-app-apply-update"));
          }}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            fontWeight: 700,
            cursor: "pointer",
            background: "#fff",
            color: "#111827",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}