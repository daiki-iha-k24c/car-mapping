import { useEffect, useState } from "react";
import WelcomeSplash from "./WelcomeSplash";

export default function BootGate({
  minimumMs = 4200,
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

  if (!(minDone && ready)) return <WelcomeSplash totalMs={minimumMs} />;
  return <>{children}</>;
}
