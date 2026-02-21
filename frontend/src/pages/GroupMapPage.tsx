import { useCallback, useEffect, useMemo, useState } from "react";
import JapanMap from "../components/JapanMap";
import { supabase } from "../lib/supabaseClient";
import type { PrefStatus } from "../lib/region";
import { PLATE_REGIONS } from "../data/plateRegions";
import { Link } from "react-router-dom";
import { listGroupPlatesByRegion } from "../storage/groupPlates";
import { listPlatesCloudByRegionId } from "../storage/platesCloud";
import type { Plate } from "../storage/plates";
import PlatePeekModal from "../components/PlatePeekModal";

type GroupRow = {
    region_id: string;
    completed_count: number;
    total_members: number;
};

type PrefMapValue = { status: PrefStatus; done: number; total: number };

type MemberRow = { user_id: string; username: string };

type MemberState = {
    loading: boolean;
    error: string | null;
    rows: MemberRow[];
};

type RegionPlatesState = {
    loading: boolean;
    error: string | null;
    rows: any[];
};

type PlateRow = {
    id: string;
    region_id: string;
    class_number: string;
    kana: string;
    serial: string;
    color: any;
    render_svg: string;
    created_at: string;
    photo_url: string | null;
    captured_at: string | null;
    user_id: string;

    profile?: {
        username?: string;
        avatar_url?: string;
    };
};

function ensureViewBox(svg: string) {
    if (!svg) return svg;
    if (/viewBox="/i.test(svg)) {
        return svg.replace(/viewBox="[^"]*"/i, 'viewBox="0 0 320 180"');
    }
    return svg.replace(/<svg\b/i, '<svg viewBox="0 0 320 180"');
}

function rowToPlate(r: PlateRow): Plate {
    return {
        id: r.id,
        regionId: r.region_id,
        classNumber: r.class_number,
        kana: r.kana,
        serial: r.serial,
        color: r.color,
        renderSvg: ensureViewBox(r.render_svg),
        createdAt: r.created_at,
        photo_url: r.photo_url ?? null,
        capturedAt: r.captured_at ?? null,
    };
}


function normPref(s: string) {
    const t = (s ?? "").trim();
    if (!t) return t;
    if (t === "北海道") return "北海道";
    if (t.endsWith("都") || t.endsWith("道") || t.endsWith("府") || t.endsWith("県")) return t;
    return `${t}県`;
}


function regionIdFromPlate(prefecture: string, name: string) {
    return `${normPref(prefecture)}:${name}`;
}


export default function GroupMapPage() {
    // --- group map (pref-level) ---
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [rows, setRows] = useState<GroupRow[]>([]);

    // --- prefecture modal ---
    const [prefModalOpen, setPrefModalOpen] = useState(false);
    const [activePref, setActivePref] = useState<string | null>(null);
    const [prefRows, setPrefRows] = useState<GroupRow[]>([]);
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefErr, setPrefErr] = useState<string | null>(null);

    // --- accordion (region -> members) ---
    const [openRegionId, setOpenRegionId] = useState<string | null>(null);
    const [memberMap, setMemberMap] = useState<Record<string, MemberState>>({});

    const [platesMap, setPlatesMap] = useState<Record<string, RegionPlatesState>>({});

    const [pickedPlate, setPickedPlate] = useState<Plate | null>(null);

    const onOpenPlate = (p: Plate) => setPickedPlate(p);
    const onClosePlate = () => setPickedPlate(null);

    const [peekOpen, setPeekOpen] = useState(false);
    const [peekPlate, setPeekPlate] = useState<Plate | null>(null);

    const openPlate = (p: Plate) => {
        setPeekPlate(p);
        setPeekOpen(true);
    };


    // ① みんなの地図（都道府県塗り用）データ取得
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setErr(null);

            const { data, error } = await supabase.rpc("get_group_map");
            if (cancelled) return;

            if (error) {
                setErr(error.message);
                setRows([]);
                setLoading(false);
                return;
            }

            setRows((data ?? []) as GroupRow[]);
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        (async () => {
            const { data: ures } = await supabase.auth.getUser();
            console.log("GroupMap auth.uid =", ures.user?.id);

            const uid = ures.user?.id;
            if (!uid) return;

            const { data: frows, error } = await supabase
                .from("follows")
                .select("follower_id,following_id")
                .or(`follower_id.eq.${uid},following_id.eq.${uid}`);
            console.log("prefRows sample", prefRows.slice(0, 5));

            console.log("follows involving me =", frows?.length, error, frows?.slice(0, 5));
        })();
    }, []);


    const totalMembers = rows[0]?.total_members ?? 0;

    // ② region_id -> progress(0..1)
    const progressByRegionId = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of rows) {
            const denom = r.total_members ?? 0;
            map[r.region_id] = denom > 0 ? r.completed_count / denom : 0;
        }
        return map;
    }, [rows]);

    // ③ 都道府県別ステータス（none / partial / all）
    const prefStatusMap: Record<string, PrefMapValue> = useMemo(() => {
        const totals: Record<string, number> = {};
        const doneCounts: Record<string, number> = {};
        const allOk: Record<string, boolean> = {};

        for (const r of PLATE_REGIONS) {
            const prefName = normPref(r.prefecture);
            const rid = regionIdFromPlate(r.prefecture, r.name);
            const p = progressByRegionId[rid] ?? 0;

            totals[prefName] = (totals[prefName] ?? 0) + 1;

            if (p > 0) doneCounts[prefName] = (doneCounts[prefName] ?? 0) + 1;

            if (allOk[prefName] === undefined) allOk[prefName] = true;
            if (p < 1) allOk[prefName] = false;
        }

        const out: Record<string, PrefMapValue> = {};
        for (const prefName of Object.keys(totals)) {
            const total = totals[prefName] ?? 0;
            const done = doneCounts[prefName] ?? 0;

            // ↓ PrefStatus の文字列は、あなたの JapanMap の fillByStatus に合わせてね
            // すでに地図の色が出てるならこのままでOK
            let status: PrefStatus;
            if (done === 0) status = "none" as PrefStatus;
            else if (allOk[prefName] && total > 0) status = "complete" as PrefStatus;
            else status = "partial" as PrefStatus;

            out[prefName] = { status, done, total };
        }
        return out;
    }, [progressByRegionId]);

    // ④ 都道府県タップ → その都道府県の region 集計を取得（地域一覧用）
    const openPref = useCallback(async (prefName: string) => {
        const { data: mids, error: midsErr } = await supabase.rpc("my_group_member_ids");
        console.log("member ids rpc:", midsErr, mids);

        const key = normPref(prefName);
        console.log("RPC pref =", key);
        setActivePref(key);
        setPrefModalOpen(true);
        setOpenRegionId(null);

        setPrefLoading(true);
        setPrefErr(null);
        setPrefRows([]);

        const { data, error } = await supabase.rpc(
            "get_group_prefecture_regions",
            { pref_name: key }
        );

        console.log("pref rpc result len=", (data ?? []).length, error, data?.slice?.(0, 3)); // ✅ 追加

        if (error) {
            setPrefErr(error.message);
            setPrefRows([]);
            setPrefLoading(false);
            return;
        }

        setPrefRows((data ?? []) as GroupRow[]);
        setPrefLoading(false);
    }, []);




    // ⑤ 地域の達成者一覧（遅延ロード＆キャッシュ）
    async function ensurePlates(regionId: string) {
        setPlatesMap((m) => ({
            ...m,
            [regionId]: { loading: true, error: null, rows: m[regionId]?.rows ?? [] },
        }));

        try {
            const rows = await listGroupPlatesByRegion(regionId);
            setPlatesMap((m) => ({
                ...m,
                [regionId]: { loading: false, error: null, rows },
            }));
        } catch (e: any) {
            setPlatesMap((m) => ({
                ...m,
                [regionId]: { loading: false, error: String(e?.message ?? e), rows: [] },
            }));
        }
    }

    function hashToHue(s: string) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return h % 360;
    }

    function toSvgDataUrl(svg: string) {
        const safe = svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(safe)))}`;
    }


    // ⑥ 都道府県モーダルで使う：region_id -> completed_count
    const prefDoneByRegionId = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of prefRows) map[r.region_id] = r.completed_count;
        return map;
    }, [prefRows]);


    return (
        <div className="container">
            <div className="header">
                <div>
                    <h2 style={{ margin: 0 }}>みんなの地図</h2>
                    <div className="small">
                        あなた＋相互フレンド（{Math.max(totalMembers - 1, 0)}人）で合成
                    </div>
                </div>
                <Link to="/" className="btn">
                    ホームに戻る
                </Link>
            </div>

            {err && (
                <div className="card" style={{ marginTop: 12 }}>
                    <div style={{ color: "#b00020", fontWeight: 700 }}>エラー</div>
                    <div className="small">{err}</div>
                </div>
            )}

            {!err && !loading && totalMembers === 0 && (
                <div className="card" style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700 }}>まだ相互フレンドがいません</div>
                    <div className="small">相互フォローになると、ここに合成地図が表示されます。</div>
                </div>
            )}

            <div style={{ marginTop: 12 }}>
                <JapanMap
                    prefStatusMap={prefStatusMap}
                    onPickPrefecture={(prefName) => {
                        void openPref(prefName);
                    }}
                />
            </div>

            <div className="small" style={{ marginTop: 8 }}>
                色：未記録 / 一部 / 完全（グループ内の達成状況）
            </div>

            {/* --- Prefecture modal --- */}
            {prefModalOpen && activePref && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        zIndex: 2000,
                    }}
                    onClick={() => {
                        setPrefModalOpen(false);
                        setActivePref(null);
                        setOpenRegionId(null);
                    }}
                >
                    <div
                        className="card"
                        style={{
                            width: "min(760px, 100%)",
                            borderRadius: 16,
                            padding: 16,
                            maxHeight: "82vh",
                            overflow: "auto",

                            background: "#fff",
                            color: "#111827",

                            // ✅ 夜テーマの変数をここで打ち消す
                            ["--text" as any]: "#111827",
                            ["--muted" as any]: "rgba(17, 24, 39, 0.65)",
                        }}
                    >
                        <div className="row spread" style={{ marginBottom: 8 }}>
                            <div>
                                <strong>{activePref} の地域</strong>
                                <div className="small">達成人数 / メンバー総数（あなた＋相互）</div>
                            </div>

                            <button
                                className="btn"
                                onClick={() => {
                                    setPrefModalOpen(false);
                                    setActivePref(null);
                                    setOpenRegionId(null);
                                }}
                            >
                                閉じる
                            </button>
                        </div>

                        {prefErr && (
                            <div style={{ color: "#b00020", fontWeight: 700, marginTop: 8 }}>
                                {prefErr}
                            </div>
                        )}

                        {prefLoading ? (
                            <div className="small" style={{ marginTop: 12 }}>
                                読み込み中…
                            </div>
                        ) : (
                            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                {PLATE_REGIONS.filter((r) => r.prefecture === activePref).map((r) => {
                                    const regionId = regionIdFromPlate(r.prefecture, r.name);

                                    const done = prefDoneByRegionId[regionId] ?? 0;
                                    const total = totalMembers;

                                    const status = done === 0 ? "未" : done >= total && total > 0 ? "完" : "一部";

                                    const clickable = done > 0; // ✅ 達成者がいないものは押下不可
                                    const isOpen = openRegionId === regionId;
                                    const platesState = platesMap[regionId];

                                    return (
                                        <div key={regionId} style={{ display: "grid", gap: 6 }}>
                                            <div
                                                className="card"
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    cursor: clickable ? "pointer" : "default",
                                                    opacity: clickable ? 1 : 0.55,
                                                }}
                                                onClick={async () => {
                                                    if (!clickable) return;

                                                    const nextOpen = isOpen ? null : regionId;
                                                    setOpenRegionId(nextOpen);

                                                    if (!isOpen) {
                                                        await ensurePlates(regionId);
                                                        const rows = await listGroupPlatesByRegion(regionId);
                                                        console.log("group plates rows:", regionId, rows.length, rows.slice(0, 2));

                                                    }
                                                }}
                                            >
                                                <div className="row spread">
                                                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                                                    <div className="small">
                                                        {status}・{done}/{total}
                                                    </div>
                                                </div>

                                                {r.reading && (
                                                    <div className="small" style={{ opacity: 0.8 }}>
                                                        {r.reading}
                                                    </div>
                                                )}

                                                <div className="small" style={{ marginTop: 6, opacity: 0.75 }}>
                                                    {clickable ? (isOpen ? "タップで閉じる" : "タップで達成者を見る") : "達成者がいません"}
                                                </div>
                                            </div>

                                            {/* ✅ プルダウン（開いたときだけ表示） */}
                                            {isOpen && (
                                                <div
                                                    className="card"
                                                    style={{
                                                        padding: 12,
                                                        borderRadius: 12,
                                                        marginLeft: 8,
                                                        borderLeft: "4px solid #e5e7eb",
                                                    }}
                                                >
                                                    {platesState?.error && (
                                                        <div style={{ color: "#b00020", fontWeight: 700 }}>
                                                            {platesState.error}
                                                        </div>
                                                    )}


                                                    {platesState?.loading ? (
                                                        <div style={{ opacity: 0.6, fontSize: 13 }}>読み込み中...</div>
                                                    ) : (platesState?.rows?.length ?? 0) === 0 ? (
                                                        <div style={{ opacity: 0.6, fontSize: 13 }}>
                                                            この地域のナンバープレートはまだありません
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns: "repeat(2, 1fr)",
                                                                gap: 8,
                                                            }}
                                                        >
                                                            {platesState!.rows.map((row: PlateRow) => {
                                                                const p = rowToPlate(row);

                                                                return (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const plate = rowToPlate(row); // rowはDB row
                                                                            console.log("[group] openPlate", plate);
                                                                            openPlate(p);
                                                                        }}

                                                                        style={{
                                                                            border: "2px solid #e5e7eb",
                                                                            borderRadius: 14,
                                                                            background: "#fff",
                                                                            padding: 8,
                                                                            cursor: "pointer",
                                                                            textAlign: "left",
                                                                            boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
                                                                        }}
                                                                    >
                                                                        {/* 👤 ユーザー名表示 */}
                                                                        <div
                                                                            style={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700,
                                                                                marginBottom: 6,
                                                                                color: "#111827",
                                                                            }}
                                                                        >
                                                                            {row.profile?.username ?? "unknown"}
                                                                        </div>

                                                                        {/* サムネ固定高さ */}
                                                                        <div
                                                                            style={{
                                                                                height: 90,
                                                                                borderRadius: 12,
                                                                                border: "2px solid #e5e7eb",
                                                                                overflow: "hidden",
                                                                                background: "#fff",
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "center",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    width: "100%",
                                                                                    height: "100%",
                                                                                    padding: 6,
                                                                                    boxSizing: "border-box",
                                                                                }}
                                                                                dangerouslySetInnerHTML={{ __html: p.renderSvg }}
                                                                            />
                                                                        </div>

                                                                        {/* 下情報 */}
                                                                        <div
                                                                            style={{
                                                                                marginTop: 6,
                                                                                display: "flex",
                                                                                justifyContent: "space-between",
                                                                                gap: 8,
                                                                            }}
                                                                        >
                                                                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                                                                                {p.photo_url ? "📸あり" : "📷なし"}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}



                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                        }
                    </div>
                </div>

            )}
            <PlatePeekModal
                open={peekOpen}
                plate={peekPlate}
                onClose={() => setPeekOpen(false)}
            />



        </div>

    );


}

