interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  /** Big number in the middle. Defaults to the percentage. */
  centerLabel?: string;
  caption?: string;
}

/**
 * Single-value radial progress. One series, so no legend — the caption names it
 * (dataviz: a lone series is identified by its label, not a legend box).
 */
export default function ProgressRing({
  value,
  max,
  size = 116,
  strokeWidth = 9,
  centerLabel,
  caption,
}: ProgressRingProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(pct)}% solved`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(var(--c-raised))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-primary">
            {centerLabel ?? `${Math.round(pct)}%`}
          </span>
          {caption && <span className="text-[10px] uppercase tracking-wide text-muted">{caption}</span>}
        </div>
      </div>
    </div>
  );
}
