export default function SceneBackground() {
  return (
    <div className="scene-bg" aria-hidden="true">
      {/* 空のグラデ（時間帯はCSS変数で切替） */}
      <div className="scene-sky" />

      {/* 雲（ゆっくり） */}
      <div className="scene-layer scene-clouds">
        <div className="scene-track">
          <CloudStrip />
          <CloudStrip />
        </div>
      </div>

      {/* 街並み（中速） */}
      <div className="scene-layer scene-city">
        <div className="scene-track">
          <CityStrip />
          <CityStrip />
        </div>
      </div>

      {/* 車（速め） */}
      <div className="scene-layer scene-cars">
        <div className="scene-track">
          <CarStrip />
          <CarStrip />
        </div>
      </div>
    </div>
  );
}

/** ここは仮のシンプルSVG。後で好きなイラストに差し替えOK */
function CloudStrip() {
  return (
    <svg className="strip" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <g fill="var(--cloud-color)">
        <path d="M90 70c0-18 14-32 32-32 10 0 19 4 25 11 3-1 6-2 10-2 18 0 32 14 32 32H90z" opacity=".6"/>
        <path d="M360 78c0-16 13-29 29-29 9 0 17 4 22 10 3-1 6-2 9-2 16 0 29 13 29 29H360z" opacity=".5"/>
        <path d="M740 72c0-19 15-34 34-34 10 0 20 5 26 12 3-1 7-2 10-2 19 0 34 15 34 34H740z" opacity=".55"/>
      </g>
    </svg>
  );
}

function CityStrip() {
  return (
    <svg className="strip" viewBox="0 0 1200 180" preserveAspectRatio="none">
      <g fill="var(--city-color)">
        <rect x="0" y="70" width="70" height="110" rx="6" />
        <rect x="90" y="40" width="110" height="140" rx="8" />
        <rect x="220" y="85" width="80" height="95" rx="6" />
        <rect x="320" y="30" width="150" height="150" rx="10" />
        <rect x="490" y="65" width="90" height="115" rx="6" />
        <rect x="600" y="50" width="130" height="130" rx="9" />
        <rect x="750" y="80" width="95" height="100" rx="7" />
        <rect x="865" y="35" width="170" height="145" rx="10" />
        <rect x="1050" y="75" width="120" height="105" rx="8" />
      </g>

      {/* 窓（うっすら） */}
      <g fill="var(--window-color)" opacity=".35">
        {Array.from({ length: 70 }).map((_, i) => {
          const x = (i * 17) % 1180;
          const y = 50 + ((i * 11) % 110);
          return <rect key={i} x={x} y={y} width="8" height="10" rx="2" />;
        })}
      </g>
    </svg>
  );
}

function CarStrip() {
  return (
    <svg className="strip" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <g fill="var(--car-color)">
        {/* 何台か並べる */}
        <Car x={80} />
        <Car x={420} />
        <Car x={760} />
        <Car x={1030} />
      </g>
    </svg>
  );
}

function Car({ x }: { x: number }) {
  return (
    <g transform={`translate(${x},48)`}>
      <rect x="0" y="18" width="120" height="30" rx="10" />
      <path d="M20 18c8-16 20-24 40-24h20c18 0 28 10 38 24H20z" />
      <g fill="var(--tire-color)">
        <circle cx="30" cy="52" r="10" />
        <circle cx="90" cy="52" r="10" />
      </g>
      <g fill="var(--glass-color)" opacity=".55">
        <rect x="42" y="2" width="18" height="14" rx="3" />
        <rect x="64" y="2" width="22" height="14" rx="3" />
      </g>
    </g>
  );
}
