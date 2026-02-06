import { useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Region } from "../lib/region";
import type { Plate, PlateColor } from "../storage/plates";
import { addPlateCloud } from "../storage/platesCloud";
import { renderPlateSvg } from "../svg/renderPlateSvg";
import { normalizeSerial4 } from "../lib/serial4";
import { supabase } from "../lib/supabaseClient";

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
};

type PlateParseResult = {
  regionName: string | null;
  classNumber: string | null;
  kana: string | null;
  serial: string | null; // "84-29" or "8429" とか
  confidence?: number | null;
  notes?: string | null;
};

function fixSvgViewBox(svg: string) {
  // 既存 HomePage と同じ補正
  return svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');
}

const COLORS: Array<{ label: string; value: PlateColor }> = [
  { label: "白", value: "white" },
  { label: "黄", value: "yellow" },
  { label: "緑", value: "green" },
  { label: "ピンク", value: "pink" },
];

function digitsOnly4(raw: string) {
  // 数字だけ抽出して末尾4桁だけ残す（ペースト対策）
  return raw.replace(/\D/g, "").slice(-4);
}

function digitsOnly3(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 3);
}

function isHiragana(value: string) {
  return /^[\u3041-\u3096\u309D-\u309F]+$/.test(value);
}

// プレビュー用：右詰めで「・」埋め（例: "3"→"・・・3"）
function serialPreviewRightDots(raw: string) {
  const d = digitsOnly4(raw);
  if (!d) return "";

  // ✅ 4桁揃ったら 12-34 にしてプレビューもハイフン表示
  if (d.length === 4) return `${d.slice(0, 2)}-${d.slice(2)}`;

  // ✅ 途中は右詰め「・」埋め（例: "3"→"・・・3"）
  return d.padStart(4, "・");
}

// 保存用：4桁そろったら "12-34"
function serialForSave(raw: string) {
  const d = digitsOnly4(raw);
  if (!d) return ""; // 0桁は不可

  // 4桁はハイフン形式
  if (d.length === 4) return `${d.slice(0, 2)}-${d.slice(2)}`;

  // 1〜3桁は右詰め点埋め（・・・1 / ・・12 / ・123）
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
  };
}

function fitSvgToBox(svg: string) {
  let s = svg;

  // viewBox を固定
  s = s.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');

  // ✅ 重要：<svg ...> の中だけを置換して width/height を削除する
  s = s.replace(/<svg\b[^>]*>/i, (tag) => {
    let t = tag;

    // svg の width/height だけ削除（rectなどのは残す）
    t = t.replace(/\s(width|height)="[^"]*"/g, "");

    // 属性付与（styleは壊さない）
    if (!/\swidth=/.test(t)) t = t.replace(/>$/, ' width="100%">');
    if (!/\sheight=/.test(t)) t = t.replace(/>$/, ' height="100%">');
    if (!/\spreserveAspectRatio=/.test(t)) {
      t = t.replace(/>$/, ' preserveAspectRatio="xMidYMid meet">');
    }

    // style は追記
    if (/\sstyle="/i.test(t)) {
      t = t.replace(/\sstyle="([^"]*)"/i, (_m, p1) => {
        const base = (p1 || "").trim();
        const hasDisplay = /(^|;)\s*display\s*:/i.test(base);
        const next = hasDisplay ? base : base ? `${base}; display:block;` : "display:block;";
        return ` style="${next}"`;
      });
    } else {
      t = t.replace(/>$/, ' style="display:block;">');
    }

    return t;
  });

  return s;
}

async function collectSerialOnce(params: {
  regionName: string;
  classNumber: string;
  kana: string;
  serialRaw: string; // 達成判定用（数字だけでもOK）
  serialDisplay: string; // ★表示用（"・・・1" / "12-34"）
  color: PlateColor;
}) {
  const serial4 = normalizeSerial4(params.serialRaw);
  if (!serial4) throw new Error("下4桁が不正です（0〜4桁の数字で入力してね）");

  // ★表示は「登録時の見た目」を優先
  const svg = renderPlateSvg({
    regionName: params.regionName,
    classNumber: params.classNumber,
    kana: params.kana,
    serial: params.serialDisplay, // ←ここが重要
    color: params.color,
  });

  const { data, error } = await supabase.rpc("collect_serial_once", {
    p_serial4: serial4,
    p_first_plate_svg: svg,
  });

  if (error) throw error;
  return { serial4, isFirst: !!data };
}

// ===== 画像読み取りユーティリティ =====

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file read error"));
    reader.onload = () => {
      const s = String(reader.result || "");
      const idx = s.indexOf("base64,");
      if (idx >= 0) resolve(s.slice(idx + "base64,".length));
      else reject(new Error("base64 not found"));
    };
    reader.readAsDataURL(file);
  });
}

function normalizeSerialToRaw4(serial: string | null) {
  if (!serial) return "";
  const digits = serial.replace(/[^\d]/g, "");
  return digitsOnly4(digits);
}

function pickClosestRegionName(input: string, regions: Array<Region & { reading?: string }>) {
  const s = input.trim();
  if (!s) return "";

  const exact = regions.find((r) => r.name === s);
  if (exact) return exact.name;

  const partial = regions.find((r) => r.name.includes(s) || s.includes(r.name));
  if (partial) return partial.name;

  return s;
}

export default function PlateRegisterModal({
  open,
  userId,
  regions,
  onClose,
  onRegistered,
}: PlateRegisterModalProps) {
  const [v, setV] = useState<FormState>(initialState());
  const [done, setDone] = useState(false);
  const [dupMsg, setDupMsg] = useState<string>("");

  // 画像読み取り state
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string>("");

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

  const canSubmit =
    isRegionValid &&
    !!regionMatch?.id &&
    !!v.classNumber &&
    isKanaValid &&
    !!v.color &&
    digitsOnly4(v.serialRaw).length >= 1;

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

  const closeAll = () => {
    setV(initialState());
    setDone(false);
    setDupMsg("");
    setImgError("");
    onClose();
  };

  // ===== 画像読み取り handlers =====

  const pickImage = () => {
    setImgError("");
    fileRef.current?.click();
  };

  const applyParsed = (parsed: PlateParseResult) => {
    const rn = pickClosestRegionName(parsed.regionName ?? "", regions);
    const match = regions.find((r) => r.name === rn) ?? null;

    const serialRaw = normalizeSerialToRaw4(parsed.serial);

    setV((p) => ({
      ...p,
      regionName: rn || p.regionName,
      regionId: match?.id ?? p.regionId,
      classNumber: digitsOnly3(parsed.classNumber ?? "") || p.classNumber,
      kana: (parsed.kana ?? "").trim() || p.kana,
      serialRaw: serialRaw || p.serialRaw,
    }));
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setImgLoading(true);
      setImgError("");

      const b64 = await fileToBase64(file);

      const res = await fetch("/api/plate/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: b64,
          regionCandidates: regions.map((r) => r.name),
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`画像の読み取りに失敗しました (${res.status}) ${t}`);
      }

      const parsed: PlateParseResult = await res.json();
      applyParsed(parsed);

      const conf = parsed.confidence ?? null;
      if (conf != null && conf < 0.6) {
        setImgError("読み取り精度が低い可能性があります。内容を確認してね。");
      }
    } catch (err: any) {
      setImgError(err?.message ?? "画像の読み取りに失敗しました");
    } finally {
      setImgLoading(false);
    }
  };

  // ===== submit =====

  const submit = async () => {
    if (done) return;
    if (!isRegionValid || !isKanaValid || !canSubmit) return;

    if (!userId) {
      setDupMsg("ログイン確認中です。少し待ってからもう一度試してください。");
      return;
    }

    const serialValue = serialForSave(v.serialRaw);
    if (!serialValue) return;

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

    const plate: Plate = {
      id: crypto.randomUUID(),
      regionId: regionMatch?.id ?? v.regionId,
      classNumber: v.classNumber,
      kana: kanaValue,
      serial: serialValue,
      color,
      renderSvg: svg,
      createdAt: new Date().toISOString(),
    };

    try {
      // 🔑 regionId を PrefModal と完全一致させる
      const regionId = `${regionMatch.pref}:${regionMatch.name}`;

      const plateFixed = {
        ...plate,
        regionId, // ← ここが最重要
        regionName: regionMatch.name,
        prefName: regionMatch.pref,
      };

      console.log("SAVE userId", userId, "regionId", regionId);

      // ① まずプレート保存
      await addPlateCloud(userId, plateFixed);

      // ② 4桁コレクション登録
      await collectSerialOnce({
        regionName: regionMatch?.name ?? v.regionName.trim(),
        classNumber: v.classNumber,
        kana: kanaValue,
        serialRaw: v.serialRaw,
        serialDisplay: serialValue,
        color,
      });

      onRegistered(regionMatch?.name ?? v.regionName.trim());
      setDone(true);
      setDupMsg("");
    } catch (e: any) {
      const msg = String(e?.message ?? "");

      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        setDupMsg(`すでに登録済み：${v.regionName} ${v.classNumber} ${v.kana} ${serialValue}`);
        return;
      }

      setDupMsg(msg || "保存に失敗しました");
    }
  };

  if (!open) return null;

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
            <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
          )}
        </div>

        {/* ✅ 画像から読み込み（プレビューと入力の間） */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <button
            type="button"
            onClick={pickImage}
            disabled={imgLoading}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              background: "#fff",
              fontSize: 15,
              fontWeight: 900,
              cursor: imgLoading ? "not-allowed" : "pointer",
              opacity: imgLoading ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {imgLoading ? "読み取り中..." : "画像から読み込む"}
          </button>

          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />

          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.2 }}>
            ナンバープレートだけ写ってる画像が得意
            {imgError ? (
              <div style={{ marginTop: 4, color: "#b45309", fontWeight: 800 }}>{imgError}</div>
            ) : null}
          </div>
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
              list="region-options"
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
              {regions
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "ja"))
                .map((r) => (
                  <option key={r.id} value={r.name} />
                ))}
            </datalist>
          </Field>

          <Field label="分類番号">
            <input
              value={v.classNumber}
              onChange={(e) => {
                const next = digitsOnly3(e.target.value);
                setV((p) => ({ ...p, classNumber: next }));
              }}
              type="tel"
              inputMode="numeric"
              placeholder="（例）582"
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
              list="kana-options"
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
                "あ",
                "い",
                "う",
                "え",
                "お",
                "か",
                "き",
                "く",
                "け",
                "こ",
                "さ",
                "す",
                "せ",
                "そ",
                "た",
                "て",
                "と",
                "な",
                "に",
                "ぬ",
                "ね",
                "の",
                "は",
                "ひ",
                "ふ",
                "へ",
                "ほ",
                "ま",
                "み",
                "む",
                "め",
                "も",
                "や",
                "ゆ",
                "よ",
                "ら",
                "り",
                "る",
                "れ",
                "ろ",
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

        {dupMsg && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>
            {dupMsg}
          </div>
        )}

        {/* 登録ボタン */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={submit}
            disabled={!canSubmit || done}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "none",
              fontSize: 18,
              fontWeight: 900,
              color: "#fff",
              background: canSubmit ? "#f97316" : "#c7c7c7",
              boxShadow: canSubmit ? "0 6px 16px rgba(249,115,22,0.35)" : "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: done ? 0.7 : 1,
            }}
          >
            登録
          </button>
        </div>

        {/* 完了メッセージ */}
        {done && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>
              登録が完了しました
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
                {v.regionName} {v.classNumber} {v.kana} {serial}
                {" / "}色: {colorLabel(v.color)}
              </div>
            </div>
            <button
              onClick={closeAll}
              style={{
                border: "none",
                background: "#10b981",
                color: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
