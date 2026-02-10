import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import SerialCollectionGrid, { type SerialRow } from "../components/SerialCollectionGrid";

const TOTAL = 9999;

type ProfileMini = { user_id: string; username: string | null };

function fmt(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function GlobalSerialCollectionPage() {
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ タップしたセル
  const [picked, setPicked] = useState<{ serial4: string; row: SerialRow } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("global_serial_collection")
        .select("serial4, first_plate_svg, first_user_id, first_collected_at");

      if (error) {
        setError(error.message);
        setRows([]);
        setProfiles({});
        setLoading(false);
        return;
      }

      const list = ((data as SerialRow[]) ?? []).filter(Boolean);
      setRows(list);

      // ✅ first_user_id をまとめて profiles から引く
      const ids = Array.from(
        new Set(list.map((r) => r.first_user_id).filter((x): x is string => !!x))
      );

      if (ids.length === 0) {
        setProfiles({});
        setLoading(false);
        return;
      }

      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", ids);

      if (!pErr) {
        const m: Record<string, ProfileMini> = {};
        for (const p of (profs as ProfileMini[]) ?? []) m[p.user_id] = p;
        setProfiles(m);
      } else {
        console.warn("profiles lookup failed:", pErr);
        setProfiles({});
      }

      setLoading(false);
    })();
  }, []);

  const achieved = rows.length;

  const pickedUsername = useMemo(() => {
    if (!picked?.row.first_user_id) return null;
    return profiles[picked.row.first_user_id]?.username ?? null;
  }, [picked, profiles]);

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16 }}>エラー: {error}</div>;

  return (
    <div style={{ padding: 12 }}>
      <div className="header">
        <div>
          <h2 style={{ margin: "8px 0" }}>ナンバーコレクション</h2>
          <div style={{ opacity: 0.7, marginTop: 2 }}>みんな</div>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">ホームに戻る</Link>
        </div>
      </div>

      <div style={{ marginBottom: 12, opacity: 0.75 }}>
        達成 {achieved} / {TOTAL}
      </div>

      <SerialCollectionGrid
        rows={rows}
        onPick={(serial4, row) => {
          if (!row) return;
          setPicked({ serial4, row });
        }}
      />

      {/* ✅ タップ詳細モーダル */}
      {picked && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicked(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 3000,
          }}
        >
          <div
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              color: "#111",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>No.{picked.serial4}</div>
              <button className="btn" onClick={() => setPicked(null)}>閉じる</button>
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              <div style={{ opacity: 0.8 }}>
                最初に達成したユーザー：
                <b style={{ marginLeft: 6 }}>
                  {pickedUsername ?? "不明"}
                </b>
              </div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                達成日時：
                <b style={{ marginLeft: 6 }}>
                  {fmt(picked.row.first_collected_at) || "不明"}
                </b>
              </div>
            </div>

            {picked.row.first_plate_svg && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>最初のプレート</div>
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 8,
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{ __html: picked.row.first_plate_svg }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
