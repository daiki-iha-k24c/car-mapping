import { FixedSizeGrid as Grid } from "react-window";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Row = {
  serial4: string;
  first_plate_svg: string | null;
};

const TOTAL = 9999; // 0001〜9999

function serialFromIndex(i: number) {
  // i=0 → 0001
  return String(i + 1).padStart(4, "0");
}

function placeholderLabelFromSerial4(serial4: string) {
  // 0001 -> "・・・1"
  // 0012 -> "・・12"
  // 0123 -> "・123"
  const n = parseInt(serial4, 10);
  const d = String(n);
  return d.padStart(4, "・");
}

export default function SerialCollectionPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 高さだけは画面に合わせて state で固定（スクロール中に変わらない）
  const [gridH, setGridH] = useState(650);

  // ★4列固定レイアウト
  const columnCount = 4;
  const gap = 12;
  const cellW = 70;
  const cellH = 38;

  const rowCount = Math.ceil(TOTAL / columnCount);
  const gridW = columnCount * (cellW + gap) + gap;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("user_serial_collection")
        .select("serial4, first_plate_svg");

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as Row[]) ?? []);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const calc = () => {
      const h = Math.max(420, Math.min(720, window.innerHeight - 160));
      setGridH(h);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const map = useMemo(() => new Map(rows.map((r) => [r.serial4, r])), [rows]);

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16 }}>エラー: {error}</div>;

  return (
    <div style={{ padding: 12 }}>
      <div className="header">
        <div>
          <h2 style={{ margin: "8px 0" }}></h2>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">
            ホームに戻る
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 12, opacity: 0.7 }}>
        達成 {rows.length} / {TOTAL}
      </div>

      {/* ★中央寄せ（画面が広くても4列が真ん中にくる） */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Grid
          columnCount={columnCount}
          columnWidth={cellW + gap}
          height={gridH}
          rowCount={rowCount}
          rowHeight={cellH + gap}
          width={gridW}
        >
          {({ columnIndex, rowIndex, style }) => {
            const idx = rowIndex * columnCount + columnIndex;
            if (idx >= TOTAL) return null;

            const serial4 = serialFromIndex(idx);
            const hit = map.get(serial4);

            return (
              <div style={{ ...style, padding: "2px", boxSizing: "border-box" }}>
                {hit ? (
                  <div className="serial-have">
                    {hit.first_plate_svg ? (
                      <div
                        className="serial-svg"
                        dangerouslySetInnerHTML={{ __html: hit.first_plate_svg }}
                      />
                    ) : (
                      <div className="serial-num">{placeholderLabelFromSerial4(serial4)}</div>
                    )}
                  </div>
                ) : (
                  <div className="serial-ph">
                    <div className="serial-num">{placeholderLabelFromSerial4(serial4)}</div>
                  </div>
                )}
              </div>
            );
          }}
        </Grid>
      </div>
    </div>
  );
}
