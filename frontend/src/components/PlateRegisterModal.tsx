import { useMemo, useState } from "react";
import type { Region } from "../lib/region";
import type { Plate, PlateColor } from "../storage/plates";
import { addPlate, listPlatesByRegionId } from "../storage/plates";
import { renderPlateSvg } from "../svg/renderPlateSvg";

export type PlateRegisterModalProps = {
  open: boolean;
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

  d1: string; // 0-9 or ・
  d2: string; // 0-9 or ・
  d3: string; // 0-9 or ・
  d4: string; // 0-9
};

function fixSvgViewBox(svg: string) {
  // 既存 HomePage と同じ補正
  return svg.replace(/viewBox="0 0"/g, 'viewBox="0 0 320 180"');
}

function isDuplicate(regionId: string, classNumber: string, kana: string, serial: string) {
  const list = listPlatesByRegionId(regionId);
  return list.some((p) => p.classNumber === classNumber && p.kana === kana && p.serial === serial);
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const DIGITS_WITH_DOT = ["・", ...DIGITS];

// 分類番号（最低限：現実に多いもの + 汎用）
// ※もっと厳密にしたければ後で地域/種別に合わせて絞れる
const CLASS_NUMBERS = [
  "100", "110", "200", "300", "330", "400", "500", "530", "580", "600", "800",
];

// ひらがな（ナンバーで使われやすい範囲の例。必要なら増やす）
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

function buildSerial(d1: string, d2: string, d3: string, d4: string) {
  const hasDot = [d1, d2, d3].some((x) => x === "・");
  if (hasDot) {
    // ・・・x / ・・xx / ・xxx
    return `${d1}${d2}${d3}${d4}`;
  }
  // xx-xx
  return `${d1}${d2}-${d3}${d4}`;
}

function serialPreview(d1: string, d2: string, d3: string, d4: string) {
  if (!d1 || !d2 || !d3 || !d4) return "—";
  return buildSerial(d1, d2, d3, d4);
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

    d1: "",
    d2: "",
    d3: "",
    d4: "",
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



export default function PlateRegisterModal({
  open,
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

  const serial = useMemo(() => serialPreview(v.d1, v.d2, v.d3, v.d4), [v.d1, v.d2, v.d3, v.d4]);

  const canSubmit =
    !!v.regionId &&
    !!v.regionName &&
    !!v.classNumber &&
    !!v.kana &&
    !!v.color &&
    !!v.d1 &&
    !!v.d2 &&
    !!v.d3 &&
    !!v.d4;

  const isPristine =
    !v.regionId &&
    !v.classNumber &&
    !v.kana &&
    !v.color &&
    !v.d1 &&
    !v.d2 &&
    !v.d3 &&
    !v.d4;

  const isDirty = !isPristine;


  const previewSvg = useMemo(() => {
    const regionName = v.regionName || "";
    const classNumber = v.classNumber || "";
    const kana = v.kana || "";

    // serial は途中なら "・・—" みたいにしないで "—" にする
    const serialForSvg = serial === "—" ? "—" : serial;

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

  const handlePickRegion = (regionId: string) => {
    const r = regions.find((x) => x.id === regionId);
    setV((p) => ({
      ...p,
      regionId,
      regionName: r?.name ?? "",
    }));
    setDupMsg("");
  };

  const submit = () => {
    if (!canSubmit || done) return;

    const serialValue = buildSerial(v.d1, v.d2, v.d3, v.d4);

    if (isDuplicate(v.regionId, v.classNumber, v.kana, serialValue)) {
      setDupMsg(`すでに登録済み：${v.regionName} ${v.classNumber} ${v.kana} ${serialValue}`);
      return;
    }

    const color = v.color as PlateColor;

    const svg = fixSvgViewBox(
      renderPlateSvg({
        regionName: v.regionName,
        classNumber: v.classNumber,
        kana: v.kana,
        serial: serialValue,
        color,
      })
    );

    const plate: Plate = {
      id: crypto.randomUUID(),
      regionId: v.regionId,
      classNumber: v.classNumber,
      kana: v.kana,
      serial: serialValue,
      color,
      renderSvg: svg,
      createdAt: new Date().toISOString(),
    };

    addPlate(plate);
    onRegistered(v.regionName);
    setDone(true);
    setDupMsg("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeAll}
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
            <Select
              value={v.regionId}
              onChange={(x) => handlePickRegion(x)}
              placeholder="選択"
              options={regionOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Field>

          <Field label="分類番号">
            <Select
              value={v.classNumber}
              onChange={(x) => setV((p) => ({ ...p, classNumber: x }))}
              placeholder="選択"
              options={CLASS_NUMBERS.map((x) => ({ value: x, label: x }))}
            />
          </Field>

          <Field label="ひらがな">
            <Select
              value={v.kana}
              onChange={(x) => setV((p) => ({ ...p, kana: x }))}
              placeholder="選択"
              options={KANAS.map((x) => ({ value: x, label: x }))}
            />
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

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SelectMini
              value={v.d1}
              onChange={(x) => setV((p) => ({ ...p, d1: x }))}
              options={DIGITS_WITH_DOT}
              placeholder="—"
            />
            <SelectMini
              value={v.d2}
              onChange={(x) => setV((p) => ({ ...p, d2: x }))}
              options={DIGITS_WITH_DOT}
              placeholder="—"
            />
            <div style={{ fontWeight: 900, opacity: 0.55 }}>—</div>
            <SelectMini
              value={v.d3}
              onChange={(x) => setV((p) => ({ ...p, d3: x }))}
              options={DIGITS_WITH_DOT}
              placeholder="—"
            />
            <SelectMini
              value={v.d4}
              onChange={(x) => setV((p) => ({ ...p, d4: x }))}
              options={DIGITS}
              placeholder="—"
            />
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            表示: <b>{serial}</b>（左1〜3桁は「・」を選べます）
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
