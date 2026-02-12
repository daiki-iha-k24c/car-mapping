import { supabase } from "../lib/supabaseClient";

// storage/groupMembers.ts みたいに切ってもOK
type FriendshipRow = {
  id: number;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
};

export async function getGroupMemberIds(me: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("user_id,friend_id,status")
    .or(`user_id.eq.${me},friend_id.eq.${me}`)
    .eq("status", "accepted")
    .returns<FriendshipRow[]>();

  if (error) throw error;

  const rows = data ?? [];
  const ids = new Set<string>([me]);

  for (const r of rows) {
    const other = r.user_id === me ? r.friend_id : r.user_id;
    ids.add(other);
  }

  return Array.from(ids);
}


export type PlateWithProfile = any; // ここは今の型のまま

export async function listGroupPlatesByRegion(regionId: string): Promise<PlateWithProfile[]> {
  const { data: ures, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;
  const me = ures.user?.id;
  if (!me) throw new Error("not authenticated");

  // ✅ 合体メンバー（自分＋acceptedフレンド）
  const memberIds = await getGroupMemberIds(me);
  if (memberIds.length === 0) return [];

  // 1) plates（region × memberIds）
  const { data: plates, error: pErr } = await supabase
    .from("plates")
    .select("id,user_id,region_id,render_svg,created_at,class_number,kana,serial,color,photo_url,captured_at")
    .eq("region_id", regionId)
    .in("user_id", memberIds)
    .order("created_at", { ascending: false });

  if (pErr) throw pErr;

  const rows = plates ?? [];
  const userIds = Array.from(new Set(rows.map((p: any) => p.user_id)));
  if (userIds.length === 0) return [];

  // 2) profiles
  const { data: profs, error: prErr } = await supabase
    .from("profiles")
    .select("user_id,username,avatar_url")
    .in("user_id", userIds);

  if (prErr) throw prErr;

  const profMap = new Map(
    (profs ?? []).map((x: any) => [x.user_id, { username: x.username ?? null, avatar_url: x.avatar_url ?? null }])
  );

  return rows.map((p: any) => ({
    ...p,
    profile: profMap.get(p.user_id) ?? null,
  })) as PlateWithProfile[];
}
