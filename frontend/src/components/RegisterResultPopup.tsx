// RegisterResultPopup.tsx
// RegisterResultPopup.tsx
import React from "react";
import type { RegisterResult } from "../storage/platesCloud"; // ✅ これだけ

function Badge({
    children,
    tone = "blue",
}: {
    children: React.ReactNode;
    tone?: "blue" | "amber" | "green" | "gray" | "red";
}) {
    const map: Record<string, { bg: string; fg: string; bd: string }> = {
        blue: { bg: "rgba(59,130,246,0.10)", fg: "#1d4ed8", bd: "rgba(59,130,246,0.20)" },
        amber: { bg: "rgba(245,158,11,0.14)", fg: "#92400e", bd: "rgba(245,158,11,0.25)" },
        green: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", bd: "rgba(16,185,129,0.25)" },
        gray: { bg: "rgba(107,114,128,0.10)", fg: "#374151", bd: "rgba(107,114,128,0.20)" },
        red: { bg: "rgba(239,68,68,0.12)", fg: "#991b1b", bd: "rgba(239,68,68,0.22)" },
    };

    const t = map[tone] ?? map.blue;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: t.bg,
                color: t.fg,
                border: `1px solid ${t.bd}`,
                fontWeight: 900,
                fontSize: 12,
                lineHeight: 1,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </span>
    );
}

function Em({ children }: { children: React.ReactNode }) {
    return <span style={{ fontWeight: 900 }}>{children}</span>;
}

function BigNum({
    children,
    tone = "blue",
}: {
    children: React.ReactNode;
    tone?: "blue" | "amber" | "green";
}) {
    const fg =
        tone === "green" ? "#16a34a" : tone === "amber" ? "#f97316" : "#2563eb";

    return (
        <span style={{ fontWeight: 1000, fontSize: 18, color: fg, letterSpacing: 0.2 }}>
            {children}
        </span>
    );
}

export function RegisterResultPopup({
    open,
    onClose,
    result,
}: {
    open: boolean;
    onClose: () => void;
    result: RegisterResult | null;
}) {
    if (!open || !result) return null;

    const personalIsNewRegion = !result.regionAlreadyRegistered;
    const personalIsNewSerial = !result.serialAlreadyInMyCollection;

    const globalIsNewRegion =
        result.globalRegionKnown && !result.regionAlreadyRegisteredGlobal;
    const globalIsNewSerial = !result.serialAlreadyGlobal;

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
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20000,
                padding: 14,
            }}
        >
            <div
                style={{
                    width: "min(580px, 96vw)",
                    background: "#fff",
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                    padding: 14,
                }}
            >
                {/* header */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>登録が完了しました 🎉</div>
                            {personalIsNewRegion && <Badge tone="green">NEW 地域</Badge>}
                            {personalIsNewSerial && <Badge tone="amber">NEW ナンバー</Badge>}
                        </div>

                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <Badge tone="blue">📍 {result.regionName}</Badge>
                            <Badge tone="amber">🪪 {result.numberLabel}</Badge>
                        </div>
                    </div>

                    <button className="btn" onClick={onClose} aria-label="閉じる">
                        ✕
                    </button>
                </div>

                <div style={{ height: 12 }} />

                {/* ～個人～ */}
                <section
                    style={{
                        background: "rgba(59,130,246,0.06)",
                        border: "1px solid rgba(59,130,246,0.15)",
                        borderRadius: 14,
                        padding: 12,
                    }}
                >
                    <div style={{ fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>
                        ～個人～ 👤
                    </div>

                    <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                        {/* 地域 */}
                        <div>
                            ・
                            {result.regionAlreadyRegistered ? (
                                <>
                                    この地域は既に登録されています（
                                    <BigNum tone="blue">{result.regionPlateIndex}</BigNum>枚目）
                                </>
                            ) : (
                                <>
                                    <Em>「{result.regionName}」</Em>のプレートが初めて登録されました（
                                    <BigNum tone="blue">{result.totalRegions}</BigNum>地域目）
                                </>
                            )}
                        </div>

                        {/* ナンバー */}
                        <div>
                            ・
                            {result.serialAlreadyInMyCollection ? (
                                <>
                                    <Em>「{result.numberLabel}」</Em>は既にナンバーコレクションに登録されています
                                </>
                            ) : (
                                <>
                                    <Em>「{result.numberLabel}」</Em>のプレートがナンバーコレクションに登録されました
                                </>
                            )}
                        </div>

                        {/* 総地域 */}
                        <div>
                            ・総登録プレート数が <BigNum tone="blue">{result.totalPlates}</BigNum> 枚になりました
                        </div>
                        {/* ポイント */}
                        <div>
                            ・このプレートのポイントは{" "}
                            <BigNum tone="amber">{result.platePoints}pt</BigNum>、総獲得ポイントが{" "}
                            <BigNum tone="green">{result.totalPoints}pt</BigNum> になりました
                        </div>
                    </div>
                </section>

                <div style={{ height: 10 }} />

                {/* ～グローバル～ */}
                <section
                    style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.18)",
                        borderRadius: 14,
                        padding: 12,
                    }}
                >
                    <div style={{ fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>
                        ～グローバル～ 🌍
                    </div>

                    <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                        {/* 地域 */}
                        <div>
                            ・
                            {!result.globalRegionKnown ? (
                                <span style={{ color: "#6b7280" }}>
                                    この地域のグローバル判定は取得できませんでした（権限設定次第で表示できます）
                                </span>
                            ) : result.regionAlreadyRegisteredGlobal ? (
                                <>
                                    この地域は既に誰かに登録されています{" "}
                                    <Badge tone="gray">既登録</Badge>
                                </>
                            ) : (
                                <>
                                    <Em>「{result.regionName}」</Em>のプレートがみんなの地図に初めて登録されました{" "}
                                    <Badge tone="green">NEW</Badge>
                                </>
                            )}
                        </div>

                        {/* ナンバー */}
                        <div>
                            ・
                            {result.serialAlreadyGlobal ? (
                                <>
                                    <Em>「{result.numberLabel}」</Em>は既に誰かがみんなのナンバーコレクションに登録しています{" "}
                                    <Badge tone="gray">既登録</Badge>
                                </>
                            ) : (
                                <>
                                    <Em>「{result.numberLabel}」</Em>のプレートがみんなのナンバーコレクションに登録されました{" "}
                                    <Badge tone="green">NEW</Badge>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <div style={{ height: 14 }} />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn" onClick={onClose}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}