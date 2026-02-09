import { useEffect, useMemo, useState } from "react";
import type { Plate } from "../storage/plates";

export default function PlatePeekModal({
    open,
    plate,
    onClose,
}: {
    open: boolean;
    plate: (Plate & { regionName?: string; prefName?: string }) | null;
    onClose: () => void;
}) {
    const [flipped, setFlipped] = useState(false);
    const [highlight, setHighlight] = useState(false);

    useEffect(() => {
        if (!open) return;
        // 開くたびに表面から＆強調なし
        setFlipped(false);
        setHighlight(false);
    }, [open, plate?.id]);

    useEffect(() => {
        if (open && plate) console.log("peek plate", plate.capturedAt, plate);
    }, [open, plate?.id]);


    const hasPhoto = !!plate?.photo_url;

    const title = useMemo(() => {
        if (!plate) return "";
        const reg = (plate as any).regionName ?? "";
        return `${reg} ${plate.classNumber} ${plate.kana} ${plate.serial}`;
    }, [plate]);

    if (!open || !plate) return null;

    const onCardTap = () => {
        // 1回目：強調
        if (!highlight) {
            setHighlight(true);
            return;
        }
        // 2回目以降：裏返すトグル
        setFlipped((v) => !v);
    };
    function formatCapturedAt(iso?: string | null) {
        if (!iso) return "";
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}/${m}/${day}`;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 3000,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
        >
            <style>{`
        .pp-cardWrap { perspective: 1000px; }
        .pp-card {
          width: min(520px, 100%);
          height: 260px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 520ms cubic-bezier(.2,.9,.2,1);
          border-radius: 18px;
        }
        .pp-card.isFlipped { transform: rotateY(180deg); }
        .pp-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
        }
        .pp-back { transform: rotateY(180deg); background: #111827; }
        @keyframes pop {
          0% { transform: scale(.98); }
          100% { transform: scale(1); }
        }
      `}</style>

            <div
                style={{
                    width: "min(560px, 100%)",
                    background: "#fff",
                    borderRadius: 20,
                    padding: 14,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                        {plate.capturedAt && (
                            <div style={{ fontSize: 20, marginTop: 2 }}>
                                撮影日：{formatCapturedAt(plate.capturedAt)}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            border: "none",
                            background: "#f3f4f6",
                            borderRadius: 10,
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontWeight: 900,
                            flex: "0 0 auto",
                        }}
                    >
                        閉じる
                    </button>
                </div>


                <div style={{ marginTop: 12 }} className="pp-cardWrap">
                    {/* タップ説明 */}
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        {highlight ? "もう一度タップで裏返して画像📸" : "タップで強調表示✨"}
                    </div>

                    {/* flip card */}
                    <div
                        className={`pp-card ${flipped ? "isFlipped" : ""}`}
                        onClick={onCardTap}
                        style={{
                            cursor: "pointer",
                            outline: highlight ? "4px solid rgba(249,115,22,.55)" : "2px solid #e5e7eb",
                            boxShadow: highlight ? "0 16px 40px rgba(249,115,22,.25)" : "0 10px 24px rgba(0,0,0,0.12)",
                            animation: "pop 120ms ease-out",
                        }}
                        aria-label="プレートカード（タップで強調／裏返し）"
                        title="タップ：強調 → 裏返し"
                    >
                        {/* FRONT: SVG */}
                        <div className="pp-face">
                            <div
                                style={{
                                    padding: 14,
                                    height: "100%",
                                    boxSizing: "border-box",
                                    display: "grid",
                                    gridTemplateRows: "1fr auto",
                                    gap: 10,
                                }}
                            >
                                <div
                                    style={{
                                        borderRadius: 14,
                                        border: "2px solid #e5e7eb",
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#fff",
                                    }}
                                >
                                    <div
                                        style={{ width: "100%", height: "100%", padding: 10, boxSizing: "border-box" }}
                                        dangerouslySetInnerHTML={{ __html: plate.renderSvg }}
                                    />
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                                        {hasPhoto ? "裏面：保存画像あり" : "裏面：画像なし"}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>
                                        {flipped ? "裏面" : "表面"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BACK: PHOTO */}
                        <div className="pp-face pp-back">
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
                                        letterSpacing: 1,
                                        textAlign: "center",
                                        padding: 20,
                                        boxSizing: "border-box",
                                    }}
                                >
                                    画像が保存されていません
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
