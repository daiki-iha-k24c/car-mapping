import { FixedSizeGrid as Grid } from "react-window";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";


type Row = {
    serial4: string;
    first_plate_svg: string | null;
};

function serialFromIndex(i: number) {
    // i=0 → 0001
    return String(i + 1).padStart(4, "0");
}

function placeholderLabelFromSerial4(serial4: string) {
    // 0000 は存在しない → 表示しない
    if (serial4 === "0000") return "";

    const n = parseInt(serial4, 10);

    // "0001" -> "・・・1"
    // "0012" -> "・・12"
    // "0123" -> "・123"
    const d = String(n);
    return d.padStart(4, "・");
}



export default function SerialCollectionPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const map = useMemo(
        () => new Map(rows.map((r) => [r.serial4, r])),
        [rows]
    );



    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerW, setContainerW] = useState<number>(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const ro = new ResizeObserver(() => {
            setContainerW(el.clientWidth);
        });
        ro.observe(el);
        setContainerW(el.clientWidth);

        return () => ro.disconnect();
    }, []);

    const gap = 12;              // 見た目の隙間
    const cellW = 90;            // ちょい大きめ（好みで）
    const cellH = 60;

    const gridW = Math.max(320, containerW); // 最低幅保険
    const columnCount = Math.min(5, // ★ 最大5列
        Math.max(
            3, // ★ 最小3列
            Math.floor((gridW - gap) / (cellW + gap))
        )
    );
    const TOTAL = 9999; // 0001〜9999
    const rowCount = Math.ceil(TOTAL / columnCount);
    // Gridに渡す幅は「実際に使う列数に合わせてピッタリ」にする（横スクロール消える）
    const usedW = columnCount * (cellW + gap) + gap;

    if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
    if (error) return <div style={{ padding: 16 }}>エラー: {error}</div>;


    return (
        <div style={{ padding: 12 }}>
            <div className="header">
                <div>
                    <h2 style={{ margin: "8px 0" }}>4桁コレクション</h2>
                </div>

                <div className="header-actions">
                    <Link to="/" className="btn">
                        ホームに戻る
                    </Link>
                </div>
            </div>

            <div style={{ marginBottom: 12, opacity: 0.7 }}>
                達成 {rows.length} / 10000
            </div>

            <div ref={containerRef} style={{ width: "100%" }}>
                <Grid
                    columnCount={columnCount}
                    columnWidth={cellW}
                    height={650}
                    rowCount={rowCount}
                    rowHeight={cellH}
                    width={columnCount * cellW}
                >

                    {({ columnIndex, rowIndex, style }) => {
                        const idx = rowIndex * columnCount + columnIndex;
                        if (idx >= TOTAL) return null;

                        const serial4 = serialFromIndex(idx);
                        const hit = map.get(serial4);

                        if (!hit) {
                            return (
                                <div style={{ ...style, padding: gap / 2, boxSizing: "border-box" }}>
                                    <div className="serial-ph">
                                        <div className="serial-num">{placeholderLabelFromSerial4(serial4)}</div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div style={{ ...style, padding: gap / 2, boxSizing: "border-box" }}>                                {hit.first_plate_svg ? (
                                <div
                                    className="serial-have"
                                    dangerouslySetInnerHTML={{
                                        __html: hit.first_plate_svg,
                                    }}
                                />
                            ) : (
                                <div className="serial-num">{placeholderLabelFromSerial4(serial4)}</div>
                            )}
                            </div>
                        );
                    }}
                </Grid>
            </div>
        </div>
    );
}
