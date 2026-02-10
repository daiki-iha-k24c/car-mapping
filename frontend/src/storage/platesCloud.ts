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




function toSerial4(v: string) {
  // "・・・3" / "3" / "0003" どれでも "0003" にする
  const digits = String(v ?? "").replace(/\D/g, "");
  const n = parseInt(digits || "0", 10);
  // 0000 や NaN を弾いて 1..9999 に丸める（必要なら挙動変更OK）
  const clamped = Math.max(1, Math.min(9999, Number.isFinite(n) ? n : 0));
  return String(clamped).padStart(4, "0");
}

export async function addPlateCloud(userId: string, plate: Plate) {
  // ✅ 沖縄県は登録不可（最終防衛ライン）
  const pref = (plate.regionId ?? "").split(":")[0];
  if (isExcludedPrefecture(pref)) {
    throw new Error("沖縄県のナンバープレートは登録対象外です");
  }

  // ✅ serial4 を常に 4桁に正規化（global 側のキー不一致防止）
  const serial4 = toSerial4(plate.serial);

  // --- ① 個人プレート登録（DBに確実に入った render_svg を取得） ---
  const { data, error } = await supabase
    .from("plates")
    .insert({
      id: plate.id,
      user_id: userId,
      region_id: plate.regionId,
      class_number: plate.classNumber,
      kana: plate.kana,
      serial: serial4, // ← plates 側も 4桁で統一（表示用の "・・・" はUIだけ）
      color: plate.color,
      render_svg: plate.renderSvg,
      photo_url: (plate as any).photo_url ?? null,
      captured_at: plate.capturedAt ?? null,
      created_at: plate.createdAt,
    })
    .select("render_svg")
    .single();

  if (error) throw error;

  const savedSvg = data?.render_svg ?? null;

  // --- ② みんなのナンバーコレクション（先着1名のみ・SVG込み） ---
  // 失敗しても個人登録は成功しているので throw しない
  if (savedSvg) {
    const { error: gErr } = await supabase
      .from("global_serial_collection")
      .upsert(
        {
          serial4,
          first_user_id: userId,
          first_plate_svg: savedSvg,
        },
        { onConflict: "serial4", ignoreDuplicates: true }
      );

    if (gErr) {
      // UXを壊さないために握りつぶし（ログだけ）
      console.warn("global_serial_collection upsert failed:", gErr);
    }
  } else {
    console.warn("render_svg is empty. skip global_serial_collection upsert.");
  }
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