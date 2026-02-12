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
import { useUser } from "../context/UserContext";
import { loadRecordsCloud, saveRecordsCloud, clearRecordsCloud } from "../storage/regionRecordsCloud";
import PlatePeekModal from "../components/PlatePeekModal";
import { listPlatesCloud } from "../storage/platesCloud";
import type { Plate } from "../storage/plates";
import UserSummaryBar from "../components/UserSummaryBar";


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
  const { username } = useUser();
  const AVATAR_BUCKET = "avatars";
  const [summaryRefresh, setSummaryRefresh] = useState(0);





  // ✅ ホームから開く登録モーダル
  const [plateOpen, setPlateOpen] = useState(false);
  // ✅ 登録済みプレート一覧（ホームで表示＆ポップアップ用）
  const [plates, setPlates] = useState<Plate[]>([]);
  const [peekOpen, setPeekOpen] = useState(false);
  const [peekPlate, setPeekPlate] = useState<Plate | null>(null);

  const openPlate = (p: Plate) => {
    setPeekPlate(p);
    setPeekOpen(true);
  };


  // ✅ localStorage分離に使う userId（Supabase user.id）

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
  // 1) ログイン & username確認 → 未設定なら Onboarding
  useEffect(() => {
    if (loading) return; // UserContextの復元待ち

    // ✅ A：未ログインならログインへ（匿名ログインはしない）
    if (!userId) {
      navigate("/login");
      return;
    }

    (async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();
      const { data } = await supabase.auth.getSession();
      console.log("SESSION NOW:", data.session);


      if (error) {
        console.error("profiles read error:", error);
        // 無限ロードにせず、必要ならメッセージ出す（最低限 console でOK）
        return;
      }

      if (!profile?.username) {
        navigate("/Onboarding");
        return;
      }
    })();
  }, [loading, userId, navigate]);


  // 2) userIdが確定したら localStorage をロード
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const m = await loadRecordsCloud(userId);
      setRecordMap(m);
    })().catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const rows = await listPlatesCloud(userId);
      setPlates(rows);
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

  function avatarToPublicUrl(v: string | null) {
    if (!v) return null;
    if (/^https?:\/\//i.test(v) || /^data:image\//i.test(v)) return v; // 互換
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(v);
    return data.publicUrl ?? null;
  }

  const meAvatarSrc = useMemo(
    () => avatarToPublicUrl(me?.avatar_url ?? null),
    [me?.avatar_url]
  );



  return (

    <div className="container">
      <div className="header">
        <div>
          <h3 style={{ margin: 0 }}>𝙽𝚞𝚖𝚋𝚎𝚛-𝙲𝚘𝚕𝚕𝚎𝚌𝚝𝚒𝚘𝚗</h3>
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
                gap: 6,
                marginRight: 8,
                background: "#ffffff",
                padding: "8px",
                cursor: "pointer",
                border: "1px solid black",
                borderRadius: "10px",
              }}
            >

              <img
                src={meAvatarSrc || "/avatar-default.png"}
                alt="avatar"
                width={30}
                height={30}
                style={{
                  borderRadius: "999px",
                  objectFit: "cover",
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
                onError={(e) => {
                  // 非表示じゃなくてデフォルトに戻す方が体験良い
                  (e.currentTarget as HTMLImageElement).src = "/avatar-default.png";
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
                {/* <Link
                  to="/regions"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🗾地域一覧
                </Link> */}

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
                  to="/collection"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🗾ナンバーコレクション(個人)
                </Link>

                <Link
                  to="/serial-collection/global"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🌐 ナンバーコレクション(みんな)
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
      <UserSummaryBar regions={regions} refreshKey={summaryRefresh} />
      <div className="stack">

        <JapanMap prefStatusMap={prefProgress} onPickPrefecture={openPref} />

        <PrefModal
          open={prefOpen}
          prefName={pickedPref}
          regionsInPref={regionsInPref}
          recordMap={recordMap}
          userId={userId}
          onClose={closePref}
          onOpenPlate={openPlate}
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
        onRegistered={async (regionName: string) => {
          markCompletedByRegionName(regionName);
          setSummaryRefresh((n) => n + 1);
        }}
      />
      <PlatePeekModal
        open={peekOpen}
        plate={peekPlate}
        onClose={() => setPeekOpen(false)}
      />
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onClearAll={handleClearAll}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 12, paddingTop: 10 }}>
        <button
          className="cta-btn"
          onClick={() => setPlateOpen(true)}
          disabled={!userId} // ✅ userId確定前は押せない
          title={!userId ? "ログイン確認中..." : ""}
        >
          ナンバープレートを登録
        </button>
      </div>
      {
        !loading && !username && (
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            ユーザーネームが未設定です。
            <button className="btn" onClick={() => navigate("/Onboarding")}>設定する</button>
          </div>
        )
      }
    </div >
  );
}
/*

*/ 