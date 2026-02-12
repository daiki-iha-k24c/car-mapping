import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";
import type { Region } from "../lib/region";
import { getMyTotalPointsCloud } from "../storage/platesCloud";


type Props = {
  regions: Array<Region & { reading?: string }>; // 全地域（分母）
  refreshKey?: number; // ✅ 追加
};

export default function UserSummaryBar({regions, refreshKey = 0  }: Props) {
  const { userId } = useUser();

  const totalRegions = regions.length;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [completedRegions, setCompletedRegions] = useState(0);
  const [totalPlates, setTotalPlates] = useState(0);

  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [pointsLoading, setPointsLoading] = useState(false);


  useEffect(() => {
    if (!userId) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // ✅ 1) 達成地域数（completed=true の region_records 件数）
        const { count: regionDoneCount, error: rrErr } = await supabase
          .from("region_records")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", true);

        if (rrErr) throw rrErr;

        // ✅ 2) 総登録プレート数（plates 件数）
        const { count: plateCount, error: pErr } = await supabase
          .from("plates")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (pErr) throw pErr;

        if (!alive) return;
        setCompletedRegions(regionDoneCount ?? 0);
        setTotalPlates(plateCount ?? 0);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message ?? e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setPointsLoading(true);
      try {
        const pts = await getMyTotalPointsCloud(userId);
        setTotalPoints(pts);
      } finally {
        setPointsLoading(false);
      }
    })();
  }, [userId, refreshKey]);


  const pct = useMemo(() => {
    if (!totalRegions) return 0;
    return Math.round((completedRegions / totalRegions) * 100);
  }, [completedRegions, totalRegions]);

  if (!userId) return null;

  return (
    <div className="summaryBar">
      {loading ? (
        <div className="summarySkeleton">読み込み中…</div>
      ) : err ? (
        <div className="summaryError">⚠️ サマリー取得に失敗：{err}</div>
      ) : (
        <>
          <div className="summaryItem">
            <div className="summaryLabel">登録地域</div>
            <div className="summaryValue">
              {completedRegions} / {totalRegions}
              <span className="summarySub2">（{pct}%）</span>
            </div>
          </div>

          <div className="summaryDivider" />

          <div className="summaryItem">
            <div className="summaryLabel">総登録プレート</div>
            <div className="summaryValue">
              {totalPlates}
              <span className="summarySub">枚</span>
              <span className="summarySub2">
                （{pointsLoading ? "…" : `${totalPoints}pt`}）
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
