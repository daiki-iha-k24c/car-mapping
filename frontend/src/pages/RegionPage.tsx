import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { regions } from "../data/regions";
import { listPlatesByRegionId } from "../storage/plates";

export default function RegionPage() {
  const { regionId } = useParams();
  const navigate = useNavigate();

  const region = useMemo(
    () => regions.find((r) => r.id === regionId),
    [regionId]
  );

  const count = regionId ? listPlatesByRegionId(regionId).length : 0;

  if (!regionId) return null;
  if (!region) return <div style={{ padding: 16 }}>地域が見つかりません</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{region.name}</h1>

        <button
          onClick={() => navigate(`/region/${regionId}/plates`)}
          disabled={count === 0}
          style={{
            marginLeft: "auto",
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            cursor: count === 0 ? "not-allowed" : "pointer",
            opacity: count === 0 ? 0.5 : 1,
          }}
        >
          ナンバープレートを見る（{count}）
        </button>
      </div>

      <p style={{ marginTop: 10, opacity: 0.8 }}>
        {region.prefectureName} / {region.name}
      </p>

      {/* ここに将来：登録フォーム導線・統計など追加できる */}
    </div>
  );
}
