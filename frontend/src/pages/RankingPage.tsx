import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Row = {
  user_id: string;
  username: string;
  completed_count: number;
  plate_count: number;
};

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<"completed" | "plates">("completed");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("v_user_stats")
        .select("user_id, username, completed_count, plate_count");

      if (error) throw error;

      setRows((data ?? []) as Row[]);
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setErr(e?.message ?? "読み込みに失敗しました");
      setLoading(false);
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = rows.slice();
    if (sortKey === "completed") {
      arr.sort((a, b) => (b.completed_count ?? 0) - (a.completed_count ?? 0));
    } else {
      arr.sort((a, b) => (b.plate_count ?? 0) - (a.plate_count ?? 0));
    }
    return arr;
  }, [rows, sortKey]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ランキング</h2>
          <div className="small">達成地域数 / プレート数</div>
        </div>
        <div className="header-actions">
          <Link to="/" className="btn">← ホーム</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "10px 0 14px" }}>
        <button
          className="btn"
          onClick={() => setSortKey("completed")}
          style={{
            opacity: sortKey === "completed" ? 1 : 0.6,
            fontWeight: sortKey === "completed" ? 800 : 600,
          }}
        >
          達成地域数
        </button>
        <button
          className="btn"
          onClick={() => setSortKey("plates")}
          style={{
            opacity: sortKey === "plates" ? 1 : 0.6,
            fontWeight: sortKey === "plates" ? 800 : 600,
          }}
        >
          プレート数
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
          {sorted.map((r, idx) => (
            <Link
              key={r.user_id}
              to={`/u/${encodeURIComponent(r.username)}`}
              className="btn"
              style={{
                textDecoration: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 14,
                borderRadius: 14,
                background: "#fff",
                border: "1px solid #eee",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    textAlign: "center",
                    fontWeight: 900,
                    opacity: 0.8,
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ fontWeight: 800 }}>{r.username}</div>
              </div>

              <div style={{ display: "flex", gap: 10, fontSize: 13, opacity: 0.85 }}>
                <span>達成 {r.completed_count}</span>
                <span>プレート {r.plate_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
