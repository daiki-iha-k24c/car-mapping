import { useNavigate } from "react-router-dom";
import { listPlatesByRegionId } from "../storage/plates";
import { useState } from "react";


type Props = {
  open: boolean;
  prefName: string | null;
  regionsInPref: any[];
  recordMap: any;
  onClose: () => void;
};

export default function PrefModal({
  open,
  prefName,
  regionsInPref,
  recordMap,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!open || !prefName) return null;

  return (
    // 🔽 背景（ここをタップしたら閉じる）
    <div
      onMouseDown={onClose}
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
      {/* 🔽 中身（ここをタップしても閉じない） */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>
            {prefName} ({regionsInPref.length})
          </h3>
          <button className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {regionsInPref.length === 0 ? (
            <div style={{ opacity: 0.7 }}>この都道府県の地域データがありません。</div>
          ) : (
            regionsInPref.map((r) => {
              const plates = listPlatesByRegionId(r.id);
              const count = plates.length;
              const discovered = count > 0;
              const isOpen = expandedId === r.id;

              return (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                  {/* 行本体：ここを押せるようにする */}
                  <button
                    type="button"
                    disabled={!discovered}
                    onClick={() => {
                      if (!discovered) return;
                      setExpandedId((prev) => (prev === r.id ? null : r.id));
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: "none",
                      background: "transparent",
                      padding: "6px 4px",
                      textAlign: "left",
                      cursor: discovered ? "pointer" : "default",
                      opacity: discovered ? 1 : 0.55,
                    }}
                  >
                    {/* 左：地域名 */}
                    <div style={{ fontWeight: 700 }}>{r.name}</div>

                    {/* 右：ステータス */}
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {discovered ? `発見済み（${count}）` : "未発見"}
                      </span>

                      {/* 右端：開閉アイコン（文字でOK） */}
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {discovered ? (isOpen ? "▲" : "▼") : ""}
                      </span>
                    </div>
                  </button>

                  {/* 展開エリア */}
                  {isOpen && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 12,
                        background: "#fafafa",
                        border: "1px solid #eee",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        {plates.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              borderRadius: 12,
                              padding: 8,
                              background: "#fff",
                              border: "1px solid #e5e7eb",
                              overflow: "hidden",
                            }}
                          >
                            <div className="plate-svg-wrap" dangerouslySetInnerHTML={{ __html: p.renderSvg }} />
                          </div>
                        ))}

                      </div>
                    </div>
                  )}
                </div>
              );
            })


          )}
        </div>

      </div>
    </div>
  );
}
