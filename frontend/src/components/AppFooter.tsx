import { APP_VERSION } from "../version";
import { __doUpdate, __needRefresh } from "../main"; // main.tsxから参照

export default function AppFooter() {
  return (
    <footer
      style={{
        padding: "10px 12px",
        fontSize: 12,
        opacity: 0.8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        marginTop: 16,
      }}
    >
      <span>ナンバープレート</span>

      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span>{APP_VERSION}</span>

        {__needRefresh && __doUpdate && (
          <button
            onClick={() => __doUpdate?.()}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "6px 10px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            更新
          </button>
        )}
      </span>
    </footer>
  );
}
