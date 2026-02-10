import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import WelcomeSplash from "./WelcomeSplash";

export default function BootGate({
  minimumMs = 5000,
  ready,
  children,
}: {
  minimumMs?: number;
  ready: boolean;
  children: React.ReactNode;
}) {
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinDone(true), minimumMs);
    return () => window.clearTimeout(t);
  }, [minimumMs]);

  const show = !(minDone && ready);

  return (
    <>
      {children}

      {show &&
        createPortal(
          <div className="splash-root">
            <WelcomeSplash />
          </div>,
          document.body
        )}
    </>
  );
}
