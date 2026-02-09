export default function WaveBackground() {
  return (
    <div className="wave-bg" aria-hidden="true">
      <svg
        className="waves"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
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
          <use xlinkHref="#gentle-wave" x="48" y="0" fill="var(--wave-1)" />
          <use xlinkHref="#gentle-wave" x="48" y="3" fill="var(--wave-2)" />
          <use xlinkHref="#gentle-wave" x="48" y="5" fill="var(--wave-3)" />
          <use xlinkHref="#gentle-wave" x="48" y="7" fill="var(--wave-4)" />
        </g>
      </svg>
    </div>
  );
}
