import { useMemo, useState } from "react";
import type { Region } from "../lib/region";

type RegionWithReading = Region & { reading?: string };

type Props = {
  regions: RegionWithReading[];
  onSelectRegion: (region: Region) => void;
};

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[‐-‒–—−ー－]/g, "-");

export default function RegionSearchBar({ regions, onSelectRegion }: Props) {
  const [q, setQ] = useState("");

  const candidates = useMemo(() => {
    const s = normalize(q);
    if (!s) return [];

    return regions
      .filter((r) => {
        // ✅ reading を必ず検索キーに含める
        const key = normalize(`${r.name}${r.reading ?? ""}${r.pref}`);
        return key.includes(s);
      })
      .slice(0, 8);
  }, [q, regions]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="地域を検索（例：し → 品川）"
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
      />

      {candidates.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            zIndex: 9999,
          }}
        >
          {candidates.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelectRegion(r);
                setQ("");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{r.pref}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
