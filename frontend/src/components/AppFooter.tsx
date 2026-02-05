import { APP_VERSION } from "../version";

export default function AppFooter() {
  return (
    <footer
      style={{
        padding: "10px 12px",
        fontSize: 12,
        opacity: 0.7,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        marginTop: 16,
      }}
    >
      <span>ナンバープレート</span>
      <span>{APP_VERSION}</span>
    </footer>
  );
}
