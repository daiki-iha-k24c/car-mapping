import { normalizeKana } from "./normalizeKana";
import type { PlateRegionReading } from "../data/plateRegions";

export type IndexedRegion = PlateRegionReading & {
  _keys: string[]; // normalize済み
};

export function buildIndex(regions: PlateRegionReading[]): IndexedRegion[] {
  return regions.map((r) => {
    // ここが重要： name と reading の両方をキーにする
    const keys = Array.from(
      new Set([normalizeKana(r.name), normalizeKana(r.reading)])
    );
    return { ...r, _keys: keys };
  });
}

export function searchRegions(
  index: IndexedRegion[],
  query: string,
  limit = 8
) {
  const q = normalizeKana(query);
  if (!q) return [];

  const hits = index
    .map((r) => {
      const matched = r._keys.find(k => k.startsWith(q));
      if (!matched) return null;

      // 読み一致を優先したいので reading の prefix一致を高優先に
      const readingKey = normalizeKana(r.reading);
      const nameKey = normalizeKana(r.name);

      const score =
        readingKey.startsWith(q) ? 0 :
        nameKey.startsWith(q) ? 1 :
        2;

      return { r, score, tie: matched.length };
    })
    .filter(Boolean) as { r: IndexedRegion; score: number; tie: number }[];

  hits.sort(
    (a, b) =>
      a.score - b.score ||
      a.tie - b.tie ||
      a.r.prefecture.localeCompare(b.r.prefecture) ||
      a.r.name.localeCompare(b.r.name)
  );

  return hits.slice(0, limit).map((x) => x.r);
}
