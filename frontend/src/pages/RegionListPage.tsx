import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { regions } from "../lib/regionIndex";
import { useUser } from "../context/UserContext";
import { listPlatesByRegionIdCloud } from "../storage/platesCloud";

type Filter = "all" | "discovered" | "undiscovered";

type Area =
  | "北海道"
  | "東北"
  | "関東"
  | "中部"
  | "近畿"
  | "中国"
  | "四国"
  | "九州・沖縄";

const AREA_ORDER: Area[] = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州・沖縄"];

const PREF_TO_AREA: Record<string, Area> = {
  北海道: "北海道",

  青森県: "東北",
  岩手県: "東北",
  宮城県: "東北",
  秋田県: "東北",
  山形県: "東北",
  福島県: "東北",

  茨城県: "関東",
  栃木県: "関東",
  群馬県: "関東",
  埼玉県: "関東",
  千葉県: "関東",
  東京都: "関東",
  神奈川県: "関東",

  新潟県: "中部",
  富山県: "中部",
  石川県: "中部",
  福井県: "中部",
  山梨県: "中部",
  長野県: "中部",
  岐阜県: "中部",
  静岡県: "中部",
  愛知県: "中部",

  三重県: "近畿",
  滋賀県: "近畿",
  京都府: "近畿",
  大阪府: "近畿",
  兵庫県: "近畿",
  奈良県: "近畿",
  和歌山県: "近畿",

  鳥取県: "中国",
  島根県: "中国",
  岡山県: "中国",
  広島県: "中国",
  山口県: "中国",

  徳島県: "四国",
  香川県: "四国",
  愛媛県: "四国",
  高知県: "四国",

  福岡県: "九州・沖縄",
  佐賀県: "九州・沖縄",
  長崎県: "九州・沖縄",
  熊本県: "九州・沖縄",
  大分県: "九州・沖縄",
  宮崎県: "九州・沖縄",
  鹿児島県: "九州・沖縄",
  沖縄県: "九州・沖縄",
};

const PREF_ORDER_NORTH_TO_SOUTH = [
  // 北海道
  "北海道",

  // 東北
  "青森県",
  "岩手県",
  "秋田県",
  "宮城県",
  "山形県",
  "福島県",

  // 関東
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",

  // 中部
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "長野県",
  "山梨県",
  "岐阜県",
  "静岡県",
  "愛知県",

  // 近畿
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "三重県",

  // 中国
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",

  // 四国
  "香川県",
  "徳島県",
  "愛媛県",
  "高知県",

  // 九州・沖縄
  "福岡県",
  "佐賀県",
  "長崎県",
  "大分県",
  "熊本県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

function areaOfPref(pref: string): Area {
  return PREF_TO_AREA[pref] ?? "中部"; // 万一不明なら中部扱い
}

export default function RegionListPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();
  const { userId, loading } = useUser();

  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);

  // 地方ごとの折りたたみ状態
  const [openAreas, setOpenAreas] = useState<Record<Area, boolean>>(() => {
    const init: Record<Area, boolean> = {
      北海道: false,
      東北: false,
      関東: false,
      中部: false,
      近畿: false,
      中国: false,
      四国: false,
      九州・沖縄: false,
    };
    return init;
  });

  // ✅ まとめて取得（並列）
  useEffect(() => {
    if (loading) return;
    if (!userId) return;

    (async () => {
      setErr(null);

      const entries = await Promise.all(
        regions.map(async (r) => {
          const plates = await listPlatesByRegionIdCloud(userId, r.id);
          return [r.id, plates.length] as const;
        })
      );

      const m: Record<string, number> = {};
      for (const [rid, cnt] of entries) m[rid] = cnt;
      setCountMap(m);
    })().catch((e) => {
      console.error(e);
      setErr(e?.message ?? "読み込みに失敗しました");
    });
  }, [userId, loading]);

  const discoveredTotal = useMemo(() => {
    let n = 0;
    for (const r of regions) {
      if ((countMap[r.id] ?? 0) > 0) n++;
    }
    return n;
  }, [countMap]);

  // まず region を行データに変換
  const allRows = useMemo(() => {
    return regions.map((r) => {
      const count = countMap[r.id] ?? 0;
      const discovered = count > 0;
      const area = areaOfPref(r.pref);
      return { region: r, count, discovered, area };
    });
  }, [countMap]);

  // フィルタ適用
  const filteredRows = useMemo(() => {
    if (filter === "discovered") return allRows.filter((x) => x.discovered);
    if (filter === "undiscovered") return allRows.filter((x) => !x.discovered);
    return allRows;
  }, [allRows, filter]);

  // 地方でグルーピング
  const grouped = useMemo(() => {
    const m = new Map<Area, typeof filteredRows>();
    for (const a of AREA_ORDER) m.set(a, []);

    for (const row of filteredRows) {
      m.get(row.area)?.push(row);
    }

    // ✅ 都道府県の「北→南」優先順位
    // ここを useMemo 内に置くので「未定義エラー」にならない
    const prefOrderNorthToSouth = [
      "北海道",

      "青森県", "岩手県", "秋田県", "宮城県", "山形県", "福島県",

      "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",

      "新潟県", "富山県", "石川県", "福井県", "長野県", "山梨県", "岐阜県", "静岡県", "愛知県",

      "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "三重県",

      "鳥取県", "島根県", "岡山県", "広島県", "山口県",

      "香川県", "徳島県", "愛媛県", "高知県",

      "福岡県", "佐賀県", "長崎県", "大分県", "熊本県", "宮崎県", "鹿児島県", "沖縄県",
    ] as const;

    // indexOf を毎回回すと遅いので Map 化（型安全）
    const prefRank = new Map<string, number>();
    prefOrderNorthToSouth.forEach((p, i) => prefRank.set(p, i));

    // ✅ 同じ都道府県内の並び：地域名（五十音）で安定化
    for (const [area, arr] of m.entries()) {
      arr.sort((x, y) => {
        const px = prefRank.get(x.region.pref) ?? 9999;
        const py = prefRank.get(y.region.pref) ?? 9999;

        if (px !== py) return px - py;

        // 同一県なら地域名で安定ソート（見た目がブレない）
        return x.region.name.localeCompare(y.region.name, "ja");
      });

      m.set(area, arr);
    }

    return m;
  }, [filteredRows]);


  // 地方ごとのサマリ（発見数/総数）
  const areaSummary = useMemo(() => {
    const out = new Map<Area, { total: number; discovered: number }>();
    for (const a of AREA_ORDER) out.set(a, { total: 0, discovered: 0 });

    for (const row of allRows) {
      const s = out.get(row.area)!;
      s.total += 1;
      if (row.discovered) s.discovered += 1;
    }
    return out;
  }, [allRows]);

  if (loading) {
    return <div className="container" style={{ padding: 16, opacity: 0.7 }}>読み込み中...</div>;
  }

  if (!userId) {
    return <div className="container" style={{ padding: 16, opacity: 0.7 }}>ログイン確認中...</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>地域一覧</h2>
          <div className="small">発見済み：{discoveredTotal} / {regions.length}</div>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">← ホーム</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
        <button className="btn" onClick={() => setFilter("all")} style={{ opacity: filter === "all" ? 1 : 0.6 }}>
          すべて
        </button>
        <button className="btn" onClick={() => setFilter("discovered")} style={{ opacity: filter === "discovered" ? 1 : 0.6 }}>
          発見済み
        </button>
        <button className="btn" onClick={() => setFilter("undiscovered")} style={{ opacity: filter === "undiscovered" ? 1 : 0.6 }}>
          未発見
        </button>

        {/* <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => {
              const next: Record<Area, boolean> = { ...openAreas };
              for (const a of AREA_ORDER) next[a] = true;
              setOpenAreas(next);
            }}
          >
            すべて開く
          </button>
          <button
            className="btn"
            onClick={() => {
              const next: Record<Area, boolean> = { ...openAreas };
              for (const a of AREA_ORDER) next[a] = false;
              setOpenAreas(next);
            }}
          >
            すべて閉じる
          </button>
        </div> */}
      </div>

      {err && (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb4b4",
            color: "#a40000",
            padding: 10,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}

      {/* 地方ごと */}
      <div style={{ display: "grid", gap: 14 }}>
        {AREA_ORDER.map((area) => {
          const rows = grouped.get(area) ?? [];
          const sum = areaSummary.get(area) ?? { total: 0, discovered: 0 };
          if (sum.total === 0) return null;

          const open = openAreas[area];

          return (
            <div
              key={area}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {/* 地方ヘッダー */}
              <button
                onClick={() => setOpenAreas((p) => ({ ...p, [area]: !p[area] }))}
                style={{
                  width: "100%",
                  border: "none",
                  background: "#fff",
                  padding: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{area}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    発見 {sum.discovered} / {sum.total}
                  </div>
                </div>
                <div style={{ opacity: 0.7, fontWeight: 800 }}>{open ? "▲" : "▼"}</div>
              </button>

              {/* 中身 */}
              {open && (
                <div style={{ borderTop: "1px solid #f1f1f1" }}>
                  {rows.map(({ region, count, discovered }) => (
                    <div
                      key={region.id}
                      style={{
                        padding: 14,
                        borderTop: "1px solid #f6f6f6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        opacity: discovered ? 1 : 0.7,
                      }}
                      onClick={() => navigate(`/region/${region.id}`)}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{region.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{region.pref}</div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, opacity: 0.85 }}>
                          {discovered ? `プレート ${count}` : "未発見"}
                        </span>
                        <span style={{ opacity: 0.6 }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
