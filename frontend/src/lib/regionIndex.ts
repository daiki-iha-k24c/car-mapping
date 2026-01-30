import type { Region, RegionRecord } from "./region";
import type { PrefStatus } from "./region"; // PrefStatus が region.ts にある想定（違ったら後述）
import { PLATE_REGIONS } from "../data/plateRegions";

// 都道府県順（地図の並びの基準）
const PREF_ORDER = [
  "北海道",
  "青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県",
  "沖縄県",
] as const;

const prefOrderMap = new Map<string, number>(PREF_ORDER.map((p, i) => [p, i + 1]));

// ✅ regions を CSV（PLATE_REGIONS）から生成
export const regions: Region[] = PLATE_REGIONS
  .map((p, idx) => {
    const prefNo = prefOrderMap.get(p.prefecture) ?? 999;

    // 一意ID（富士山など重複対策）
    const id = `${p.prefecture}:${p.name}`;

    const areaOrder = prefNo * 1000 + idx;

    return {
      id,
      pref: p.prefecture,
      name: p.name,
      areaOrder,
    } as Region;
  })
  .slice()
  .sort(
    (a, b) =>
      a.areaOrder - b.areaOrder ||
      a.pref.localeCompare(b.pref) ||
      a.name.localeCompare(b.name)
  );

// ✅ HomePage が使ってるやつを復活（export）
export function buildPrefProgress(
  regionsList: Region[],
  recordMap: Record<string, RegionRecord>
): Record<string, { done: number; total: number; status: PrefStatus }> {
  const total: Record<string, number> = {};
  const done: Record<string, number> = {};

  for (const r of regionsList) {
    total[r.pref] = (total[r.pref] ?? 0) + 1;
    if (recordMap[r.id]?.completed) done[r.pref] = (done[r.pref] ?? 0) + 1;
  }

  const out: Record<string, { done: number; total: number; status: PrefStatus }> = {};
  for (const pref of Object.keys(total)) {
    const d = done[pref] ?? 0;
    const t = total[pref];
    const status: PrefStatus = d === 0 ? "none" : d === t ? "complete" : "partial";
    out[pref] = { done: d, total: t, status };
  }
  return out;
}
