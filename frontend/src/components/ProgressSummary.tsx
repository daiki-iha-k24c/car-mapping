import type { Region, RegionRecord } from "../lib/region";

export default function ProgressSummary({
  regions,
  recordMap,
}: {
  regions: Region[];
  recordMap: Record<string, RegionRecord>;
}) {
  const total = regions.length;
  const done = Object.values(recordMap).filter((r) => r.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 6 }}>
        <strong>進捗</strong>
        <span className="small">
          {done}/{total}（{pct}%）
        </span>
      </div>
      <div className="small">地域を記録すると地図が塗られます。</div>
    </div>
  );
}
