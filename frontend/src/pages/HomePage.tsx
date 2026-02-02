import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JapanMap from "../components/JapanMap";
import CompleteModal from "../components/CompleteModal";
import PrefModal from "../components/PrefModal";
import HelpModal from "../components/HelpModal";
import PlateRegisterModal from "../components/PlateRegisterModal";

import type { Region, RegionRecord } from "../lib/region";
import { regions, buildPrefProgress } from "../lib/regionIndex";
import { PLATE_REGIONS } from "../data/plateRegions";

import { supabase } from "../lib/supabaseClient";
import { loadRecords, saveRecords, clearRecords } from "../lib/storage";
import { clearPlates } from "../storage/plates";

import { useUser } from "../context/UserContext";
import { loadRecordsCloud, saveRecordsCloud, clearRecordsCloud } from "../storage/regionRecordsCloud";

function normRegionName(s: string) {
  return (s || "").trim().replace(/\s+/g, "");
}

function findRegionByName(name: string): Region | null {
  const key = normRegionName(name);
  if (!key) return null;

  const exact = regions.find((r) => normRegionName(r.name) === key);
  if (exact) return exact;

  const partial = regions.find(
    (r) => normRegionName(r.name).includes(key) || key.includes(normRegionName(r.name))
  );
  return partial ?? null;
}

export default function HomePage() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [picked, setPicked] = useState<Region | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const [pickedPref, setPickedPref] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const { userId, loading } = useUser();
  const [recordMap, setRecordMap] = useState<Record<string, RegionRecord>>({});


  // ✅ ホームから開く登録モーダル
  const [plateOpen, setPlateOpen] = useState(false);

  // ✅ localStorage分離に使う userId（Supabase user.id）
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [me, setMe] = useState<{ username: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setMe(data ?? null);
    })();
  }, []);

  // ✅ 地図達成の記録

  // 1) セッション確認 + username確認 → OKなら userId 確定
  useEffect(() => {
    (async () => {
      let { data: sess } = await supabase.auth.getSession();
      let user = sess.session?.user;

      if (!user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        user = res.data.user!;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!profile?.username) {
        navigate("/onboarding");
        return;
      }

      setAuthUserId(user.id);
    })().catch(console.error);
  }, [navigate]);

  // 2) userIdが確定したら localStorage をロード
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const m = await loadRecordsCloud(userId);
      setRecordMap(m);
    })().catch(console.error);
  }, [userId]);

  // 3) recordMap が変わったら保存（※レンダー中に保存しない）
  useEffect(() => {
    if (!userId) return;
    saveRecordsCloud(userId, recordMap).catch(console.error);
  }, [userId, recordMap]);


  const prefProgress = useMemo(
    () => buildPrefProgress(regions, recordMap),
    [recordMap]
  );

  const openPref = (prefName: string) => {
    setPickedPref(prefName);
    setPrefOpen(true);
  };

  const closePref = () => {
    setPrefOpen(false);
    setPickedPref(null);
  };

  const openComplete = (region: Region) => {
    setPicked(region);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setPicked(null);
  };

  const alreadyDone = picked ? !!recordMap[picked.id]?.completed : false;

  const confirmComplete = (memo: string) => {
    if (!picked) return;
    const now = new Date().toISOString();

    setRecordMap((prev) => ({
      ...prev,
      [picked.id]: {
        regionId: picked.id,
        completed: true,
        completedAt: prev[picked.id]?.completedAt ?? now,
        memo,
      },
    }));

    closeModal();
  };

  const readingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of PLATE_REGIONS) {
      m.set(`${p.prefecture}|${p.name}`, p.reading);
    }
    return m;
  }, []);

  const normPref = (s: string) => {
    if (s.endsWith("都") || s.endsWith("道") || s.endsWith("府") || s.endsWith("県")) return s;
    if (s === "北海道") return "北海道";
    return `${s}県`;
  };

  const regionsInPref = useMemo(() => {
    if (!pickedPref) return [];
    const target = normPref(pickedPref);
    return regions.filter((r) => normPref(r.pref) === target);
  }, [pickedPref]);

  const regionsWithReading = useMemo(() => {
    return regions.map((r) => ({
      ...r,
      reading: readingMap.get(`${r.pref}|${r.name}`) ?? "",
    }));
  }, [readingMap]);

  // ✅ PlateRegisterModal 完了 → 地域を達成にする
  const markCompletedByRegionName = (regionName: string) => {
    const region = findRegionByName(regionName);
    if (!region) return;

    const now = new Date().toISOString();
    setRecordMap((prev) => ({
      ...prev,
      [region.id]: {
        regionId: region.id,
        completed: true,
        completedAt: prev[region.id]?.completedAt ?? now,
        memo: prev[region.id]?.memo ?? "",
      },
    }));
  };

  const handleClearAll = () => {
    if (!userId) return;
    setRecordMap({});
    clearRecordsCloud(userId).catch(console.error);
    // plates は次のフェーズ（今はローカルのままでOK）
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ナンバープレート</h2>
          <div className="small">地域を記録して、地図を塗りつぶす</div>
        </div>

        <div className="header-actions">
          {/* ✅ 追加：ユーザー表示 */}
          {me?.username && (
            <button
              type="button"
              className="header-user"
              onClick={() => navigate("/me")}
              aria-label="ユーザーページへ"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginRight: 8,
                background: "ffffff",
                padding: "8px",
                cursor: "pointer",
                border: "1px solid black",
                borderRadius: "10px",
              }}
            >
              <img
                src={me.avatar_url || "/avatar-default.png"}
                alt="avatar"
                width={30}
                height={30}
                style={{
                  borderRadius: "999px",
                  objectFit: "cover",
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {me.username}
              </span>
            </button>
          )}

          <div className="actions-mobile">
            <button
              className="btn"
              aria-label="メニュー"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>

            {menuOpen && (
              <div className="menu-popover" role="menu">
                <Link
                  to="/regions"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🗾地域一覧
                </Link>

                <Link
                  to="/ranking"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  👑ランキング
                </Link>

                <Link
                  to="/group"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🗾みんなで埋める日本地図
                </Link>

                <Link
                  to="/friends"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}>
                  👥 フレンド
                </Link>


                <button
                  className="menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setHelpOpen(true);
                  }}
                >
                  ⓘ 遊び方
                </button>


              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stack">
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            className="btn"
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "none",
              fontSize: 21,
              fontWeight: "bold",
              textShadow: "2px 2px 2px rgba(0,0,0,0.8)",
              color: "#fff",
              boxShadow: "0 6px 16px #a2d7dd",
              backgroundImage:
                "radial-gradient(circle at 100% 0%, rgba(111, 109, 255, 0.97) 15%, rgba(92,243,61,0.68))",
              opacity: 0.7,
            }}
            onClick={() => setPlateOpen(true)}
            disabled={!userId} // ✅ userId確定前は押せない
            title={!userId ? "ログイン確認中..." : ""}
          >
            ナンバープレートを登録
          </button>
        </div>

        <JapanMap prefStatusMap={prefProgress} onPickPrefecture={openPref} />

        <PrefModal
          open={prefOpen}
          prefName={pickedPref}
          regionsInPref={regionsInPref}
          recordMap={recordMap}
          userId={userId}
          onClose={closePref}
        // PrefModal内で地域クリック→達成モーダルを開く設計ならこれを渡す
        // onPickRegion={openComplete}
        />
      </div>

      <CompleteModal
        open={modalOpen}
        region={picked}
        alreadyDone={alreadyDone}
        defaultMemo={picked ? recordMap[picked.id]?.memo ?? "" : ""}
        onClose={closeModal}
        onConfirm={confirmComplete}
      />

      <PlateRegisterModal
        open={plateOpen}
        userId={userId}
        regions={regionsWithReading}
        onClose={() => setPlateOpen(false)}
        onRegistered={(regionName: string) => {
          markCompletedByRegionName(regionName);
        }}
      />

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onClearAll={handleClearAll}
      />
    </div >
  );
}
