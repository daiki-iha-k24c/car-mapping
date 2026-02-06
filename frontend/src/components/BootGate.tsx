import { useEffect, useState } from "react";
import WelcomeSplash from "./WelcomeSplash";


/**
 * minimumMs: 最低でもこの時間はスプラッシュを表示する
 * ready: アプリ側の準備完了フラグ（例: authCheckingが終わった等）
 */
export default function BootGate({
  minimumMs = 5200,
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

  const showSplash = !(minDone && ready);

if (!(minDone && ready)) return <WelcomeSplash totalMs={minimumMs} />;
return <>{children}</>;

}
