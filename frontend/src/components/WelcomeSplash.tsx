import { useEffect, useState } from "react";
import "./welcomeSplash.css";

export default function WelcomeSplash({ done }: { done: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setVisible(false), 3200); // アニメ完走後
    return () => clearTimeout(t);
  }, [done]);

  if (!visible) return null;

  return (
    <div className="welcome-root">
      <span className="splash" />
      <span className="welcome-logo" />
    </div>
  );
}
