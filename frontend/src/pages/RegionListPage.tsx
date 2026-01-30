import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { regions } from "../lib/regionIndex";
import { listPlatesByRegionId } from "../storage/plates";

type Filter = "all" | "discovered" | "undiscovered";

export default function RegionListPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const list = regions.map((r) => {
      const count = listPlatesByRegionId(r.id).length;
      const discovered = count > 0;
      return { region: r, count, discovered };
    });

    if (filter === "discovered") return list.filter((x) => x.discovered);
    if (filter === "undiscovered") return list.filter((x) => !x.discovered);
    return list;
  }, [filter]);

  const discoveredTotal = useMemo(() => {
    let n = 0;
    for (const r of regions) {
      if (listPlatesByRegionId(r.id).length > 0) n++;
    }
    return n;
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>地域一覧</h2>
          <div className="small">
            北→南（areaOrder昇順） / 発見済み {discoveredTotal}/{regions.length}
          </div>
        </div>
        <Link to="/" className="btn">
          ホーム
        </Link>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className={`btn ${filter === "all" ? "primary" : ""}`}
            onClick={() => setFilter("all")}
          >
            全て
          </button>
          <button
            className={`btn ${filter === "undiscovered" ? "primary" : ""}`}
            onClick={() => setFilter("undiscovered")}
          >
            未発見
          </button>
          <button
            className={`btn ${filter === "discovered" ? "primary" : ""}`}
            onClick={() => setFilter("discovered")}
          >
            発見済み
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="list">
          {rows.map(({ region, discovered, count }) => (
            <div key={region.id} className="item">
              <div>
                <strong>{region.name}</strong>{" "}
                <span className={`badge ${discovered ? "done" : "todo"}`}>
                  {discovered ? `発見済み（${count}）` : "未発見"}
                </span>
                <div className="meta">{region.pref}</div>
              </div>

              <button
                className="btn"
                disabled={!discovered}
                onClick={() => navigate(`/region/${region.id}/plates`)}
                style={{
                  opacity: discovered ? 1 : 0.5,
                  cursor: discovered ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                見る
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
