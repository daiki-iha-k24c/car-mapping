// NOTE:
// このデータは端末・ブラウザごとに保存されます。
// 別端末や別ブラウザには引き継がれません。

import type { RegionRecord } from "./region";

const KEY = "plate-region-records-v1";

export function loadRecords(): Record<string, RegionRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

export function saveRecords(records: Record<string, RegionRecord>) {
  localStorage.setItem(KEY, JSON.stringify(records));
}
