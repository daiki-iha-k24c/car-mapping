import { FixedSizeGrid as Grid } from "react-window";
import { useMemo, useState, useEffect } from "react";

export type SerialRow = {
  serial4: string;
  first_plate_svg: string | null;
};

const TOTAL = 9999; // 0001〜9999

function serialFromIndex(i: number) {
  return String(i + 1).padStart(4, "0");
}

function placeholderLabelFromSerial4(serial4: string) {
  const n = parseInt(serial4, 10);
  const d = String(n);
  return d.padStart(4, "・");
}

export default function SerialCollectionGrid({
  rows,
}: {
  rows: SerialRow[];
}) {
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
    const calc = () => {
      const h = Math.max(420, Math.min(720, window.innerHeight - 160));
      setGridH(h);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const map = useMemo(() => new Map(rows.map((r) => [r.serial4, r])), [rows]);

  return (
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
                    <div className="serial-num">
                      {placeholderLabelFromSerial4(serial4)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="serial-ph">
                  <div className="serial-num">
                    {placeholderLabelFromSerial4(serial4)}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Grid>
    </div>
  );
}
