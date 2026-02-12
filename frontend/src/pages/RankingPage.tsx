import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";

type Row = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  completed_count: number;
  plate_count: number;
  total_points: number;
};

type RarityRow = {
  region_id: string;      // "都道府県:地域"
  rarity_level: number;   // 1..10
  points: number;
};

type SortKey = "points" | "completed" | "plates";

function toPublicAvatarUrl(pathOrUrl: string | null) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // ✅ ここをあなたのバケット名に
  const { data } = supabase.storage.from("avatars").getPublicUrl(pathOrUrl);
  return data.publicUrl ?? null;
}



export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [rarityRows, setRarityRows] = useState<RarityRow[]>([]);
  const { userId: meId } = useUser();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      // 1) フレンドランキング（自分+フレンドの合計pt）
      const { data: lb, error: lbErr } = await supabase.rpc("friend_leaderboard");
      if (lbErr) throw lbErr;

      const ids: string[] = (lb ?? [])
        .map((r: any) => String(r.user_id))
        .filter(Boolean);


      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) profiles（username, avatar）
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);

      if (pErr) throw pErr;

      // 3) v_user_stats（登録地域数 / プレート数）
      const { data: stats, error: sErr } = await supabase
        .from("v_user_stats")
        .select("user_id, completed_count, plate_count")
        .in("user_id", ids);

      if (sErr) throw sErr;

      // 4) マージ
      const profMap = new Map<
        string,
        { username: string; avatar_url: string | null }
      >();

      (profs ?? []).forEach((p: any) => {
        profMap.set(String(p.user_id), {
          username: String(p.username ?? "unknown"),
          avatar_url: p.avatar_url ?? null, // ← ここでは変換しない
        });
      });


      const statMap = new Map<string, { completed_count: number; plate_count: number }>();
      (stats ?? []).forEach((s: any) => {
        statMap.set(String(s.user_id), {
          completed_count: Number(s.completed_count ?? 0),
          plate_count: Number(s.plate_count ?? 0),
        });
      });

      const ptsMap = new Map<string, number>();
      (lb ?? []).forEach((r: any) => {
        ptsMap.set(String(r.user_id), Number(r.total_points ?? 0));
      });

      const merged: Row[] = ids.map((id) => ({
        user_id: id,
        username: profMap.get(id)?.username ?? "unknown",
        avatar_url: toPublicAvatarUrl(profMap.get(id)?.avatar_url ?? null),
        completed_count: statMap.get(id)?.completed_count ?? 0,
        plate_count: statMap.get(id)?.plate_count ?? 0,
        total_points: ptsMap.get(id) ?? 0,
      }));

      const { data: rarity, error: rErr } = await supabase
        .from("region_rarity_current")
        .select("region_id, rarity_level, points")
        .order("rarity_level", { ascending: false })
        .order("region_id", { ascending: true });


      if (rErr) throw rErr;

      setRows(merged);
      setLoading(false);
      setRarityRows((rarity ?? []) as RarityRow[]);
    })().catch((e) => {
      console.error(e);
      setErr(e?.message ?? "読み込みに失敗しました");
      setLoading(false);
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = rows.slice();
    if (sortKey === "points") {
      arr.sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    } else if (sortKey === "completed") {
      arr.sort((a, b) => (b.completed_count ?? 0) - (a.completed_count ?? 0));
    } else {
      arr.sort((a, b) => (b.plate_count ?? 0) - (a.plate_count ?? 0));
    }
    return arr;
  }, [rows, sortKey]);

  const rarityGrouped = useMemo(() => {
    const m = new Map<number, { points: number; regions: string[] }>();


    for (const r of rarityRows) {
      const lv = Number(r.rarity_level);
      const pts = Number(r.points);
      const name = String(r.region_id).split(":")[1] ?? String(r.region_id); // 地名だけ表示

      if (!m.has(lv)) m.set(lv, { points: pts, regions: [] });
      m.get(lv)!.regions.push(name);
    }

    // Lv10→Lv1の配列に
    const out: Array<{ lv: number; points: number; regions: string[] }> = [];
    for (let lv = 10; lv >= 1; lv--) {
      const v = m.get(lv);
      if (!v) continue;
      out.push({ lv, points: v.points, regions: v.regions });
    }
    return out;
  }, [rarityRows]);


  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ランキング</h2>
          <div className="small">フレンド内のランキングです</div>
        </div>
        <div className="header-actions">
          <Link to="/" className="btn">← ホーム</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
        <button
          className="btn"
          onClick={() => setSortKey("points")}
          style={{
            opacity: sortKey === "points" ? 1 : 0.6,
            fontWeight: sortKey === "points" ? 800 : 600,
          }}
        >
          ポイント
        </button>
        <button
          className="btn"
          onClick={() => setSortKey("completed")}
          style={{
            opacity: sortKey === "completed" ? 1 : 0.6,
            fontWeight: sortKey === "completed" ? 800 : 600,
          }}
        >
          登録地域数
        </button>
        <button
          className="btn"
          onClick={() => setSortKey("plates")}
          style={{
            opacity: sortKey === "plates" ? 1 : 0.6,
            fontWeight: sortKey === "plates" ? 800 : 600,
          }}
        >
          登録プレート数
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 12, opacity: 0.7 }}>読み込み中...</div>
      ) : err ? (
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
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((r, idx) => {
            const isMe = !!meId && r.user_id === meId;

            return (
              <div
                key={r.user_id}
                style={{
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 14,

                  // ✅ 自分だけハイライト
                  background: isMe ? "#fff7ed" : "#fff",
                  border: isMe ? "2px solid #fb923c" : "1px solid #eee",
                  boxShadow: isMe ? "0 8px 22px rgba(251,146,60,0.22)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      textAlign: "center",
                      fontWeight: 900,
                      opacity: 0.8,
                      color: isMe ? "#9a3412" : undefined,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt=""
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: isMe ? "2px solid #fb923c" : "1px solid #eee",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#f3f4f6",
                          border: isMe ? "2px solid #fb923c" : "1px solid #eee",
                        }}
                      />
                    )}

                    <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{r.username}</span>

                      {isMe && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#fb923c",
                            color: "#fff",
                            fontWeight: 900,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 13,
                    opacity: 0.88,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {sortKey === "points" ? (
                    <span style={{ fontSize:"18px",fontWeight: 800 }}>{r.total_points}pt</span>
                  ) : sortKey === "completed" ? (
                    <div style={{ fontSize: "18px",fontWeight: 800 }}>
                      <span style={{ fontSize: "10px",fontWeight: 800 }}>合計：</span>
                      {r.completed_count} 
                      <span style={{ fontSize: "10px",fontWeight: 800 }}> 地域</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: "18px",fontWeight: 800 }}>
                      <span style={{ fontSize: "10px",fontWeight: 800 }}>合計：</span>
                      {r.plate_count} 
                      <span style={{ fontSize: "10px",fontWeight: 800 }}> 枚</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>

      )}
      <div style={{ marginTop: 16 }}>
        <details
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>
            現在の地域レベル・点数一覧（タップで開く）
          </summary>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rarityGrouped.map((g) => (
              <div
                key={g.lv}
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  padding: 10,
                  background:"linear-gradient(#ffffff, #f3bf88)",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  Lv{g.lv}（{g.points}pt）
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
                  {g.regions.join("、")}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

    </div>

  );
}
