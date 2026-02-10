import { useEffect, useState } from "react";

type Theme = "morning" | "day" | "evening" | "night";

export default function WaveBackground() {
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    const update = () => {
      const t = document.body.dataset.theme as Theme | undefined;
      if (t) setTheme(t);
    };

    update();

    const obs = new MutationObserver(update);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => obs.disconnect();
  }, []);

  return (
    <div className={`wave-bg theme-${theme}`} aria-hidden="true">
      {/* 🌅 朝：朝日（波線の近く） */}
      <div className="bg-sun-layer">
      {theme === "morning" && <div className="bg-sunrise" />}
      </div>
      {/* ☀️ 昼：太陽 */}
      {theme === "day" && <div className="bg-sun" />}

      {/* 🌇 夕方：夕日 */}
      <div className="bg-sun-layer">
        {theme === "evening" && <div className="bg-evening-sun" />}
      </div>
      {/* 🌙 夜：月 + 流れ星 */}
      {theme === "night" && (
        <>
          <div className="bg-moon" />
          <div className="shooting-star s1" />
          <div className="shooting-star s2" />
          <div className="shooting-star s3" />
        </>
      )}

      {/* 🌊 波線（既存） */}
      <svg
        className="waves"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        shapeRendering="auto"
      >
        <defs>
          <path
            id="gentle-wave"
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
          />
        </defs>
        <g className="parallax">
          <use href="#gentle-wave" x="48" y="0" fill="var(--wave-1)" />
          <use href="#gentle-wave" x="48" y="3" fill="var(--wave-2)" />
          <use href="#gentle-wave" x="48" y="5" fill="var(--wave-3)" />
          <use href="#gentle-wave" x="48" y="7" fill="var(--wave-4)" />
        </g>
      </svg>

    </div>
  );
}
