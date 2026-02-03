import { supabase } from "../lib/supabaseClient";

export type PlateWithProfile = {
  id: string;
  user_id: string;
  region_id: string;
  render_svg: string;
  created_at: string;
  class_number: string | number;
  kana: string;
  serial: string;
  color: string;
  profile: { username: string | null; avatar_url: string | null } | null;
};

export async function listGroupPlatesByRegion(regionId: string): Promise<PlateWithProfile[]> {
  // 1) plates（その地域の全員分）
  const { data: plates, error: pErr } = await supabase
    .from("plates")
    .select("id,user_id,region_id,render_svg,created_at,class_number,kana,serial,color")
    .eq("region_id", regionId)
    .order("created_at", { ascending: false });

  if (pErr) throw pErr;

  const rows = plates ?? [];
  const userIds = Array.from(new Set(rows.map((p) => p.user_id)));

  if (userIds.length === 0) return [];

  // 2) profiles
  const { data: profs, error: prErr } = await supabase
    .from("profiles")
    .select("user_id,username,avatar_url")
    .in("user_id", userIds);

  if (prErr) throw prErr;

  const profMap = new Map<string, { username: string | null; avatar_url: string | null }>(
    (profs ?? []).map((x) => [x.user_id, { username: x.username ?? null, avatar_url: x.avatar_url ?? null }])
  );

  return rows.map((p) => ({
    ...p,
    profile: profMap.get(p.user_id) ?? null,
  })) as PlateWithProfile[];
}
