import { supabase } from "../lib/supabaseClient";
import type { Plate } from "./plates"; // 既存の型を再利用

export async function listPlatesByRegionIdCloud(
  userId: string,
  regionId: string
): Promise<Plate[]> {
  const { data, error } = await supabase
    .from("plates")
    .select(
      "id, region_id, class_number, kana, serial, color, render_svg, created_at"
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
  }));
}

export async function addPlateCloud(userId: string, plate: Plate) {
  const { error } = await supabase.from("plates").insert({
    id: plate.id,
    user_id: userId,
    region_id: plate.regionId,
    class_number: plate.classNumber,
    kana: plate.kana,
    serial: plate.serial,
    color: plate.color,
    render_svg: plate.renderSvg,
    created_at: plate.createdAt,
  });

  if (error) throw error;
}

export type PlateRow = {
  id: string;
  user_id: string;
  region_id: string;
  class_number: string | number;
  kana: string;
  serial: string;
  color: string;
  render_svg: string;
  created_at: string;
};

export async function listPlatesCloudByRegionId(
  userId: string,
  regionId: string
): Promise<PlateRow[]> {
  const { data, error } = await supabase
    .from("plates")
    .select("id,user_id,region_id,class_number,kana,serial,color,render_svg,created_at")
    .eq("user_id", userId)
    .eq("region_id", regionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlateRow[];
}