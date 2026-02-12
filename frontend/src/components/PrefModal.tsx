import { useState } from "react";
import { listPlatesCloudByRegionId } from "../storage/platesCloud";
import type { Plate } from "../storage/plates";

type Props = {
  open: boolean;
  prefName: string | null;
  regionsInPref: any[];
  recordMap: any;
  userId: string | null;
  onClose: () => void;
  onOpenPlate: (p: Plate) => void;
};

type PlateRow = {
  id: string;
  region_id: string;
  class_number: string;
  kana: string;
  serial: string;
  color: any;
  render_svg: string;
  created_at: string;
  photo_url: string | null;

  // ✅ これを追加
  captured_at: string | null;
};


function rowToPlate(r: PlateRow): Plate {
  return {
    id: r.id,
    regionId: r.region_id,
    classNumber: r.class_number,
    kana: r.kana,
    serial: r.serial,
    color: r.color,
    renderSvg: r.render_svg,
    createdAt: r.created_at,
    photo_url: r.photo_url ?? null,

    // ✅ これを必ず追加
    capturedAt: r.captured_at ?? null,
  };
}


export default function PrefModal({
  open,
  prefName,
  regionsInPref,
  recordMap,
  userId,
  onClose,
  onOpenPlate,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [platesMap, setPlatesMap] = useState<Record<string, PlateRow[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(regionId: string) {
    const next = expandedId === regionId ? null : regionId;
    setExpandedId(next);

    if (!next || !userId) return;

    // 既に読み込み済みなら再取得しない
    if (platesMap[next]) return;

    setLoadingId(next);
    try {
      const rows = await listPlatesCloudByRegionId(userId, next);
      setPlatesMap((m) => ({ ...m, [next]: rows as PlateRow[] }));
    } catch (e) {
      console.error("failed to load plates:", e);
      setPlatesMap((m) => ({ ...m, [next]: [] }));
    } finally {
      setLoadingId(null);
    }
  }

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
                const regionId = String(r.id ?? r.regionId ?? r.code ?? "");
                const regionName = String(r.name ?? r.regionName ?? r.label ?? "地域");
                if (!regionId) return null;

                const completed = Boolean(recordMap?.[regionId]?.completed);
                const isOpen = expandedId === regionId;

                const rows = platesMap[regionId] ?? [];
                const plates = rows.map(rowToPlate);

                return (
                  <div
                    key={regionId}
                    style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}
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
                      onClick={() => toggle(regionId)}
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
                      <div style={{ marginTop: 10 }}>
                        {loadingId === regionId ? (
                          <div style={{ opacity: 0.6, fontSize: 13 }}>読み込み中...</div>
                        ) : plates.length === 0 ? (
                          <div style={{ opacity: 0.6, fontSize: 13 }}>まだ登録がありません</div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: 8,
                            }}
                          >
                            {plates.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // ✅ ここは「拡大モーダルを開く」にする
                                  onOpenPlate(p); // ← HomePage/PrefModal側にある関数を使う（あなたが持ってるやつ）
                                }}
                                style={{
                                  border: "2px solid #e5e7eb",
                                  borderRadius: 14,
                                  background: "#fff",
                                  padding: 8,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
                                }}
                              >
                                {/* サムネ（固定高さ） */}
                                <div
                                  style={{
                                    height: 90,
                                    borderRadius: 12,
                                    border: "2px solid #e5e7eb",
                                    overflow: "hidden",
                                    background: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      padding: 6,
                                      boxSizing: "border-box",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: p.renderSvg }}
                                  />
                                </div>

                                {/* 下の情報（小さく） */}
                                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
                                  <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                                    {p.photo_url ? "📸あり" : "📷なし"}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
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
