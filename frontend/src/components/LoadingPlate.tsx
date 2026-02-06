export default function LoadingPlate({ label = "" }: { label?: string }) {
  return (
    <div style={wrap}>
      <div style={plate} aria-label={label}>
        <div style={topRow}>
          <div style={miniBadge} />
        </div>

        <div style={midRow}>
          <div style={classNo}>Loading...</div>
        </div>

        <div style={serialRow}>
          <span style={{ ...digit, animationDelay: "0ms" }}>🚗</span>
          <span style={{ ...digit, animationDelay: "60ms" }}>☁️</span>
          <span style={{ ...digit, animationDelay: "120ms" }}>☁️</span>
          <span style={{ ...digit, animationDelay: "180ms" }}>☁️</span>
        </div>

        <div style={bar} />
      </div>

      <div style={caption}>{label}</div>

      {/* keyframes をこのコンポーネント内で完結させる */}
      <style>{css}</style>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "60vh",
  display: "grid",
  placeItems: "center",
  gap: 14,
  padding: 24,
};

const plate: React.CSSProperties = {
  width: 260,
  height: 150,
  borderRadius: 18,
  background: "#fff",
  border: "2px solid rgba(0,0,0,0.12)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
  position: "relative",
  padding: 14,
  overflow: "hidden",
  animation: "plateFloat 1200ms ease-in-out infinite",
};

const bar: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.06) 35%, rgba(0,0,0,0.02) 50%, transparent 70%)",
  transform: "translateX(-120%)",
  animation: "shimmer 1000ms ease-in-out infinite",
};

const topRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 16,
  opacity: 0.85,
};

const miniBadge: React.CSSProperties = {
  width: 22,
  height: 14,
  borderRadius: 4,
  background: "rgba(0,0,0,0.10)",
};

const region: React.CSSProperties = { fontWeight: 700, letterSpacing: 1 };

const midRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  gap: 10,
};

const classNo: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  opacity: 0.9,
};

const kana: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  opacity: 0.9,
};

const serialRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "center",
  //gap: 10,
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: 2,
};

const digit: React.CSSProperties = {
  display: "inline-block",
  animation: "digitBounce 600ms ease-in-out infinite",
};

const caption: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.7,
};

const css = `
@keyframes plateFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes shimmer {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
@keyframes digitBounce {
  0%, 100% { transform: translateY(0px); opacity: 0.9; }
  50% { transform: translateY(-6px); opacity: 1; }
}
`;
