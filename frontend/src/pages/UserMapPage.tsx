import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import JapanMap from "../components/JapanMap";
import { supabase } from "../lib/supabaseClient";
import { regions, buildPrefProgress } from "../lib/regionIndex";
import type { RegionRecord } from "../lib/region";

type ProfileRow = {
  user_id: string;
  username: string;
};

type RegionRecordRow = {
  region_id: string;
  completed: boolean;
  completed_at: string | null;
  memo: string | null;
};

export default function UserMapPage() {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [targetProfile, setTargetProfile] = useState<ProfileRow | null>(null);
  const [recordMap, setRecordMap] = useState<Record<string, RegionRecord>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const u = (username ?? "").trim();
      if (!u) {
        setErr("ユーザーが指定されていません");
        setLoading(false);
        return;
      }

      // 1) username → user_id を取得
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("username", u)
        .maybeSingle<ProfileRow>();

      if (profErr) throw profErr;
      if (!prof) {
        setErr("ユーザーが見つかりません");
        setTargetProfile(null);
        setRecordMap({});
        setLoading(false);
        return;
      }

      setTargetProfile(prof);

      // 2) region_records を取得（RLSで許可されていれば読める）
      const { data: rows, error: rrErr } = await supabase
        .from("region_records")
        .select("region_id, completed, completed_at, memo")
        .eq("user_id", prof.user_id);

      if (rrErr) {
        // ここで弾かれる場合は、RLSで閲覧不可
        // （後で public/friends にする時に解決）
        const msg = String(rrErr.message || "");
        setErr(
          msg.includes("permission") || msg.includes("not allowed")
            ? "このユーザーの地図は非公開です"
            : rrErr.message
        );
        setRecordMap({});
        setLoading(false);
        return;
      }

      const m: Record<string, RegionRecord> = {};
      for (const r of (rows ?? []) as RegionRecordRow[]) {
        m[r.region_id] = {
          regionId: r.region_id,
          completed: !!r.completed,
          completedAt: r.completed_at ?? undefined,
          memo: r.memo ?? "",
        };
      }
      setRecordMap(m);

      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setErr(e?.message ?? "読み込みに失敗しました");
      setLoading(false);
    });
  }, [username]);

  const prefProgress = useMemo(() => buildPrefProgress(regions, recordMap), [recordMap]);

  const completedCount = useMemo(() => {
    let n = 0;
    for (const rec of Object.values(recordMap)) {
      if (rec.completed) n++;
    }
    return n;
  }, [recordMap]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>
            {targetProfile ? `${targetProfile.username} の地図` : "ユーザー地図"}
          </h2>
          <div className="small">
            {targetProfile ? `達成：${completedCount} 地域` : ""}
          </div>
        </div>

        <div className="header-actions">
          <Link to="/ranking" className="btn">
            ← ランキングに戻る
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 12, opacity: 0.7 }}>読み込み中...</div>
      ) : err ? (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb4b4",
            color: "#a40000",
            padding: 10,
            borderRadius: 12,
            margin: 12,
          }}
        >
          {err}
        </div>
      ) : (
        <div className="stack" style={{ paddingTop: 8 }}>
          <JapanMap prefStatusMap={prefProgress} onPickPrefecture={() => {}} />
          <div style={{ fontSize: 12, opacity: 0.7, padding: "0 4px" }}>
            ※ 現状は「表示のみ」です（フレンド/公開設定は次で追加）
          </div>
        </div>
      )}
    </div>
  );
}
