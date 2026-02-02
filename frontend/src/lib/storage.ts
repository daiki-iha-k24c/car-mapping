// NOTE:
// このデータは端末・ブラウザごとに保存されます。
// 別端末や別ブラウザには引き継がれません。

import type { RegionRecord } from "./region";

const KEY_BASE = "plate-region-records-v1";

function key(userId: string) {
  return `${KEY_BASE}:${userId}`;
}

export function loadRecords(userId: string): Record<string, RegionRecord> {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

export function saveRecords(userId: string, records: Record<string, RegionRecord>) {
  localStorage.setItem(key(userId), JSON.stringify(records));
}

export function clearRecords(userId: string) {
  localStorage.removeItem(key(userId));
}
