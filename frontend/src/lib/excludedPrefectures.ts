// frontend/src/lib/excludedPrefectures.ts
export const EXCLUDED_PREFECTURE = "沖縄県" as const;

export function isExcludedPrefecture(prefecture: string | null | undefined) {
  return (prefecture ?? "").trim() === EXCLUDED_PREFECTURE;
}
