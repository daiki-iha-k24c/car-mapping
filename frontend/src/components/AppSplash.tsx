import { useEffect, useState } from "react";

export default function AppSplash({ done }: { done: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setShow(false), 350); // ふわっと消す
    return () => clearTimeout(t);
  }, [done]);

  if (!show) return null;

  return (
    <div style={overlay}>
      <div style={logoWrap}>
        <div style={mark} />
        <div style={title}>ナンバープレート</div>
        <div style={sub}>地図を埋めよう</div>
      </div>
      <style>{css}</style>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#0b1220",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
  animation: "fadeIn 220ms ease-out",
};

const logoWrap: React.CSSProperties = {
  textAlign: "center",
  color: "white",
  padding: 24,
};

const mark: React.CSSProperties = {
  width: 84,
  height: 84,
  borderRadius: 22,
  background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.35))",
  margin: "0 auto 14px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  animation: "pop 900ms ease-in-out infinite",
};

const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, letterSpacing: 1 };
const sub: React.CSSProperties = { fontSize: 13, opacity: 0.75, marginTop: 6 };

const css = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes pop {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.04); }
}
`;
