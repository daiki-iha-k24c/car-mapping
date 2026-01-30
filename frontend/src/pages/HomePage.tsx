import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import JapanMap from "../components/JapanMap";
import CompleteModal from "../components/CompleteModal";
import PrefModal from "../components/PrefModal";
import RegionSearchBar from "../components/RegionSearchBar";
import type { Region, RegionRecord } from "../lib/region";
import { loadRecords, saveRecords } from "../lib/storage";
import { regions, buildPrefProgress } from "../lib/regionIndex";
import { PLATE_REGIONS } from "../data/plateRegions";
import HelpModal from "../components/HelpModal";
import PlateRegisterModal from "../components/PlateRegisterModal";



export default function HomePage() {
    const [recordMap, setRecordMap] = useState<Record<string, RegionRecord>>(() => loadRecords());
    const [modalOpen, setModalOpen] = useState(false);
    const [picked, setPicked] = useState<Region | null>(null);
    const [plateOpen, setPlateOpen] = useState(false);
    const [plateRegion, setPlateRegion] = useState<Region | null>(null);


    const [prefOpen, setPrefOpen] = useState(false);
    const [pickedPref, setPickedPref] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);


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
    const openPlate = (region: Region) => {
        setPlateRegion(region);
        setPlateOpen(true);
    };

    const closePlate = () => {
        setPlateOpen(false);
        setPlateRegion(null);
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
        // 例: "秋田" → "秋田県"
        // 例: "東京" → "東京都"（もしそういうデータなら）
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

    const markCompleted = (region: Region) => {
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

        // ② ナンバープレート側（←キー名はあなたの実装に合わせる）
        localStorage.removeItem("plate_records_v1"); // 例
        localStorage.removeItem("plates_v1");        // 例

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
                    <button className="btn" onClick={() => setHelpOpen(true)}>ⓘ遊び方</button>
                    <Link to="/regions" className="btn">地域一覧</Link>
                </div>


            </div>

            <div className="stack">
                {/* ✅ ここが予測検索バー（選んだら既存のCompleteModalへ） */}
                <RegionSearchBar
                    regions={regionsWithReading}
                    onSelectRegion={openPlate}
                />


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
            <PlateRegisterModal
                open={plateOpen}
                region={plateRegion}
                onClose={closePlate}
                onRegistered={markCompleted}
            />


            <HelpModal
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                onClearAll={handleClearAll}
            />

        </div>
    );
}
