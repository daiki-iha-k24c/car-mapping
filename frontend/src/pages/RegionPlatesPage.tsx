import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { regions } from "../lib/regionIndex";
import { listPlatesByRegionId } from "../storage/plates";
import { supabase } from "../lib/supabaseClient";

export default function RegionPlatesPage() {
  const { regionId } = useParams();
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // userId取得（HomePageと同じ：匿名ログイン含む）
  useEffect(() => {
    (async () => {
      let { data: sess } = await supabase.auth.getSession();
      let user = sess.session?.user;

      if (!user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        user = res.data.user!;
      }

      setAuthUserId(user.id);
    })().catch(console.error);
  }, []);

  const region = useMemo(() => {
    if (!regionId) return null;
    return regions.find((r) => r.id === regionId) ?? null;
  }, [regionId]);

  const plates = useMemo(() => {
    if (!regionId) return [];
    if (!authUserId) return [];
    return listPlatesByRegionId(authUserId, regionId);
  }, [authUserId, regionId]);

  if (!regionId) return null;

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>{region ? `${region.name} のプレート` : "プレート一覧"}</h2>
          <div className="small">{region ? region.pref : ""}</div>
        </div>

        <div className="header-actions">
          <Link to="/regions" className="btn">
            ← 地域一覧
          </Link>
        </div>
      </div>

      {!authUserId ? (
        <div style={{ opacity: 0.7, padding: 12 }}>読み込み中...</div>
      ) : plates.length === 0 ? (
        <div style={{ opacity: 0.7, padding: 12 }}>まだ登録がありません。</div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {plates.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              {/* renderSvg を表示（既存仕様に合わせる） */}
              <div
                dangerouslySetInnerHTML={{ __html: p.renderSvg }}
                style={{ width: "100%", overflow: "hidden" }}
              />

              <div style={{ marginTop: 8, opacity: 0.85 }}>
                <div style={{ fontWeight: 700 }}>
                  {p.classNumber} {p.kana} {p.serial}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
