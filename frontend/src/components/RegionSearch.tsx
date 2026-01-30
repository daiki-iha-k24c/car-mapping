import { useMemo, useState } from "react";
import type { Region } from "../lib/region";

function normalizeJP(s: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    // 全角スペース→半角
    .replace(/\u3000/g, " ")
    // 連続スペースを1つに
    .replace(/\s+/g, " ");
}

export default function RegionSearch({
  regions,
  onPick,
}: {
  regions: Region[];
  onPick: (region: Region) => void;
}) {
  const [q, setQ] = useState("");

  const query = normalizeJP(q);

  // 候補（先頭一致→部分一致の順で上に来る）
  const suggestions = useMemo(() => {
    if (!query) return [];

    const scored = regions
      .map((r) => {
        const name = normalizeJP(r.name);
        const pref = normalizeJP(r.pref);

        // ヒット判定：名前 or 都道府県
        const hit =
          name.includes(query) ||
          pref.includes(query);

        if (!hit) return null;

        // スコア：先頭一致を優先
        const score =
          (name.startsWith(query) ? 0 : 10) +
          (pref.startsWith(query) ? 1 : 20);

        return { r, score };
      })
      .filter(Boolean) as { r: Region; score: number }[];

    scored.sort((a, b) => a.score - b.score || a.r.areaOrder - b.r.areaOrder);

    return scored.slice(0, 10).map((x) => x.r);
  }, [regions, query]);

  const handlePick = (r: Region) => {
    onPick(r);
    setQ(""); // 選んだら入力をクリア（好みで消してOK）
  };

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 8 }}>
        <strong>地域検索</strong>
        <span className="small">例：品川 / し / 東京</span>
      </div>

      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="地域名を入力…（例: し）"
        autoComplete="off"
      />

      {/* 候補一覧 */}
      {query && (
        <div className="list" style={{ marginTop: 10 }}>
          {suggestions.length === 0 ? (
            <div className="small">候補がありません</div>
          ) : (
            suggestions.map((r) => (
              <button
                key={r.id}
                className="item"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 10,
                  cursor: "pointer",
                }}
                onClick={() => handlePick(r)}
              >
                <div>
                  <strong>{r.name}</strong>
                  <div className="meta">{r.pref}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
