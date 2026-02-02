import { useState } from "react";
import { listPlatesByRegionId } from "../storage/plates";

type Props = {
  open: boolean;
  prefName: string | null;
  regionsInPref: any[];
  recordMap: any;
  userId: string | null; // ✅ 追加
  onClose: () => void;
};

export default function PrefModal({
  open,
  prefName,
  regionsInPref,
  recordMap,
  userId,
  onClose,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fixSvgViewBox = (svg: string) =>
    svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');

  const toSvgDataUrlBase64 = (svg: string) =>
    `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  if (!open || !prefName) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(800px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          padding: 16,
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>{prefName}</h3>
          <button className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        {!userId ? (
          <div style={{ marginTop: 12, opacity: 0.7 }}>読み込み中...</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {regionsInPref.length === 0 ? (
              <div style={{ opacity: 0.7 }}>この都道府県の地域データがありません。</div>
            ) : (
              regionsInPref.map((r) => {
                const regionId = r.id ?? r.regionId ?? r.code;
                const regionName = r.name ?? r.regionName ?? r.label ?? "地域";

                const completed = Boolean(recordMap?.[regionId]?.completed);
                const isOpen = expandedId === regionId;

                // ✅ 展開時だけプレートを読む
                const plates = isOpen ? listPlatesByRegionId(userId, regionId) : [];

                return (
                  <div
                    key={regionId}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {/* 行ヘッダー */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(isOpen ? null : regionId)}
                    >
                      <div style={{ fontWeight: 700 }}>{regionName}</div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            opacity: completed ? 1 : 0.5,
                            background: completed ? "#fff" : "#f8fafc",
                          }}
                        >
                          {completed ? `発見済み（${plates.length}）` : "未発見"}
                        </span>
                        <span style={{ opacity: 0.7 }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* 展開中 */}
                    {isOpen && (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {plates.length === 0 ? (
                          <div style={{ opacity: 0.6, fontSize: 13 }}>まだ登録がありません</div>
                        ) : (
                          plates.map((p: any) => {
                            const safeSvg = fixSvgViewBox(p.renderSvg);
                            const src = toSvgDataUrlBase64(safeSvg);

                            return (
                              <div
                                key={p.id}
                                style={{
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 12,
                                  padding: 10,
                                  background: "#fff",
                                  overflow: "hidden",
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <img className="plate-img" src={src} alt="" loading="lazy" />
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
