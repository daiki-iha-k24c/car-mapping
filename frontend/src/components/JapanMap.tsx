import { useEffect, useRef, useState } from "react";
import type { PrefStatus } from "../lib/region";

const PREF_BY_CODE: Record<string, string> = {
  "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県", "06": "山形県", "07": "福島県",
  "08": "茨城県", "09": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県",
  "15": "新潟県", "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県", "21": "岐阜県",
  "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県",
  "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
  "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県", "41": "佐賀県", "42": "長崎県",
  "43": "熊本県", "44": "大分県", "45": "宮崎県", "46": "鹿児島県",
};

function fillByStatus(status: PrefStatus) {
  if (status === "complete") return "#e2041b";
  if (status === "partial") return "#00b43d";
  return "#ffffff";
}

export default function JapanMap({
  prefStatusMap,
  onPickPrefecture,
}: {
  prefStatusMap: Record<string, { status: PrefStatus; done: number; total: number }>;
  onPickPrefecture: (prefName: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/map-mobile.svg", { cache: "no-cache" });
      const text = await res.text();
      setSvgText(text);
    })();
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const els = root.querySelectorAll<SVGElement>(".prefecture");
    els.forEach((el) => {
      const codeRaw = (el as any).dataset?.code as string | undefined;
      if (!codeRaw) return;

      const code = codeRaw.padStart(2, "0");
      const prefName = PREF_BY_CODE[code];
      if (!prefName) return;

      const prog = prefStatusMap[prefName];
      const status: PrefStatus = prog?.status ?? "none";

      el.style.fill = fillByStatus(status);
      el.style.stroke = "gray";
      el.style.strokeWidth = "1.5";
      el.style.cursor = "pointer";

      el.onclick = () => onPickPrefecture(prefName);
      el.onmouseenter = () => (el.style.opacity = "0.85");
      el.onmouseleave = () => (el.style.opacity = "1");
    });
  }, [prefStatusMap, svgText, onPickPrefecture]);

  return (
    <div className="mapCard glass">
      <div className="card-bg" />
      <div className="card-body">
        {/* タイトル */}
        <div className="card-header">
        </div>

        <div ref={containerRef} style={{ width: "100%" }} dangerouslySetInnerHTML={{ __html: svgText }} />

        {/* 凡例 */}
        <div className="legend">
          {/* 色：未記録 / 一部 / 完全（3段階） */}
        </div>
      </div>
    </div>
  );
}
