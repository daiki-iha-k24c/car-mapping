import type { PlateColor } from "../storage/plates";

const bg: Record<PlateColor, string> = {
  white: "#ffffff",
  yellow: "#ffd400",
  green: "#0b8f3a",
  pink: "#ff66b2",
};

const fg: Record<PlateColor, string> = {
  white: "#111111",
  yellow: "#111111",
  green: "#ffffff",
  pink: "#ffffff",
};

export function renderPlateSvg(params: {
  regionName: string;
  classNumber: string;
  kana: string;
  serial: string; // "12-34"
  color: PlateColor;
}) {
  const width = 320;
  const height = 180;
  const background = bg[params.color];
  const textColor = fg[params.color];

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}"
     preserveAspectRatio="xMidYMid meet">
  <rect x="6" y="6" width="${width - 12}" height="${height - 12}"
        rx="18" fill="${background}" stroke="#222" stroke-width="4"/>
  <text x="28" y="52" font-size="34" font-family="sans-serif" fill="${textColor}">${esc(params.regionName)}</text>
  <text x="${width - 28}" y="52" text-anchor="end" font-size="34" font-family="sans-serif" fill="${textColor}">${esc(params.classNumber)}</text>
  <text x="28" y="106" font-size="44" font-family="sans-serif" fill="${textColor}">${esc(params.kana)}</text>
  <text x="${width - 28}" y="140" text-anchor="end" font-size="64" font-family="sans-serif" fill="${textColor}" letter-spacing="2">${esc(params.serial)}</text>
</svg>
`.trim();
}

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
