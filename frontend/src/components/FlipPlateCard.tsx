import { useEffect, useState } from "react";
import type { Plate } from "../storage/plates";

export default function FlipPlateCard({
    plate, compact = false
}: {
    plate: Plate; compact?: boolean
}) {
    const [highlight, setHighlight] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const cardHeight = compact ? 120 : 340;
    const padding = compact ? 6 : 14;

    // plate が変わったら状態リセット
    useEffect(() => {
        setHighlight(false);
        setFlipped(false);
    }, [plate.id]);

    const hasPhoto = !!plate.photo_url;

    const onTap = () => {
        // 1回目：強調
        if (!highlight) {
            setHighlight(true);
            return;
        }
        // 2回目：裏返し
        setFlipped((v) => !v);
    };

    return (
        <div
            className="fp-wrap"
            style={{
                height: cardHeight,
                padding,
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                background: "#fff",
            }}
        >
            <style>{`
        .fp-card {
          width: 100%;
          height: 170px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 520ms cubic-bezier(.2,.9,.2,1);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
        }
        .fp-card.isFlipped { transform: rotateY(180deg); }
        .fp-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
        }
        .fp-front { background: #fff; }
        .fp-back { transform: rotateY(180deg); background: #111827; }
      `}</style>

            <div
                className={`fp-card ${flipped ? "isFlipped" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onTap();
                }}
                style={{
                    cursor: "pointer",
                    outline: highlight ? "4px solid rgba(249,115,22,.55)" : "2px solid #e5e7eb",
                    boxShadow: highlight ? "0 16px 36px rgba(249,115,22,.22)" : "0 10px 22px rgba(0,0,0,.10)",
                }}
                title={highlight ? "もう一度タップで裏返し📸" : "タップで強調✨"}
                aria-label="プレート（タップで強調、もう一度で裏返し）"
            >
                {/* 表：SVG */}
                <div className="fp-face fp-front">
                    <div
                        style={{
                            height: "100%",
                            display: "grid",
                            gridTemplateRows: "1fr auto",
                            gap: 8,
                            padding: 10,
                            boxSizing: "border-box",
                        }}
                    >
                        <div
                            style={{
                                border: "2px solid #e5e7eb",
                                borderRadius: 14,
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#fff",
                            }}
                        >
                            <div
                                style={{
                                    height: compact ? 70 : "100%",
                                    padding: compact ? 4 : 10,
                                }} dangerouslySetInnerHTML={{ __html: plate.renderSvg }}
                            />
                        </div>

                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                            {hasPhoto ? "📸 裏面に写真あり" : "画像なし"}
                        </div>
                    </div>
                </div>

                {/* 裏：画像 */}
                <div className="fp-face fp-back">
                    {hasPhoto ? (
                        <img
                            src={plate.photo_url!}
                            alt="保存画像"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "grid",
                                placeItems: "center",
                                color: "#e5e7eb",
                                fontWeight: 900,
                            }}
                        >
                            画像がありません
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
