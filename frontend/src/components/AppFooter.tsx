import { APP_VERSION } from "../version";

export default function AppFooter() {
  return (
    <footer
      style={{
        textAlign: "center",
        fontSize: 12,
        opacity: 0.6,
        padding: "16px 0 24px",
      }}
    >
      v{APP_VERSION}
    </footer>
  );
}