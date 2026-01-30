import { useMemo, useState } from "react";
import type { Region } from "../lib/region"; // ← HomePageで使ってる型に合わせる
import type { PlateColor, Plate, PlateStyle } from "../storage/plates";
import { addPlate } from "../storage/plates";
import { renderPlateSvg } from "../svg/renderPlateSvg";

type Props = {
  open: boolean;
  region: Region | null;
  onClose: () => void;
  onRegistered?: (region: Region) => void; // ✅追加

};

const COLORS: { value: PlateColor; label: string }[] = [
  { value: "white", label: "白" },
  { value: "yellow", label: "黄" },
  { value: "green", label: "緑" },
  { value: "pink", label: "ピンク" },
];

export default function PlateRegisterModal({ open, region, onClose, onRegistered }: Props) {
  const [classNumber, setClassNumber] = useState("300");
  const [kana, setKana] = useState("さ");
  const [serial, setSerial] = useState("12-34");
  const [color, setColor] = useState<PlateColor>("white");
  const [style, setStyle] = useState<PlateStyle>("digital");
  const [done, setDone] = useState(false);

  const svg = useMemo(() => {
    if (!region) return "";
    return renderPlateSvg({
      regionName: region.name,
      classNumber: classNumber.trim(),
      kana: kana.trim(),
      serial: serial.trim(),
      color,
    });
  }, [region, classNumber, kana, serial, color]);

  if (!open || !region) return null;

  const normalizeSerial = (s: string) => {
    // いろんなハイフンを半角 "-" に寄せる
    const t = s.trim().replace(/[‐-‒–—−ー－]/g, "-");
    // "1234" なら "12-34" にする
    const digits = t.replace(/\D/g, "");
    if (digits.length === 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return t;
  };


  const validate = () => {
    if (!/^\d{2,3}$/.test(classNumber.trim())) return "分類番号は2〜3桁で入力してね（例：300）";
    if (!kana.trim()) return "ひらがなを入力してね";
    const s = normalizeSerial(serial);
    if (!/^\d{2}-\d{2}$/.test(s)) return "番号は 12-34 形式（または 1234）で入力してね";
    return "";
  };

  const onSubmit = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const plate: Plate = {
      id: crypto.randomUUID(),
      regionId: region.id,
      classNumber: classNumber.trim(),
      kana: kana.trim(),
      serial: normalizeSerial(serial),
      color,
      renderSvg: svg,
      createdAt: new Date().toISOString(),
    };

    addPlate(plate);
    onRegistered?.(region);
    setDone(true);
  };

  const close = () => {
    setDone(false);
    onClose();
  };
  const errorMessage = validate();
  const isValid = errorMessage === "";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 560;

  return (
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {region.pref} / {region.name} に登録
          </h2>
          <button
            className="btn"
            onClick={close}
            style={{ marginLeft: "auto" }}
          >
            閉じる
          </button>
        </div>

        {done ? (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontWeight: 700 }}>登録が完了しました。</p>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10, overflow: "hidden" }}>
              <div className="plate-svg-wrap" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={close}>
              OK
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>分類番号</label>
              <input
                value={classNumber}
                onChange={(e) => setClassNumber(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />

              <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginTop: 10 }}>ひらがな</label>
              <input
                value={kana}
                onChange={(e) => setKana(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />

              <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginTop: 10 }}>番号（12-34）</label>
              <input
                value={normalizeSerial(serial)}
                onChange={(e) => setSerial(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />

              <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginTop: 10 }}>色</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
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

            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>プレビュー</div>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10, overflow: "hidden" }}>
                <div className="plate-svg-wrap" dangerouslySetInnerHTML={{ __html: svg }} />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
