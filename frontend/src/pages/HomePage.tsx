import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import JapanMap from "../components/JapanMap";
import CompleteModal from "../components/CompleteModal";
import PrefModal from "../components/PrefModal";
import type { Region, RegionRecord } from "../lib/region";
import { loadRecords, saveRecords } from "../lib/storage";
import { regions, buildPrefProgress } from "../lib/regionIndex";
import { PLATE_REGIONS } from "../data/plateRegions";
import HelpModal from "../components/HelpModal";
import PlateRegisterModal from "../components/PlateRegisterModal";


function normRegionName(s: string) {
  return (s || "").trim().replace(/\s+/g, "");
}

// 「地域」プルダウンの値（例: 横浜）から Region を特定するために使う
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
  const [recordMap, setRecordMap] = useState<Record<string, RegionRecord>>(() => loadRecords());
  const [modalOpen, setModalOpen] = useState(false);
  const [picked, setPicked] = useState<Region | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [prefOpen, setPrefOpen] = useState(false);
  const [pickedPref, setPickedPref] = useState<string | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);

  // ✅ 新仕様：ホームから開く「ナンバープレート登録」モーダル
  const [plateOpen, setPlateOpen] = useState(false);

  useEffect(() => {
    saveRecords(recordMap);
  }, [recordMap]);

  const completedRegionIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, rec] of Object.entries(recordMap)) {
      if (rec.completed) set.add(id);
    }
    return set;
  }, [recordMap]);

  const prefProgress = useMemo(() => buildPrefProgress(regions, recordMap), [recordMap]);

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

  const alreadyDone = picked ? !!recordMap[picked.id]?.completed : false;

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

  // ✅ 新仕様：ナンバープレート登録が完了したら、その地域を「達成」にする
  // PlateRegisterModal から "regionName"（例: 横浜）が返ってくる想定
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
    // ① 地図（地域達成）
    setRecordMap({});

    // ② ナンバープレート側（キー名はあなたの実装に合わせる）
    localStorage.removeItem("plate_records_v1");
    localStorage.removeItem("plates_v1");

    setHelpOpen(false);
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ナンバープレート</h2>
          <div className="small">地域を記録して、地図を塗りつぶす</div>
        </div>

        <div className="header-actions">
          {/* PC用
          <div className="actions-desktop">
            <button className="btn" onClick={() => setHelpOpen(true)}>ⓘ遊び方</button>
            <Link to="/regions" className="btn">地域一覧</Link>
          </div> */}

          {/* モバイル用：ハンバーガー */}
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
                  ◎地域一覧
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
        {/* ✅ 新仕様：ホームに「ナンバープレートを登録」ボタン（カメラ削除） */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button className="btn"
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "none",
              fontSize: 18,
              fontWeight: "bold",
              textShadow: "2px 2px 2px rgba(0,0,0,0.8)",
              color: "#fff",
              boxShadow: "0 6px 16px #a2d7dd",
              backgroundImage: "radial-gradient(circle at 100% 0%, rgba(111, 109, 255, 0.97) 15%, rgba(92,243,61,0.68))",
              opacity: 0.7,
            }}
            onClick={() => setPlateOpen(true)}>
            ナンバープレートを登録
          </button>
        </div>



        <JapanMap prefStatusMap={prefProgress} onPickPrefecture={openPref} />

        <PrefModal
          open={prefOpen}
          prefName={pickedPref}
          regionsInPref={regionsInPref}
          recordMap={recordMap}
          onClose={closePref}
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

      {/* ✅ 新仕様 PlateRegisterModal：region を Home から渡さない */}
      <PlateRegisterModal
        open={plateOpen}
        regions={regionsWithReading} // 地域プルダウン候補（読みも使うなら）
        onClose={() => setPlateOpen(false)}
        onRegistered={(regionName: string) => {
          // 登録完了 → 地図側も達成扱いにする
          markCompletedByRegionName(regionName);
        }}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} onClearAll={handleClearAll} />
    </div>
  );
}
