// src/lib/serial4.ts
export function normalizeSerial4(input: string): string | null {
  const digits = (input ?? "").replace(/[^\d]/g, "");
  if (digits.length === 0) return null;
  if (digits.length > 4) return null; // 厳しめ（推奨）
  return digits.padStart(4, "0");
}

export function formatSerial4(serial4: string) {
  // 表示用 "1234" -> "12-34"
  return `${serial4.slice(0, 2)}-${serial4.slice(2)}`;
}
