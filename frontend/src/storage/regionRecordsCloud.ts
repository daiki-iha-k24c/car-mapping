import { supabase } from "../lib/supabaseClient";
import type { RegionRecord } from "../lib/region";

export async function loadRecordsCloud(userId: string): Promise<Record<string, RegionRecord>> {
  const { data, error } = await supabase
    .from("region_records")
    .select("region_id, completed, completed_at, memo")
    .eq("user_id", userId);

  if (error) throw error;

  const map: Record<string, RegionRecord> = {};
  for (const row of data ?? []) {
    map[row.region_id] = {
      regionId: row.region_id,
      completed: !!row.completed,
      completedAt: row.completed_at ?? undefined,
      memo: row.memo ?? "",
    };
  }
  return map;
}

// まとめて保存（upsert）
export async function saveRecordsCloud(userId: string, recordMap: Record<string, RegionRecord>) {
  const rows = Object.entries(recordMap).map(([regionId, rec]) => ({
    user_id: userId,
    region_id: regionId,
    completed: !!rec.completed,
    completed_at: rec.completed ? rec.completedAt ?? new Date().toISOString() : null,
    memo: rec.memo ?? "",
    updated_at: new Date().toISOString(),
  }));

  // 空のときは何もしない（全削除は clear を使う）
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("region_records")
    .upsert(rows, { onConflict: "user_id,region_id" });

  if (error) throw error;
}

export async function clearRecordsCloud(userId: string) {
  const { error } = await supabase
    .from("region_records")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
