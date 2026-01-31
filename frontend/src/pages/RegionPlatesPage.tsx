import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { regions } from "../lib/regionIndex"; // ← lib側のregions
import { listPlatesByRegionId } from "../storage/plates";

export default function RegionPlatesPage() {
  const { regionId } = useParams();
  if (!regionId) return null;

  const region = useMemo(() => regions.find((r) => r.id === regionId), [regionId]);
  const plates = listPlatesByRegionId(regionId);

  if (!region) return <div style={{ padding: 16 }}>地域が見つかりません</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>{region.name} のナンバープレート</h2>
        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          {plates.length}枚
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Link to="/" style={{ fontSize: 14 }}>← 地図へ戻る</Link>
      </div>

      {plates.length === 0 ? (
        <p style={{ marginTop: 16 }}>まだ登録がありません</p>
      ) : (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {plates.map((p) => {
            const src = `data:image/svg+xml;base64,${btoa(
              unescape(encodeURIComponent(p.renderSvg))
            )}`;

            return (
              <div
                key={p.id}
                style={{
                  borderRadius: 12,
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img className="plate-img" src={src} alt="" loading="lazy" />
              </div>
            );
          })}

        </div>

      )}
    </div>
  );
}
