import { useMemo, useState } from "react";
import type { Region } from "../lib/region";
import type { PlateColor, Plate } from "../storage/plates";
import { addPlate } from "../storage/plates";
import { renderPlateSvg } from "../svg/renderPlateSvg";
import PlateScanModal from "../components/PlateScanModal";

type Props = {
  open: boolean;
  region: Region | null;
  onClose: () => void;
  onRegistered?: (region: Region) => void;
};

const COLORS: { value: PlateColor; label: string }[] = [
  { value: "white", label: "白" },
  { value: "yellow", label: "黄" },
  { value: "green", label: "緑" },
  { value: "pink", label: "ピンク" },
];

// SVG救済（古いrenderSvg対策）
const fixSvgViewBox = (svg: string) =>
  svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');

const toSvgDataUrlBase64 = (svg: string) =>
  `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

export default function PlateRegisterModal({
  open,
  region,
  onClose,
  onRegistered,
}: Props) {
  // ✅ Hooksは return null より前に全部置く
  const [classNumber, setClassNumber] = useState("300");
  const [kana, setKana] = useState("さ");
  const [serial, setSerial] = useState("12-34");
  const [color, setColor] = useState<PlateColor>("white");
  const [done, setDone] = useState(false);

  const [scanOpen, setScanOpen] = useState(false);

  const normalizeSerial = (s: string) => {
    // いろんなハイフンを半角 "-" に寄せる
    const t = s.trim().replace(/[‐-‒–—−ー－]/g, "-");
    // "1234" なら "12-34" にする
    const digits = t.replace(/\D/g, "");
    if (digits.length === 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return t;
  };

  const validate = () => {
    if (!/^\d{2,3}$/.test(classNumber.trim()))
      return "分類番号は2〜3桁で入力してね（例：300）";
    if (!kana.trim()) return "ひらがなを入力してね";
    const s = normalizeSerial(serial);
    if (!/^\d{2}-\d{2}$/.test(s))
      return "番号は 12-34 形式（または 1234）で入力してね";
    return "";
  };

  const svg = useMemo(() => {
    if (!region) return "";
    return renderPlateSvg({
      regionName: region.name,
      classNumber: classNumber.trim(),
      kana: kana.trim(),
      serial: normalizeSerial(serial),
      color,
    });
  }, [region, classNumber, kana, serial, color]);

  // ✅ ここでimg用に変換（プレビューも完了もこれで表示）
  const safeSvg = useMemo(() => (svg ? fixSvgViewBox(svg) : ""), [svg]);
  const previewSrc = useMemo(
    () => (safeSvg ? toSvgDataUrlBase64(safeSvg) : ""),
    [safeSvg]
  );

  if (!open || !region) return null;

  const onSubmit = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const safe = fixSvgViewBox(svg);

    const plate: Plate = {
      id: crypto.randomUUID(),
      regionId: region.id,
      classNumber: classNumber.trim(),
      kana: kana.trim(),
      serial: normalizeSerial(serial),
      color,
      renderSvg: safe, // ✅ 保存時点で救済
      createdAt: new Date().toISOString(),
    };

    addPlate(plate);
    onRegistered?.(region);
    setDone(true);
  };

  const close = () => {
    setDone(false);
    setScanOpen(false);
    onClose();
  };

  const errorMessage = validate();
  const isValid = errorMessage === "";

  return (
    <>
      {/* ✅ スキャンモーダル */}
      <PlateScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onApply={(r) => {
          // OCRの候補をフォームに流し込む（必要なものだけ）
          if (r.classNumber) setClassNumber(r.classNumber);
          if (r.kana) setKana(r.kana);
          if (r.serial) setSerial(r.serial);
          // regionName はこのモーダルでは region 固定なので使わない
        }}
      />

      {/* 🔽 登録モーダル */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 1000,
        }}
        onClick={close}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            maxHeight: "90vh",
            overflow: "auto",
            background: "#fff",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {region.pref} / {region.name} に登録
            </h2>
            <button className="btn" onClick={close} style={{ marginLeft: "auto" }}>
              閉じる
            </button>
          </div>

          {done ? (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontWeight: 700 }}>登録が完了しました。</p>

              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 10,
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {/* ✅ 完了表示もimg化 */}
                {previewSrc ? (
                  <img className="plate-img" src={previewSrc} alt="" />
                ) : null}
              </div>

              <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={close}>
                OK
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 14 }}>
              <div>
                {/* ✅ スキャンボタン追加（登録フォーム側の上が使いやすい） */}
                <button
                  className="btn"
                  onClick={() => setScanOpen(true)}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  📷 スキャン
                </button>

                <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>
                  分類番号
                </label>
                <input
                  value={classNumber}
                  onChange={(e) => setClassNumber(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  inputMode="numeric"
                />

                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 10,
                  }}
                >
                  ひらがな
                </label>
                <input
                  value={kana}
                  onChange={(e) => setKana(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  maxLength={1}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 10,
                  }}
                >
                  番号（12-34）
                </label>
                <input
                  value={normalizeSerial(serial)}
                  onChange={(e) => setSerial(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  inputMode="numeric"
                />

                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 10,
                  }}
                >
                  色
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      type="button"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: c.value === color ? "2px solid #111" : "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {!isValid && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={onSubmit}
                  disabled={!isValid}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    border: "none",
                    background: isValid ? "#2563eb" : "#e5e7eb",
                    color: isValid ? "#fff" : "#9ca3af",
                    cursor: isValid ? "pointer" : "not-allowed",
                  }}
                >
                  登録
                </button>
              </div>

              {/* プレビュー */}
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>プレビュー</div>
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 10,
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {/* ✅ プレビューもimg化 */}
                  {previewSrc ? (
                    <img className="plate-img" src={previewSrc} alt="" />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
