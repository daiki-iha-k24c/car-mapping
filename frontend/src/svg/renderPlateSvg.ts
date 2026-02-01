import type { PlateColor } from "../storage/plates";

type Args = {
  regionName: string;
  classNumber: string;
  kana: string;
  serial: string; // "12-34" or "・・・0" / "・・12" / "・123"
  color: PlateColor;
};

const W = 320;
const H = 180;


function esc(s: string) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function palette(color: PlateColor) {
  // 画像の黄色：濃い黄 + 黒文字
  if (color === "yellow") return { bg: "#FFD400", ink: "#000000" };
  if (color === "green") return { bg: "#15803D", ink: "#FFFFFF" };
  if (color === "pink") return { bg: "#FF4FA3", ink: "#FFFFFF" };
  return { bg: "#FFFFFF", ink: "#0B4F2A" };
}

function normalizeSerial(serial: string) {
  const s = (serial ?? "").trim();

  const m = s.match(/^(\d)(\d)\-(\d)(\d)$/);
  if (m) return { mode: "hyphen" as const, digits: [m[1], m[2], m[3], m[4]] };

  const chars = [...s];
  if (chars.length === 4 && /^\d$/.test(chars[3])) {
    const d1 = chars[0] === "・" ? "・" : chars[0];
    const d2 = chars[1] === "・" ? "・" : chars[1];
    const d3 = chars[2] === "・" ? "・" : chars[2];
    const d4 = chars[3];
    return { mode: "dot" as const, digits: [d1, d2, d3, d4] };
  }

  return { mode: "raw" as const, raw: s };
}

/**
 * 理想画像寄せの数字配置
 * - 左にかながいる想定で、数字は右側に寄せる
 * - ハイフンは rect（画像みたいに“角丸の短い棒”）
 * - ・は circle
 */
// function renderSerial(ink: string, serial: string) {
//   const ns = normalizeSerial(serial);

//   // ====== ここが“見た目”を決める定数（画像に合わせた初期値） ======
//   const baseY = 150;      // 数字baseline（画像はかなり下寄りでデカい）
//   const fontSize = 100;   // 数字サイズ（大胆に大きく）
//   const dotY = 125;       // ・の高さ（数字の中段）
//   const dotR = 7.2;

//   // 数字の中心X（右側に寄せる：1,2 と 3,4 の塊）
//   const x1 = 90;
//   const x2 = 140;
//   const x3 = 220;
//   const x4 = 270;

//   // ハイフン（2と3の間：小さめ太め）
//   const hyphenX = (x2 + x3) / 2;
//   const hyphenY = 119;
//   const hyphenW = 24;
//   const hyphenH = 10;
//   const hyphenRx = 3;
//   // ===============================================================

//   if (ns.mode === "raw") {
//     return `
//       <text x="${x4}" y="${baseY}" fill="${ink}"
//         font-size="${fontSize}" font-weight="950"
//         font-family="system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
//         text-anchor="end" dominant-baseline="alphabetic">${esc(ns.raw)}</text>
//     `.trim();
//   }

//   const d = ns.digits;
//   const xs = [x1, x2, x3, x4];

//   const parts: string[] = [];

//   for (let i = 0; i < 4; i++) {
//     const ch = d[i];
//     const x = xs[i];
//     if (ch === "・") {
//       parts.push(`<circle cx="${x}" cy="${dotY}" r="${dotR}" fill="${ink}" />`);
//     } else {
//       parts.push(`
//         <text x="${x}" y="${baseY}" fill="${ink}"
//           font-size="${fontSize}" font-weight="950"
//           font-family="system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
//           text-anchor="middle" dominant-baseline="alphabetic">${esc(ch)}</text>
//       `.trim());
//     }
//   }

//   if (ns.mode === "hyphen") {
//     parts.push(
//       `<rect x="${hyphenX - hyphenW / 2}" y="${hyphenY - hyphenH / 2}" width="${hyphenW}" height="${hyphenH}" rx="${hyphenRx}" fill="${ink}" />`
//     );
//   }

//   return parts.join("\n");
// }

function renderSerial(
  ink: string,
  serial: string,
  fontFamily: string,
  fontWeight: number
) {
  const ns = normalizeSerial(serial);

  // ====== ここが“見た目”を決める定数（画像に合わせた初期値） ======
  const baseY = 150;      // 数字baseline
  const fontSize = 100;   // 数字サイズ
  const dotY = 125;       // ・の高さ
  const dotR = 7.2;

  // 数字の中心X
  const x1 = 90;
  const x2 = 140;
  const x3 = 220;
  const x4 = 270;

  // ハイフン
  const hyphenX = (x2 + x3) / 2;
  const hyphenY = 119;
  const hyphenW = 24;
  const hyphenH = 10;
  const hyphenRx = 3;
  // ===============================================================

  // 共通の text 属性（ズレ防止）
  const commonTextAttr = `
    fill="${ink}"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    font-family='${fontFamily}'
    dominant-baseline="alphabetic"
  `.trim();

  if (ns.mode === "raw") {
    return `
      <text x="${x4}" y="${baseY}" ${commonTextAttr}
        text-anchor="end">${esc(ns.raw)}</text>
    `.trim();
  }

  const d = ns.digits;
  const xs = [x1, x2, x3, x4];
  const parts: string[] = [];

  for (let i = 0; i < 4; i++) {
    const ch = d[i];
    const x = xs[i];

    if (ch === "・") {
      parts.push(`<circle cx="${x}" cy="${dotY}" r="${dotR}" fill="${ink}" />`);
    } else {
      parts.push(`
        <text x="${x}" y="${baseY}" ${commonTextAttr}
          text-anchor="middle">${esc(ch)}</text>
      `.trim());
    }
  }

  if (ns.mode === "hyphen") {
    parts.push(
      `<rect x="${hyphenX - hyphenW / 2}" y="${hyphenY - hyphenH / 2}" width="${hyphenW}" height="${hyphenH}" rx="${hyphenRx}" fill="${ink}" />`
    );
  }

  return parts.join("\n");
}


function renderEmptyPreview() {
  // 未入力用：常に白背景＋枠
  const stroke = "#0f172a";
  const faint = "#cbd5e1";
  const green = "#0B4F2A";
  const border = "#111827";

  return `
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- 外側プレート枠（二重） -->
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="18"
        fill="#ffffff" stroke="${border}" stroke-width="6"/>
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="14"
        fill="none" stroke="${border}" stroke-width="3" opacity="0.9"/>

  <!-- 内側ダミープレート -->
  <rect x="46" y="38" width="228" height="112" rx="16"
        fill="#ffffff" stroke="${stroke}" stroke-width="4"/>
  <rect x="54" y="46" width="212" height="96" rx="12"
        fill="none" stroke="${stroke}" stroke-width="2"/>

  <circle cx="74" cy="62" r="10" fill="#fff" stroke="${faint}" stroke-width="3"/>
  <circle cx="246" cy="62" r="10" fill="#fff" stroke="${faint}" stroke-width="3"/>

  <rect x="94" y="60" width="30" height="4" fill="${green}"/>
  <rect x="94" y="96" width="22" height="4" fill="${green}"/>
  <rect x="182" y="96" width="66" height="6" fill="${green}"/>
</svg>
`.trim();
}

// export function renderPlateSvg({ regionName, classNumber, kana, serial, color }: Args) {
//   const isEmpty = !regionName && !classNumber && !kana && !serial;
//   if (isEmpty) return renderEmptyPreview();

//   const { bg, ink } = palette(color);
//   const border = "#111827";
//   const screw = "#9CA3AF";

//   // ====== 上段配置（理想画像に寄せた値） ======
//   const topY = 50;      // 上段baseline
//   const midX = 180;     // 「地域+分類番号」塊の中心
//   const gap = 5;        // 地域と分類番号の間隔
//   const topFont = 40;   // 上段フォント
//   // ============================================

//   // ====== かな配置 ======
//   const kanaX = 14;
//   const kanaY = 135;
//   const kanaFont = 50;
//   // =====================
  
//   // テキストの太さを明示（スマホで太く見える差の吸収に効く）
//   const weightNormal = 600; // 地域・分類・かな
//   const weightSerial = 700; // 番号は少し強め

//   return `
// <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
//   <!-- ✅ 背景＋枠（二重） ※これが「枠線」 -->
//   <rect x="3" y="6" width="${W - 9}" height="${H - 9}" rx="10"
//         fill="${bg}" stroke="${border}" stroke-width="4"/>

//   <!-- ねじ穴 -->
//   <circle cx="34" cy="30" r="8" fill="${screw}"/>
//   <circle cx="${W - 34}" cy="30" r="8" fill="${screw}"/>

//   <!-- 上段：地域（右寄せ） -->
//   <text x="${midX - gap}" y="${topY}" fill="${ink}"
//     font-size="${topFont}" 
//     font-weight="900"
//     font-family="system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
//     text-anchor="end" dominant-baseline="alphabetic">${esc(regionName)}</text>

//   <!-- 上段：分類番号（左寄せ） -->
//   <text x="${midX + gap}" y="${topY}" fill="${ink}"
//     font-size="${topFont}" font-weight="900"
//     font-family="system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
//     text-anchor="start" dominant-baseline="alphabetic">${esc(classNumber)}</text>

//   <!-- かな -->
//   <text x="${kanaX}" y="${kanaY}" fill="${ink}"
//     font-size="${kanaFont}" font-weight="900"
//     font-family="system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
//     text-anchor="start" dominant-baseline="alphabetic">${esc(kana)}</text>

//   <!-- ナンバー -->
//   ${renderSerial(ink, serial)}
// </svg>
// `.trim();
// }

export function renderPlateSvg({ regionName, classNumber, kana, serial, color }: Args) {
  const isEmpty = !regionName && !classNumber && !kana && !serial;
  if (isEmpty) return renderEmptyPreview();

  const { bg, ink } = palette(color);
  const border = "#111827";
  const screw = "#9CA3AF";

  // ✅ 端末差を減らすため、Webフォント優先（Noto Sans JP を先頭）
  // ※ index.html で Noto Sans JP を読み込んでいる前提
  const FONT =
    `"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",system-ui,-apple-system,"Segoe UI",sans-serif`;

  // ====== 上段配置（理想画像に寄せた値） ======
  const topY = 50;      // 上段baseline
  const midX = 180;     // 「地域+分類番号」塊の中心
  const gap = 5;        // 地域と分類番号の間隔
  const topFont = 40;   // 上段フォント
  // ============================================

  // ====== かな配置 ======
  const kanaX = 14;
  const kanaY = 135;
  const kanaFont = 50;
  // =====================

  // ✅ 太さ：スマホで太く見える差の吸収（900→600/700へ）
  const weightNormal = 600; // 地域・分類・かな
  const weightSerial = 600; // 番号は少し強め

  return `
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- ✅ 背景＋枠（二重） ※これが「枠線」 -->
  <rect x="3" y="6" width="${W - 9}" height="${H - 9}" rx="10"
        fill="${bg}" stroke="${border}" stroke-width="4"/>

  <!-- ねじ穴 -->
  <circle cx="34" cy="30" r="8" fill="${screw}"/>
  <circle cx="${W - 34}" cy="30" r="8" fill="${screw}"/>

  <!-- 上段：地域（右寄せ） -->
  <text x="${midX - gap}" y="${topY}" fill="${ink}"
    font-size="${topFont}"
    font-weight="${weightNormal}"
    font-family='${FONT}'
    text-anchor="end" dominant-baseline="alphabetic">${esc(regionName)}</text>

  <!-- 上段：分類番号（左寄せ） -->
  <text x="${midX + gap}" y="${topY}" fill="${ink}"
    font-size="${topFont}"
    font-weight="${weightNormal}"
    font-family='${FONT}'
    text-anchor="start" dominant-baseline="alphabetic">${esc(classNumber)}</text>

  <!-- かな -->
  <text x="${kanaX}" y="${kanaY}" fill="${ink}"
    font-size="${kanaFont}"
    font-weight="${weightNormal}"
    font-family='${FONT}'
    text-anchor="start" dominant-baseline="alphabetic">${esc(kana)}</text>

  <!-- ナンバー -->
  ${renderSerial(ink, serial, FONT, weightSerial)}
</svg>
`.trim();
}
