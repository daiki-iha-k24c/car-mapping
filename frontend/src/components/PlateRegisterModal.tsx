import { useMemo, useState } from "react";
import type { Region } from "../lib/region";
import type { Plate, PlateColor } from "../storage/plates";
import { addPlateCloud } from "../storage/platesCloud";
import { renderPlateSvg } from "../svg/renderPlateSvg";
import { normalizeSerial4, formatSerial4 } from "../lib/serial4";
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

function fixSvgViewBox(svg: string) {
  // 既存 HomePage と同じ補正
  return svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');
}

// function isDuplicate(
//   userId: string,
//   regionId: string,
//   classNumber: string,
//   kana: string,
//   serial: string
// ) {
//   const list = listPlatesByRegionId(userId, regionId);
//   return list.some((p) => p.classNumber === classNumber && p.kana === kana && p.serial === serial);
// }

const KANAS = [
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
];

// 色（storage/plates の PlateColor 定義に合わせる）
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
    serialRaw: "", // ✅
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
      t = t.replace(/\sstyle="([^"]*)"/i, (m, p1) => {
        const base = (p1 || "").trim();
        const hasDisplay = /(^|;)\s*display\s*:/i.test(base);
        const next = hasDisplay ? base : (base ? `${base}; display:block;` : "display:block;");
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
  serialRaw: string;      // 達成判定用（数字だけでもOK）
  serialDisplay: string;  // ★表示用（"・・・1" / "12-34"）
  color: any;             // PlateColor
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

  const regionOptions = useMemo(() => {
    // 表示を「横浜（神奈川）」みたいにしたい場合はここで整形可能
    // 今回は name をそのまま候補に
    return regions
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((r) => ({ label: r.name, value: r.id }));
  }, [regions]);

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
    digitsOnly4(v.serialRaw).length >= 1; // ✅ 4桁必須

  const isPristine =
    !v.regionName &&
    !v.classNumber &&
    !v.kana &&
    !v.color &&
    !v.serialRaw; // ✅

  const isDirty = !isPristine;

  const previewSvg = useMemo(() => {
    const regionName = (regionMatch?.name ?? v.regionName) || "";
    const classNumber = v.classNumber || "";
    const kana = kanaValue || "";
    const serialForSvg = serial; // ✅ "・・・3" などをそのまま渡す

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
  }, [v.regionName, v.classNumber, v.kana, v.color, serial]);



  if (!open) return null;

  const closeAll = () => {
    setV(initialState());
    setDone(false);
    setDupMsg("");
    onClose();
  };

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
        regionId,                    // ← ここが最重要
        regionName: regionMatch.name,
        prefName: regionMatch.pref,
      };

      console.log("SAVE userId", userId, "regionId", regionId);

      // ① まずプレート保存（今まで通り）
      await addPlateCloud(userId, plateFixed);

      // ② 4桁コレクション登録（ここが追加）
      // v.serialRaw は digitsOnly4 済みで "0〜4桁数字" になってるのでそのまま使える
      const { serial4, isFirst } = await collectSerialOnce({
        regionName: regionMatch?.name ?? v.regionName.trim(),
        classNumber: v.classNumber,
        kana: kanaValue,
        serialRaw: v.serialRaw,      // 達成判定用（数字だけ）
        serialDisplay: serialValue,  // ★見た目は登録したもの
        color,
      });


      // 任意：メッセージ出したいなら
      // setDupMsg(isFirst ? `新規コレクション！ ${serial4}` : `既に達成済み：${serial4}`);

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


  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAll(); // ✅ 背景クリックのみ閉じる
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
            // ✅ 何も選ばれてない初期状態：上品なプレースホルダー
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
            // ✅ 1つでも選んだらプレートSVGを表示（途中もOK）
            <div
              style={{ width: "100%", height: "100%" }}
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

            {regionError && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#b45309" }}>{regionError}</div>
            )}
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
            {kanaError && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#b45309" }}>{kanaError}</div>
            )}
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

        {/* 右上クローズ */}
        <button
          onClick={closeAll}
          aria-label="閉じる"
          style={{
            position: "absolute",
            // position:absoluteを使うので親にrelativeが必要 → 下の wrapper を relative にする場合は好み
            // 今回は簡易：buttonを固定にせず、ここはオフにしたいなら消してOK
            display: "none",
          }}
        />
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

function SelectMini({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 74,
        height: 44,
        borderRadius: 12,
        border: "2px solid #e5e7eb",
        padding: "0 10px",
        fontSize: 16,
        outline: "none",
        background: "#fff",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
}
