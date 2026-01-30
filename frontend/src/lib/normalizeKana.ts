// カタカナ→ひらがな（簡易）
function kataToHira(s: string) {
  return s.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// 検索用正規化（ひらがな統一）
export function normalizeKana(input: string) {
  return kataToHira(
    input
      .trim()
      .toLowerCase()
      .normalize("NFKC")
      .replace(/\s+/g, "")
      .replace(/[ー−―‐]/g, "")
  );
}
