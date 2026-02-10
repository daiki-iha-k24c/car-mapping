import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import SerialCollectionGrid, { type SerialRow } from "../components/SerialCollectionGrid";

const TOTAL = 9999;

export default function GlobalSerialCollectionPage() {
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("global_serial_collection")
        .select("serial4, first_plate_svg");

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as SerialRow[]) ?? []);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16 }}>エラー: {error}</div>;

  return (
    <div style={{ padding: 12 }}>
      <div className="header">
        <div>
          <h3 style={{ margin: "8px 0" }}>ナンバーコレクション(みんな)</h3>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">ホームに戻る</Link>
        </div>
      </div>
      <div className="summaryBar">
        <div className="summaryItem">
          <div className="summaryLabel">達成数</div>
          <div className="summaryValue">
            {rows.length} / {TOTAL}
          </div>
        </div>
      </div>

      <SerialCollectionGrid rows={rows} />
    </div>
  );
}
