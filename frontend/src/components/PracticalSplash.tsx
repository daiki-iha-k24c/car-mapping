import "./practicalSplash.css";

export default function PracticalSplash() {
  return (
    <div className="ps-root" aria-label="起動中">
      {/* 画面を塗りつぶす円オーバーレイ */}
      <span className="ps-splash" aria-hidden="true" />
      {/* 円→ヘッダーに“変形”する板 */}
      <span className="ps-morph" aria-hidden="true" />

      {/* “実用性”部分：実際のUIに似た骨組みを出す */}
      <div className="ps-ui" aria-hidden="true">
        <div className="ps-topbar">
          <div className="ps-logoDot" />
          <div className="ps-title">car-mapping</div>
          <div className="ps-pill">同期中</div>
        </div>

        <div className="ps-content">
          <div className="ps-card">
            <div className="ps-row">
              <div className="ps-chip" />
              <div className="ps-chip" />
              <div className="ps-chip" />
            </div>
            <div className="ps-skelLine w80" />
            <div className="ps-skelLine w60" />
            <div className="ps-skelLine w40" />
          </div>

          <div className="ps-card">
            <div className="ps-mapStub">
              <div className="ps-pin" />
              <div className="ps-pin p2" />
              <div className="ps-pin p3" />
            </div>
            <div className="ps-skelLine w70" />
            <div className="ps-skelLine w50" />
          </div>
        </div>
      </div>

      <div className="ps-hint">Loading…</div>
    </div>
  );
}
