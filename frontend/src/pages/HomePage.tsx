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

import PlateScanModal from "../components/PlateScanModal";
import type { Plate, PlateColor } from "../storage/plates";
import { addPlate, listPlatesByRegionId } from "../storage/plates";
import { renderPlateSvg } from "../svg/renderPlateSvg";

function normalizeSerial(s: string) {
    const t = s.trim().replace(/[‐-‒–—−ー－]/g, "-");
    const digits = t.replace(/\D/g, "");
    if (digits.length === 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return t;
}

function fixSvgViewBox(svg: string) {
    return svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');
}

function normRegionName(s: string) {
    return (s || "").trim().replace(/\s+/g, "");
}

// まずは「完全一致 or 部分一致」で十分回る（あとで辞書照合に進化できる）
function findRegionByName(name: string): Region | null {
    const key = normRegionName(name);
    if (!key) return null;

    // 完全一致
    const exact = regions.find((r) => normRegionName(r.name) === key);
    if (exact) return exact;

    // 部分一致（OCRが余計な文字拾うことある）
    const partial = regions.find((r) => normRegionName(r.name).includes(key) || key.includes(normRegionName(r.name)));
    return partial ?? null;
}

function isDuplicate(regionId: string, classNumber: string, kana: string, serial: string) {
    const list = listPlatesByRegionId(regionId);
    return list.some(
        (p) =>
            p.classNumber === classNumber &&
            p.kana === kana &&
            p.serial === serial
    );
}


export default function HomePage() {
    const [recordMap, setRecordMap] = useState<Record<string, RegionRecord>>(() => loadRecords());
    const [modalOpen, setModalOpen] = useState(false);
    const [picked, setPicked] = useState<Region | null>(null);
    const [plateOpen, setPlateOpen] = useState(false);
    const [plateRegion, setPlateRegion] = useState<Region | null>(null);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanMsg, setScanMsg] = useState<string>("");
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
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <button className="btn" style={{ width: "100%" }} onClick={() => setScanOpen(true)}>
                        📷 スキャンして登録
                    </button>

                    {/* 検索バーいらないなら、検索UIを丸ごと消してOK */}
                    {/* <button className="btn" onClick={() => ...}>他のボタン</button> */}
                </div>

                {scanMsg && (
                    <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.85 }}>
                        {scanMsg}
                    </div>
                )}


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

            {/* ✅ スキャンモーダル（ホームから開く） */}
            <PlateScanModal
                open={scanOpen}
                onClose={() => setScanOpen(false)}
                onApply={(r, rawText) => {
                    // 1) 地域名 → Region を特定
                    const region = findRegionByName(r.regionName);
                    if (!region) {
                        alert(
                            `地域名が特定できなかった…\nOCR結果:「${r.regionName}」\n\n生テキスト:\n${rawText}`
                        );
                        return;
                    }

                    // 2) 値の整形
                    const classNumber = (r.classNumber || "").trim();
                    const kana = (r.kana || "").trim();
                    const serial = normalizeSerial(r.serial || "");

                    // 3) 最低限バリデーション（ホーム自動登録なので甘め）
                    if (!/^\d{2,3}$/.test(classNumber) || !kana || !/^\d{2}-\d{2}$/.test(serial)) {
                        alert(
                            `読み取りが不完全かも。\n\n地域: ${region.name}\n分類: ${classNumber}\nかな: ${kana}\n番号: ${serial}\n\n生テキスト:\n${rawText}`
                        );
                        return;
                    }

                    // 4) 重複チェック
                    if (isDuplicate(region.id, classNumber, kana, serial)) {
                        setScanMsg(`すでに登録済み：${region.name} ${classNumber} ${kana} ${serial}`);
                        return;
                    }

                    // 5) SVG生成（色は一旦白固定。後で認識/選択もできる）
                    const color: PlateColor = "white";
                    const svg = fixSvgViewBox(
                        renderPlateSvg({
                            regionName: region.name,
                            classNumber,
                            kana,
                            serial,
                            color,
                        })
                    );

                    const plate: Plate = {
                        id: crypto.randomUUID(),
                        regionId: region.id,
                        classNumber,
                        kana,
                        serial,
                        color,
                        renderSvg: svg,
                        createdAt: new Date().toISOString(),
                    };

                    addPlate(plate);
                    setScanMsg(`登録しました：${region.name} ${classNumber} ${kana} ${serial}`);
                }}
            />

        </div>
    );
}
