import { supabase } from "../lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SerialCollectionGrid, { type SerialRow } from "../components/SerialCollectionGrid";

const TOTAL = 9999;

export default function SerialCollectionPage() {
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ タップしたセル（個人ページ用）
  const [picked, setPicked] = useState<{ serial4: string; row: SerialRow } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;

      if (!uid) {
        setError("ログインが必要です");
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_serial_collection_v2")
        .select("serial4, first_plate_svg")
        .eq("user_id", uid);


      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as SerialRow[]) ?? []);
      }

      setLoading(false);
    })();
  }, []);


  const achieved = rows.length;
  const ratePct = useMemo(() => {
    const r = achieved / TOTAL;
    return (r * 100).toFixed(2);
  }, [achieved]);

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16 }}>エラー: {error}</div>;

  return (
    <div style={{ padding: 12 }}>
      <div className="header">
        <div>
          <h2 style={{ margin: "8px 0" }}>ナンバーコレクション</h2>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">ホームに戻る</Link>
        </div>
      </div>

      <div className="summaryBar">
        <div className="summaryItem">
          <div className="summaryLabel">達成数</div>
          <div className="summaryValue">
            {achieved} / {TOTAL}
          </div>
        </div>

        <div className="summaryDivider" />

        <div className="summaryItem">
          <div className="summaryLabel">達成率</div>
          <div className="summaryValue">
            {ratePct}%
          </div>
        </div>
      </div>

      <SerialCollectionGrid
        rows={rows}
        onPick={(serial4, row) => {
          if (!row) return;
          setPicked({ serial4, row });
        }}
      />

      {/* ✅ タップ詳細モーダル（個人ページ版） */}
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

            {picked.row.first_plate_svg ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>あなたのプレート</div>
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 8,
                    overflow: "hidden",
                  }}
                  // ✅ 表示の正規化は Grid 側でしてるので、そのまま出してOK
                  dangerouslySetInnerHTML={{ __html: picked.row.first_plate_svg }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
                この番号はプレートSVGがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
