import { supabase } from "../lib/supabaseClient";
import type { Plate } from "./plates"; // 既存の型を再利用
import { isExcludedPrefecture } from "../lib/excludedPrefectures";

export async function listPlatesByRegionIdCloud(
  userId: string,
  regionId: string
): Promise<Plate[]> {
  const { data, error } = await supabase
    .from("plates")
    .select(
      "id, region_id, class_number, kana, serial, color, render_svg, created_at,photo_url,captured_at"
    )
    .eq("user_id", userId)
    .eq("region_id", regionId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    regionId: r.region_id,
    classNumber: r.class_number,
    kana: r.kana,
    serial: r.serial,
    color: r.color,
    renderSvg: r.render_svg,
    createdAt: r.created_at,
    photo_url: r.photo_url ?? null,

    // ✅ ここ！
    capturedAt: r.captured_at ?? null,
  }));
}

function buildNumberLabel(plate: Plate, serial4: string) {
  // 表示用（好きに整えてOK）
  const regionName = String(plate.regionId ?? "").split(":")[1] ?? String(plate.regionId ?? "");
  const classNo = plate.classNumber ?? "";
  const kana = plate.kana ?? "";
  return `${regionName} ${classNo} ${kana} ${serial4}`;
}


function toSerial4(v: string) {
  // "・・・3" / "3" / "0003" どれでも "0003" にする
  const digits = String(v ?? "").replace(/\D/g, "");
  const n = parseInt(digits || "0", 10);
  // 0000 や NaN を弾いて 1..9999 に丸める（必要なら挙動変更OK）
  const clamped = Math.max(1, Math.min(9999, Number.isFinite(n) ? n : 0));
  return String(clamped).padStart(4, "0");
}

export type RegisterResult = {
  regionId: string;
  regionName: string;
  numberLabel: string;
  serial4: string;

  regionAlreadyRegistered: boolean;
  regionPlateIndex: number;
  totalRegions: number;
  totalPlates: number;

  serialAlreadyInMyCollection: boolean;
  serialMyAddedNow: boolean;

  platePoints: number;
  totalPoints: number;

  globalRegionKnown: boolean;
  regionAlreadyRegisteredGlobal: boolean;

  serialAlreadyGlobal: boolean;
  serialGlobalAddedNow: boolean;
};


export async function addPlateCloudWithResult(
  userId: string,
  plate: Plate
): Promise<RegisterResult> {
  // ✅ 沖縄県は登録不可
  const pref = (plate.regionId ?? "").split(":")[0];
  if (isExcludedPrefecture(pref)) {
    throw new Error("沖縄県のナンバープレートは登録対象外です");
  }

  const regionId = plate.regionId;
  const regionName = String(regionId ?? "").split(":")[1] ?? String(regionId ?? "");
  const serial4 = toSerial4(plate.serial);
  const numberLabel = buildNumberLabel(plate, serial4);

  // --------------------------
  // 0) 事前判定（個人）
  // --------------------------
  const { count: regionCountBefore, error: rbErr } = await supabase
    .from("plates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("region_id", regionId);
  if (rbErr) throw rbErr;

  const regionAlreadyRegistered = (regionCountBefore ?? 0) > 0;

  const { data: mySerialBefore, error: msbErr } = await supabase
    .from("user_serial_collection")
    .select("serial4")
    .eq("user_id", userId)
    .eq("serial4", serial4)
    .maybeSingle();
  if (msbErr) throw msbErr;

  const serialAlreadyInMyCollection = !!mySerialBefore;

  const { data: globalSerialBefore, error: gsbErr } = await supabase
    .from("global_serial_collection")
    .select("serial4")
    .eq("serial4", serial4)
    .maybeSingle();

  // RLSで読めない場合に落としたくないならここは握りつぶしも可
  if (gsbErr) throw gsbErr;

  const serialAlreadyGlobal = !!globalSerialBefore;

  // --------------------------
  // 1) plates insert（render_svg取り出し）
  // --------------------------
  const { data: ins, error: insErr } = await supabase
    .from("plates")
    .insert({
      id: plate.id,
      user_id: userId,
      region_id: regionId,
      class_number: plate.classNumber,
      kana: plate.kana,
      serial: serial4,
      color: plate.color,
      render_svg: plate.renderSvg,
      photo_url: (plate as any).photo_url ?? null,
      captured_at: plate.capturedAt ?? null,
      created_at: plate.createdAt,
    })
    .select("id, render_svg")
    .single();

  if (insErr) throw insErr;

  const plateId = ins?.id ?? plate.id;
  const savedSvg = ins?.render_svg ?? null;

  // --------------------------
  // 2) rarity / points
  // --------------------------
  const { data: rr, error: rrErr } = await supabase
    .from("region_rarity_current")
    .select("rarity_level, points")
    .eq("region_id", regionId)
    .maybeSingle();
  if (rrErr) throw rrErr;

  const platePoints = rr?.points ?? 40;
  const rarityLevel = rr?.rarity_level ?? 5;

  const { error: seErr } = await supabase.from("score_events").insert({
    user_id: userId,
    plate_id: plateId,
    region_id: regionId,
    rarity_level: rarityLevel,
    points: platePoints,
  });
  if (seErr) throw seErr;

  // --------------------------
  // 3) user_serial_collection（自分用コレクション）
  // --------------------------
  let serialMyAddedNow = false;
  if (!serialAlreadyInMyCollection) {
    const { error: uscErr } = await supabase.from("user_serial_collection").insert({
      user_id: userId,
      serial4,
      first_plate_svg: savedSvg,
    });
    if (!uscErr) serialMyAddedNow = true;
  }

  // --------------------------
  // 4) global_serial_collection（先着1名のみ）
  // --------------------------
  let serialGlobalAddedNow = false;
  if (savedSvg) {
    const { error: gErr } = await supabase
      .from("global_serial_collection")
      .upsert(
        { serial4, first_user_id: userId, first_plate_svg: savedSvg },
        { onConflict: "serial4", ignoreDuplicates: true }
      );

    if (!gErr && !serialAlreadyGlobal) serialGlobalAddedNow = true;
    if (gErr) console.warn("global_serial_collection upsert failed:", gErr);
  }

  // --------------------------
  // 5) 登録後の集計
  // --------------------------
  // この地域の〇枚目（登録後）
  const { count: regionCountAfter, error: raErr } = await supabase
    .from("plates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("region_id", regionId);
  if (raErr) throw raErr;

  const regionPlateIndex = Math.max(1, regionCountAfter ?? 1);

  // ✅ 総登録プレート数（これが欲しいやつ！）
  const { count: totalPlatesCount, error: tpCountErr } = await supabase
    .from("plates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (tpCountErr) throw tpCountErr;

  const totalPlates = totalPlatesCount ?? 0;

  // （残しておくなら）総登録地域数（distinct）
  const { data: allRegions, error: arErr } = await supabase
    .from("plates")
    .select("region_id")
    .eq("user_id", userId);
  if (arErr) throw arErr;

  const totalRegions = new Set((allRegions ?? []).map((r: any) => r.region_id)).size;

  // 総ポイント
  const { data: ptsRows, error: tpErr } = await supabase
    .from("score_events")
    .select("points")
    .eq("user_id", userId);
  if (tpErr) throw tpErr;

  const totalPoints = (ptsRows ?? []).reduce(
    (sum: number, r: any) => sum + (Number(r.points) || 0),
    0
  );

  // --------------------------
  // 6) グローバル地域判定（RLS次第で読めない可能性あり）
  // --------------------------
  let globalRegionKnown = true;
  let regionAlreadyRegisteredGlobal = false;
  try {
    const { count, error } = await supabase
      .from("plates")
      .select("id", { count: "exact", head: true })
      .eq("region_id", regionId);
    if (error) throw error;

    // 自分の今回の1件が含まれるので >1 を「既に誰かがいた」扱いに
    regionAlreadyRegisteredGlobal = (count ?? 0) > 1;
  } catch {
    globalRegionKnown = false;
    regionAlreadyRegisteredGlobal = false;
  }

  return {
    regionId,
    regionName,
    numberLabel,
    serial4,

    regionAlreadyRegistered,
    regionPlateIndex,
    totalRegions,
    totalPlates, // ✅ 追加

    serialAlreadyInMyCollection,
    serialMyAddedNow,

    platePoints,
    totalPoints,

    globalRegionKnown,
    regionAlreadyRegisteredGlobal,

    serialAlreadyGlobal,
    serialGlobalAddedNow,
  };
}


export type PlateRow = {
  id: string;
  region_id: string;
  class_number: string;
  kana: string;
  serial: string;
  color: any;
  render_svg: string;
  created_at: string;
  photo_url: string | null; // ✅ 追加
  captured_at: string | null;
};
export async function listPlatesCloudByRegionId(
  userId: string,
  regionId: string
): Promise<PlateRow[]> {
  const { data, error } = await supabase
    .from("plates")
    .select("id, region_id, class_number, kana, serial, color, render_svg, created_at, photo_url,captured_at")
    .eq("user_id", userId)
    .eq("region_id", regionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlateRow[];
}

export async function uploadPlateImage(
  userId: string,
  plateId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${plateId}.${ext}`;

  const { error } = await supabase.storage
    .from("plate-images")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("plate-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function updatePlatePhotoCloud(
  plateId: string,
  photoUrl: string | null,
  capturedAtIso: string | null
) {
  const { error } = await supabase
    .from("plates")
    .update({
      photo_url: photoUrl,
      captured_at: capturedAtIso,
    })
    .eq("id", plateId);

  if (error) throw error;
}

export async function listPlatesCloud(userId: string): Promise<Plate[]> {
  const { data, error } = await supabase
    .from("plates")
    .select("id, region_id, class_number, kana, serial, color, render_svg, created_at, photo_url,captured_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    regionId: r.region_id,
    classNumber: r.class_number,
    kana: r.kana,
    serial: r.serial,
    color: r.color,
    renderSvg: r.render_svg,
    createdAt: r.created_at,
    photo_url: r.photo_url ?? null,
    capturedAt: r.captured_at ?? null, // ✅ ここ
  }));
}

export async function getMyTotalPointsCloud(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("score_events")
    .select("points")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).reduce((sum, r: any) => sum + (Number(r.points) || 0), 0);
}
