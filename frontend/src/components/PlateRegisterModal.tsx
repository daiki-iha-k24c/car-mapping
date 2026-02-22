import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Region } from "../lib/region";
import type { Plate, PlateColor } from "../storage/plates";
import { addPlateCloudWithResult } from "../storage/platesCloud";
import { renderPlateSvg } from "../svg/renderPlateSvg";
import { normalizeSerial4 } from "../lib/serial4";
import { supabase } from "../lib/supabaseClient";
// PlateRegisterModal.tsx
import { RegisterResultPopup } from "../components/RegisterResultPopup";
import type { RegisterResult } from "../storage/platesCloud"; // ✅ こっちから

export type PlateRegisterModalProps = {
  open: boolean;
  userId: string | null;
  regions: Array<Region & { reading?: string }>;
  onClose: () => void;
  onRegistered: (regionName: string) => void;
};

type FormState = {
  regionName: string;
  regionId: string;

  classNumber: string;
  kana: string;
  color: PlateColor | "";

  serialRaw: string; // ✅ 数字だけ（最大4桁）例: "3" "36" "364" "3645"
  capturedAt: string;
};

function ensureViewBox(svg: string) {
  // 既に viewBox があっても、無くても、必ず 320x180 に固定
  if (/viewBox="/i.test(svg)) {
    return svg.replace(/viewBox="[^"]*"/i, 'viewBox="0 0 320 180"');
  }
  // viewBox が無い場合：<svg ...> に追加
  return svg.replace(/<svg\b/i, '<svg viewBox="0 0 320 180"');
}

function fixSvgViewBox(svg: string) {
  return ensureViewBox(svg);
}

const COLORS: Array<{ label: string; value: PlateColor }> = [
  { label: "白", value: "white" },
  { label: "黄", value: "yellow" },
  { label: "緑", value: "green" },
  { label: "黒", value: "black" },
];

function digitsOnly4(raw: string) {
  return raw.replace(/\D/g, "").slice(-4);
}

function classNumberNormalize(raw: string) {
  return raw
    .toUpperCase()          // 小文字 → 大文字
    .replace(/[^0-9A-Z]/g, "") // 数字とA–Z以外を除外
    .slice(0, 3);           // 最大3文字
}


function isHiragana(value: string) {
  return /^[\u3041-\u3096\u309D-\u309F]+$/.test(value);
}

function serialPreviewRightDots(raw: string) {
  const d = digitsOnly4(raw);
  if (!d) return "";
  if (d.length === 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return d.padStart(4, "・");
}

function serialForSave(raw: string) {
  const d = digitsOnly4(raw);
  if (!d) return "";
  if (d.length === 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return d.padStart(4, "・");
}

function colorLabel(c: PlateColor | "") {
  const hit = COLORS.find((x) => x.value === c);
  return hit?.label ?? "—";
}

function initialState(): FormState {
  return {
    regionName: "",
    regionId: "",
    classNumber: "",
    kana: "",
    color: "",
    serialRaw: "",
    capturedAt: ""
  };
}

function fitSvgToBox(svg: string) {
  let s = ensureViewBox(svg);

  // ✅ 重要：<svg ...> の中だけを置換して width/height を削除する
  s = s.replace(/<svg\b[^>]*>/i, (tag) => {
    let t = tag;

    // svg の width/height だけ削除
    t = t.replace(/\s(width|height)="[^"]*"/g, "");

    // ✅ ここを「100%固定」じゃなく「maxで収める」に変える
    // width/height 属性は付けない（ズレの原因になりやすい）
    if (!/\spreserveAspectRatio=/.test(t)) {
      t = t.replace(/>$/, ' preserveAspectRatio="xMidYMid meet">');
    }

    // style 追記（maxで収める）
    const add = "display:block; max-width:100%; max-height:100%; width:auto; height:auto;";
    if (/\sstyle="/i.test(t)) {
      t = t.replace(/\sstyle="([^"]*)"/i, (_m, p1) => {
        const base = (p1 || "").trim();
        const next = base ? `${base}; ${add}` : add;
        return ` style="${next}"`;
      });
    } else {
      t = t.replace(/>$/, ` style="${add}">`);
    }

    return t;
  });

  return s;
}


async function collectSerialOnce(params: {
  regionName: string;
  classNumber: string;
  kana: string;
  serialRaw: string;
  serialDisplay: string;
  color: PlateColor;
}) {
  const serial4 = normalizeSerial4(params.serialRaw);
  if (!serial4) throw new Error("下4桁が不正です（0〜4桁の数字で入力してね）");

  const svg = renderPlateSvg({
    regionName: params.regionName,
    classNumber: params.classNumber,
    kana: params.kana,
    serial: params.serialDisplay,
    color: params.color,
  });

  const { data, error } = await supabase.rpc("collect_serial_once", {
    p_serial4: serial4,
    p_first_plate_svg: svg,
  });

  if (error) throw error;
  return { serial4, isFirst: !!data };
}

/** ✅ 追加：画像アップロード（Supabase Storage） */
async function uploadPlateImage(args: {
  userId: string;
  plateId: string;
  file: File;
}) {
  const bucket = "plate-images"; // ← Storage にこのバケット名で作ってね
  const ext = (args.file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${args.userId}/${args.plateId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, args.file, {
      upsert: true,
      contentType: args.file.type || "image/jpeg",
      cacheControl: "3600",
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl; // 公開URL（※非公開運用したいなら signedURL に変更）
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 14, color: "#111827", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "2px solid #e5e7eb",
        padding: "0 12px",
        fontSize: 16,
        outline: "none",
        background: "#fff",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function PlateRegisterModal({
  open,
  userId,
  regions,
  onClose,
  onRegistered,
}: PlateRegisterModalProps) {
  // ✅ hooksは必ずここに集約（順番固定）
  const [v, setV] = useState<FormState>(initialState());
  // const [done, setDone] = useState(false);
  const [dupMsg, setDupMsg] = useState<string>("");

  const [saving, setSaving] = useState(false);
  // const [okMsg, setOkMsg] = useState<string>("");
  const [tried, setTried] = useState(false);

  const [doneOpen, setDoneOpen] = useState(false);
  const [doneResult, setDoneResult] = useState<RegisterResult | null>(null);

  // ✅ 画像
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const regionMatch = useMemo(() => {
    const name = v.regionName.trim();
    if (!name) return null;
    return regions.find((r) => r.name === name) ?? null;
  }, [regions, v.regionName]);

  const isRegionValid = !!regionMatch;
  const kanaValue = v.kana.trim();
  const isKanaValid = !!kanaValue && isHiragana(kanaValue);

  const regionError = v.regionName && !isRegionValid ? "存在しない地域名です" : "";
  const kanaError = v.kana && !isKanaValid ? "ひらがなで入力してください" : "";

  const serial = useMemo(() => serialPreviewRightDots(v.serialRaw), [v.serialRaw]);

  // ✅ 画像必須・ログイン必須もここに含めるとUX良い
  const canSubmit =
    !!userId &&
    isRegionValid &&
    !!regionMatch?.id &&
    !!v.classNumber &&
    isKanaValid &&
    !!v.color &&
    digitsOnly4(v.serialRaw).length >= 1 &&
    !!photoFile;

  const isPristine = !v.regionName && !v.classNumber && !v.kana && !v.color && !v.serialRaw;

  const previewSvg = useMemo(() => {
    const regionName = (regionMatch?.name ?? v.regionName) || "";
    const classNumber = v.classNumber || "";
    const kana = kanaValue || "";
    const serialForSvg = serial;
    const c: PlateColor = (v.color || "white") as PlateColor;

    return fitSvgToBox(
      renderPlateSvg({
        regionName,
        classNumber,
        kana,
        serial: serialForSvg,
        color: c,
      })
    );
  }, [v.regionName, v.classNumber, v.kana, v.color, serial, regionMatch?.name, kanaValue]);

  const sortedRegions = useMemo(() => {
    return regions.slice().sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [regions]);

  const closeAll = () => {
    setV(initialState());
    setSaving(false);
    setTried(false);
    setDupMsg("");
    setPhotoFile(null);
    setPhotoPreview("");
    setDoneOpen(false);
    setDoneResult(null);
    onClose();
  };

  type SubmitState = "idle" | "saving";
  const submitState: SubmitState = saving ? "saving" : "idle";

  const submitStyleMap: Record<SubmitState, React.CSSProperties> = {
    idle: {
      background: "#f97316",
      boxShadow: "0 6px 16px rgba(249,115,22,0.35)",
      cursor: "pointer",
    },
    saving: {
      background: "#60a5fa",
      boxShadow: "0 6px 16px rgba(96,165,250,0.35)",
      cursor: "wait",
    },
  };

  // ✅ ホームから開く登録モーダル
  const [plateOpen, setPlateOpen] = useState(false);

  // ✅ 登録済みプレート（ホームで押して確認用）
  const [plates, setPlates] = useState<Plate[]>([]);
  const [peekOpen, setPeekOpen] = useState(false);
  const [peekPlate, setPeekPlate] = useState<Plate | null>(null);

  const openPlate = (p: Plate) => {
    setPeekPlate(p);
    setPeekOpen(true);
  };


  // ✅ hooksの後にreturn（これが鉄則）
  if (!open) return null;

  const submit = async () => {
  if (saving) return;

  setTried(true);

  if (!canSubmit) {
    if (!photoFile) setDupMsg("画像は必須です。プレート写真を選択してください。");
    return;
  }

  setSaving(true);
  setDupMsg("");

  if (!userId) {
    setDupMsg("ログイン確認中です。少し待ってからもう一度試してください。");
    setSaving(false);
    return;
  }

  const serialValue = serialForSave(v.serialRaw);
  if (!serialValue) {
    setSaving(false);
    return;
  }

  const color = v.color as PlateColor;

  const svg = fixSvgViewBox(
    renderPlateSvg({
      regionName: regionMatch?.name ?? v.regionName.trim(),
      classNumber: v.classNumber,
      kana: kanaValue,
      serial: serialValue,
      color,
    })
  );

  const plateId = crypto.randomUUID();
  const capturedAtIso = v.capturedAt
    ? new Date(`${v.capturedAt}T00:00:00`).toISOString()
    : null;

  const plate: Plate = {
    id: plateId,
    regionId: regionMatch?.id ?? v.regionId,
    classNumber: v.classNumber,
    kana: kanaValue,
    serial: serialValue,
    color,
    renderSvg: svg,
    createdAt: new Date().toISOString(),
    capturedAt: capturedAtIso,
  };

  try {
    const regionId = `${regionMatch!.pref}:${regionMatch!.name}`;

    const photoUrl = await uploadPlateImage({
      userId,
      plateId,
      file: photoFile!,
    });

    const plateFixed = {
      ...plate,
      regionId,
      regionName: regionMatch!.name,
      prefName: regionMatch!.pref,
      photo_url: photoUrl,
    };

    const result = await addPlateCloudWithResult(userId, plateFixed);

    setDoneResult(result);
    setDoneOpen(true);

    onRegistered(regionMatch!.name);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
      setDupMsg(`すでに登録済み：${v.regionName} ${v.classNumber} ${v.kana} ${serialValue}`);
    } else {
      setDupMsg(msg || "保存に失敗しました");
    }
  } finally {
    setSaving(false);
  }
};

  // ↓↓↓ ここから先の JSX は、あなたの既存の return をそのまま使ってOK
  // （画像UI、登録ボタン、完了メッセージなど）

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAll();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 20,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",

          // ✅ 追加：画面内に収めて中をスクロール
          maxHeight: "min(86vh, 740px)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* プレビュー */}
        <div
          style={{
            height: 150,
            borderRadius: 14,
            border: "2px solid #e5e7eb",
            marginBottom: 14,
            overflow: "hidden",
            background: "#fff",
            padding: 10,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="プレビュー"
        >
          {isPristine ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                fontSize: 18,
                letterSpacing: 2,
              }}
            >
              プレビュー
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          )}
        </div>

        {/* 入力欄：2カラム */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="地域">
            <input
              value={v.regionName}
              onChange={(e) => {
                const next = e.target.value;
                const match = regions.find((r) => r.name === next.trim());
                setV((p) => ({
                  ...p,
                  regionName: next,
                  regionId: match?.id ?? "",
                }));
                setDupMsg("");
              }}
              placeholder="（例）品川"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 16,
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />

            {regionError && <div style={{ marginTop: 6, fontSize: 12, color: "#b45309" }}>{regionError}</div>}

            <datalist id="region-options">
              {sortedRegions.map((r) => (
                <option key={r.id} value={r.name} />
              ))}
            </datalist>

          </Field>

          <Field label="分類番号">
            <input
              value={v.classNumber}
              onChange={(e) => {
                const next = classNumberNormalize(e.target.value);
                setV((p) => ({ ...p, classNumber: next }));
              }}
              type="text"
              inputMode="text"
              placeholder="（例）330 / 50A"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 16,
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </Field>

          <Field label="ひらがな">
            <input
              value={v.kana}
              onChange={(e) => setV((p) => ({ ...p, kana: e.target.value }))}
              placeholder="（例）あ"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 16,
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
            {kanaError && <div style={{ marginTop: 6, fontSize: 12, color: "#b45309" }}>{kanaError}</div>}

            <datalist id="kana-options">
              {[
                "あ", "い", "う", "え", "お",
                "か", "き", "く", "け", "こ",
                "さ", "す", "せ", "そ",
                "た", "て", "と",
                "な", "に", "ぬ", "ね", "の",
                "は", "ひ", "ふ", "へ", "ほ",
                "ま", "み", "む", "め", "も",
                "や", "ゆ", "よ",
                "ら", "り", "る", "れ", "ろ",
                "わ",
              ].map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </Field>

          <Field label="色">
            <Select
              value={v.color}
              onChange={(x) => setV((p) => ({ ...p, color: x as PlateColor }))}
              placeholder="選択"
              options={COLORS.map((c) => ({ value: c.value, label: c.label }))}
            />
          </Field>
        </div>

        {/* ナンバー */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 14, color: "#111827", marginBottom: 8 }}>ナンバー</div>

          <input
            value={v.serialRaw}
            onChange={(e) => {
              const d = digitsOnly4(e.target.value);
              setV((p) => ({ ...p, serialRaw: d }));
            }}
            type="tel"
            inputMode="numeric"
            placeholder="(例) 1234"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 16,
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            表示: <b>{serial}</b>（右詰めで自動表示）
          </div>
        </div>

        {dupMsg && <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>{dupMsg}</div>}

        {/* ✅ 追加：画像選択（登録ボタンの前） */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, color: "#111827", marginBottom: 8 }}>画像（必須）</div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPhotoFile(f);
              setDupMsg("");
            }}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                height: 44,
                padding: "0 14px",
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              📷 画像を選択
            </button>

            {photoFile && (
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  // input の同一ファイル再選択対策
                  if (fileRef.current) fileRef.current.value = "";
                }}
                style={{
                  height: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "2px solid #fee2e2",
                  background: "#fff5f5",
                  color: "#b91c1c",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                aria-label="画像を外す"
                title="画像を外す"
              >
                ✕
              </button>
            )}
          </div>

          {photoPreview && (
            <div
              style={{
                marginTop: 10,
                borderRadius: 14,
                border: "2px solid #e5e7eb",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <img
                src={photoPreview}
                alt="選択画像プレビュー"
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          {!photoFile && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              ※後から見返す用に、ナンバープレート写真を保存できます
            </div>
          )}
          {tried && !photoFile && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
              画像は必須です。プレート写真を選択してください。
            </div>
          )}

          <label style={{ display: "block", marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>撮影日</div>
            <input
              type="date"
              value={v.capturedAt}
              onChange={(e) => setV((v) => ({ ...v, capturedAt: e.target.value }))}
              className="input"
            />
          </label>


        </div>

        {/* 登録ボタン */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={submit}
            disabled={!canSubmit || submitState !== "idle"}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "none",
              fontSize: 18,
              fontWeight: 900,
              color: "#fff",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden",
              background: canSubmit ? submitStyleMap[submitState].background : "#c7c7c7",
              boxShadow: canSubmit ? submitStyleMap[submitState].boxShadow : "none",
              cursor: canSubmit ? submitStyleMap[submitState].cursor : "not-allowed",
              opacity: canSubmit ? 1 : 0.6,
              ...submitStyleMap[submitState],
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {/* テキスト */}
              <span>
                {submitState === "idle" ? "登録" : "保存中…"}
              </span>
            </span>
          </button>
        </div>
      </div>
      <RegisterResultPopup
        open={doneOpen}
        result={doneResult}
        onClose={() => {
          setDoneOpen(false);
          // ✅ OK押したら登録モーダルも閉じるならここで closeAll()
          closeAll();
        }}
      />
    </div>

  );
}