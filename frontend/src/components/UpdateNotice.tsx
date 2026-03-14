import { useEffect, useState } from "react";

type VersionInfo = {
  version: string;
  message?: string;
};

const STORAGE_KEY = "plate_app_seen_version";

async function fetchVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const data: VersionInfo = await res.json();
    return data;
  } catch (error) {
    console.error("version fetch error:", error);
    return null;
  }
}

export default function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      const data = await fetchVersion();
      if (!data?.version) return;

      const seenVersion = localStorage.getItem(STORAGE_KEY);

      // 初回起動時は記録だけして通知しない
      if (!seenVersion) {
        localStorage.setItem(STORAGE_KEY, data.version);
        return;
      }

      // バージョンが変わったら通知を出す
      if (seenVersion !== data.version) {
        setMessage(data.message ?? "新しい内容が反映されています。");
        setLatestVersion(data.version);
        setOpen(true);
      }
    };

    checkVersion();
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 24,
          padding: "24px 20px 18px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 14px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            boxShadow: "inset 0 2px 8px rgba(255,255,255,0.7)",
          }}
        >
          🚗
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 8,
            letterSpacing: "0.02em",
          }}
        >
          アプリを更新しました
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "#4b5563",
            marginBottom: 20,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>

        <button
          onClick={() => {
            if (latestVersion) {
              localStorage.setItem(STORAGE_KEY, latestVersion);
            }
            setOpen(false);
            window.location.reload();
          }}
          style={{
            border: "none",
            outline: "none",
            borderRadius: 999,
            padding: "12px 20px",
            minWidth: 140,
            background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(59, 130, 246, 0.28)",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}