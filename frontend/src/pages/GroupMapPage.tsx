import { useCallback, useEffect, useMemo, useState } from "react";
import JapanMap from "../components/JapanMap";
import { supabase } from "../lib/supabaseClient";
import type { PrefStatus } from "../lib/region";
import { PLATE_REGIONS } from "../data/plateRegions";
import { Link} from "react-router-dom";


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

function regionIdFromPlate(prefecture: string, name: string) {
    // DB の region_id が "静岡県:浜松" 形式の想定
    return `${prefecture}:${name}`;
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
            const prefName = r.prefecture;
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
            else if (allOk[prefName] && total > 0) status = "all" as PrefStatus;
            else status = "partial" as PrefStatus;

            out[prefName] = { status, done, total };
        }
        return out;
    }, [progressByRegionId]);

    // ④ 都道府県タップ → その都道府県の region 集計を取得（地域一覧用）
    const openPref = useCallback(
        async (prefName: string) => {
            setActivePref(prefName);
            setPrefModalOpen(true);

            // 都道府県を切り替えたらアコーディオン状態は閉じる
            setOpenRegionId(null);

            // メンバー一覧キャッシュは残してOK（再表示高速化）
            // もし都道府県を変えたらキャッシュもリセットしたいならここで setMemberMap({}) を入れる

            setPrefLoading(true);
            setPrefErr(null);
            setPrefRows([]);

            const { data, error } = await supabase.rpc("get_group_prefecture_regions", {
                pref_name: prefName,
            });

            if (error) {
                setPrefErr(error.message);
                setPrefRows([]);
                setPrefLoading(false);
                return;
            }

            setPrefRows((data ?? []) as GroupRow[]);
            setPrefLoading(false);
        },
        []
    );

    // ⑤ 地域の達成者一覧（遅延ロード＆キャッシュ）
    const ensureMembers = useCallback(
        async (regionId: string) => {
            // すでに取得済みならスキップ
            const existing = memberMap[regionId];
            if (existing && !existing.loading && existing.rows.length > 0) return;

            setMemberMap((m) => ({
                ...m,
                [regionId]: {
                    loading: true,
                    error: null,
                    rows: m[regionId]?.rows ?? [],
                },
            }));

            const { data, error } = await supabase.rpc("get_group_region_members", {
                region_id_in: regionId,
            });

            setMemberMap((m) => ({
                ...m,
                [regionId]: {
                    loading: false,
                    error: error ? error.message : null,
                    rows: (data ?? []) as MemberRow[],
                },
            }));
        },
        [memberMap]
    );

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
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                                    const members = memberMap[regionId];

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
                                                        await ensureMembers(regionId);
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
                                                    <div className="small" style={{ opacity: 0.7 }}>
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
                                                    {members?.error && (
                                                        <div style={{ color: "#b00020", fontWeight: 700 }}>
                                                            {members.error}
                                                        </div>
                                                    )}

                                                    {members?.loading ? (
                                                        <div className="small">読み込み中…</div>
                                                    ) : (members?.rows?.length ?? 0) === 0 ? (
                                                        <div className="small">達成者が見つかりませんでした</div>
                                                    ) : (
                                                        <div style={{ display: "grid", gap: 8 }}>
                                                            {members!.rows.map((m) => (
                                                                <div
                                                                    key={m.user_id}
                                                                    className="card"
                                                                    style={{
                                                                        padding: 10,
                                                                        borderRadius: 10,
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        // ✅ ここで「フレンド地図」に遷移したいなら差し替え
                                                                        // 例: useNavigate() で /user/:userId へ
                                                                        console.log("go friend map", m.user_id);
                                                                    }}
                                                                >
                                                                    <div style={{ fontWeight: 700 }}>{m.username}</div>
                                                                    <div className="small" style={{ opacity: 0.7 }}>
                                                                        {m.user_id}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
