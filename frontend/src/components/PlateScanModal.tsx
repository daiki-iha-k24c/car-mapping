import { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";

type OcrResult = {
  regionName: string;
  classNumber: string;
  kana: string;
  serial: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // ここに「読み取った候補」を渡して、既存の登録フォームに流し込む
  onApply: (r: OcrResult, rawText: string) => void;
};

function normalizeText(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[‐-‒–—−]/g, "-")
    .replace(/ー/g, "-")
    .trim();
}

// 超雑でもまず動く抽出（後で精度上げる）
function parsePlateText(raw: string): OcrResult {
  const t = normalizeText(raw);

  // 一連番号（12-34 みたいな形式）
  const serialMatch = t.match(/\b(\d{1,2}\s*-\s*\d{1,2})\b/);
  const serial = serialMatch ? serialMatch[1].replace(/\s*/g, "") : "";

  // 分類番号（3桁をそれっぽく）
  const classMatch = t.match(/\b(\d{3})\b/);
  const classNumber = classMatch ? classMatch[1] : "";

  // ひらがな1文字（「あ-ん」）
  const kanaMatch = t.match(/[ぁ-ん]/);
  const kana = kanaMatch ? kanaMatch[0] : "";

  // 地域名：最初に出てきた漢字2〜4文字を雑に地域候補にする（後で辞書に寄せる）
  const regionMatch = t.match(/[一-龠]{2,4}/);
  const regionName = regionMatch ? regionMatch[0] : "";

  return { regionName, classNumber, kana, serial };
}

export default function PlateScanModal({ open, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<OcrResult>({
    regionName: "",
    classNumber: "",
    kana: "",
    serial: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const canApply = useMemo(() => {
    // 最低どれか入ってればOK（厳しくしたければここ調整）
    return (
      result.regionName.trim() ||
      result.classNumber.trim() ||
      result.kana.trim() ||
      result.serial.trim()
    );
  }, [result]);

  useEffect(() => {
    if (!open) return;

    setErr("");
    setPhotoUrl("");
    setRawText("");
    setResult({ regionName: "", classNumber: "", kana: "", serial: "" });
    setHasCamera(null);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        setHasCamera(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setHasCamera(false);
        setErr("カメラを起動できませんでした（権限 or https を確認）");
      }
    })();

    return () => {
      // close時にカメラ停止
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const takePhoto = async () => {
    setErr("");
    const v = videoRef.current;
    if (!v) return;

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/png");
    setPhotoUrl(url);

    // OCR
    try {
      setBusy(true);
      const { data } = await Tesseract.recognize(url, "jpn", {
        logger: () => {},
      });

      const text = data.text || "";
      setRawText(text);

      const parsed = parsePlateText(text);
      setResult(parsed);
    } catch (e: any) {
      setErr("OCRに失敗しました（端末が重い場合は撮り直してみて）");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    onApply(result, rawText);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "86vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📷 ナンバー読み取り</h3>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>閉じる</button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
            {err}
          </div>
        )}

        {/* カメラ */}
        <div style={{ marginTop: 12 }}>
          {hasCamera === false ? (
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              カメラが使えません。スマホ + https + 権限許可を確認してね。
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                background: "#000",
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button className="btn" onClick={takePhoto} disabled={busy || hasCamera === false}>
              {busy ? "読み取り中..." : "写真を撮る"}
            </button>
            {photoUrl && (
              <button
                className="btn"
                onClick={() => {
                  setPhotoUrl("");
                  setRawText("");
                  setResult({ regionName: "", classNumber: "", kana: "", serial: "" });
                }}
                disabled={busy}
              >
                撮り直す
              </button>
            )}
          </div>
        </div>

        {/* 結果 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>候補（修正OK）</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              地域
              <input
                value={result.regionName}
                onChange={(e) => setResult({ ...result, regionName: e.target.value })}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              分類番号
              <input
                value={result.classNumber}
                onChange={(e) => setResult({ ...result, classNumber: e.target.value })}
                inputMode="numeric"
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              かな
              <input
                value={result.kana}
                onChange={(e) => setResult({ ...result, kana: e.target.value })}
                maxLength={1}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              一連番号（12-34）
              <input
                value={result.serial}
                onChange={(e) => setResult({ ...result, serial: e.target.value })}
                inputMode="numeric"
              />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={apply} disabled={!canApply || busy}>
              この内容で登録へ
            </button>
          </div>

          {/* デバッグ用（要らなければ消してOK） */}
          {rawText && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", opacity: 0.8 }}>OCRの生テキスト</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}>
                {rawText}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
