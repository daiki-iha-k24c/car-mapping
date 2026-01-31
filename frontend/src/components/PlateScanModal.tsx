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

  // 地域名：最初に出てきた漢字2〜4文字（後で辞書寄せ推奨）
  const regionMatch = t.match(/[一-龠]{2,4}/);
  const regionName = regionMatch ? regionMatch[0] : "";

  return { regionName, classNumber, kana, serial };
}

/**
 * videoの実フレームから、中央の「aspect(=2:1)」領域を切り出して dataURL を返す
 * ＝ UIの横長枠に合わせて OCR するためのトリミング
 */
function captureCroppedDataUrl(video: HTMLVideoElement, aspect = 2 / 1) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;

  // まず full を描画（TesseractはpngでもOK）
  const full = document.createElement("canvas");
  full.width = vw;
  full.height = vh;
  const fctx = full.getContext("2d");
  if (!fctx) throw new Error("canvas context unavailable");
  fctx.drawImage(video, 0, 0, vw, vh);

  // 中央の target aspect で切り出し範囲を計算
  let cropW = vw * 0.92; // 横は広め（92%）
  let cropH = cropW / aspect;

  // 高さが入り切らない場合は高さ基準にする
  const maxH = vh * 0.92;
  if (cropH > maxH) {
    cropH = maxH;
    cropW = cropH * aspect;
  }

  const sx = Math.max(0, (vw - cropW) / 2);
  const sy = Math.max(0, (vh - cropH) / 2);

  // 切り出し canvas
  const cut = document.createElement("canvas");
  cut.width = Math.round(cropW);
  cut.height = Math.round(cropH);

  const cctx = cut.getContext("2d");
  if (!cctx) throw new Error("canvas context unavailable");

  cctx.drawImage(
    full,
    sx,
    sy,
    cropW,
    cropH,
    0,
    0,
    cut.width,
    cut.height
  );

  // ここで軽くコントラスト上げたいなら後でいじれる（まずは無しでOK）
  return cut.toDataURL("image/png");
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
        // スマホ向け：背面カメラ優先 + それっぽい解像度
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const takePhoto = async () => {
    setErr("");
    const v = videoRef.current;
    if (!v) return;

    try {
      setBusy(true);

      // ✅ UI枠(2:1)に合わせて中央を切り出してOCRへ
      const croppedUrl = captureCroppedDataUrl(v, 2 / 1);
      setPhotoUrl(croppedUrl);

      const { data } = await Tesseract.recognize(croppedUrl, "jpn", {
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

  // 見た目：横長のプレート枠（2:1）
  const frameWrapStyle: React.CSSProperties = {
    width: "min(92vw, 520px)",
    margin: "0 auto",
  };

  const frameStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: "2 / 1", // ✅ 横長
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    background: "#000",
    border: "1px solid #e5e7eb",
  };

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  // 暗幕 + ガイド枠（中央にプレートを合わせやすく）
  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  // ガイド枠（少し内側）
  const guideStyle: React.CSSProperties = {
    position: "absolute",
    left: "4%",
    right: "4%",
    top: "18%",
    bottom: "18%",
    border: "3px solid rgba(255,255,255,0.85)",
    borderRadius: 18,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
  };

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
            <button className="btn" onClick={onClose}>
              閉じる
            </button>
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
            <div style={frameWrapStyle}>
              <div style={frameStyle}>
                <video ref={videoRef} playsInline muted style={videoStyle} />
                <div style={overlayStyle}>
                  <div style={guideStyle} />
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                枠の中にナンバープレートが入るように合わせて撮ってね（反射が少ない角度が◎）
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button
              className="btn"
              onClick={takePhoto}
              disabled={busy || hasCamera === false}
            >
              {busy ? "読み取り中..." : "写真を撮る"}
            </button>

            {photoUrl && (
              <button
                className="btn"
                onClick={() => {
                  setPhotoUrl("");
                  setRawText("");
                  setResult({
                    regionName: "",
                    classNumber: "",
                    kana: "",
                    serial: "",
                  });
                }}
                disabled={busy}
              >
                撮り直す
              </button>
            )}
          </div>

          {/* 任意：撮影したトリミング画像のプレビュー（デバッグにも便利） */}
          {photoUrl && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                取り込み画像（枠内トリミング）
              </div>
              <img
                src={photoUrl}
                alt=""
                style={{
                  width: "min(92vw, 520px)",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  display: "block",
                }}
              />
            </div>
          )}
        </div>

        {/* 結果 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>候補（修正OK）</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              地域
              <input
                value={result.regionName}
                onChange={(e) =>
                  setResult({ ...result, regionName: e.target.value })
                }
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              分類番号
              <input
                value={result.classNumber}
                onChange={(e) =>
                  setResult({ ...result, classNumber: e.target.value })
                }
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
                onChange={(e) =>
                  setResult({ ...result, serial: e.target.value })
                }
                inputMode="numeric"
              />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={apply} disabled={!canApply || busy}>
              この内容で登録へ
            </button>
          </div>

          {rawText && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", opacity: 0.8 }}>
                OCRの生テキスト
              </summary>
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
