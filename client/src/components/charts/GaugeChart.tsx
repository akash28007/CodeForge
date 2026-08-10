interface GaugeChartProps {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  centerValue: string;
  centerLabel: string;
}

/**
 * Semicircular gauge for a single "X of Y" headline. One series, so no legend —
 * the caption underneath names it.
 */
export default function GaugeChart({
  value,
  max,
  size = 190,
  thickness = 16,
  centerValue,
  centerLabel,
}: GaugeChartProps) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Half circle: left edge to right edge, sweeping over the top.
  const arcLength = Math.PI * radius;
  const describeArc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + 8}
        viewBox={`0 0 ${size} ${size / 2 + 8}`}
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        <path d={describeArc} fill="none" stroke="rgb(var(--c-raised))" strokeWidth={thickness} strokeLinecap="round" />
        <path
          d={describeArc}
          fill="none"
          stroke="rgb(var(--c-accent))"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${arcLength * pct} ${arcLength}`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="fill-[rgb(var(--c-primary))] text-2xl font-bold"
          style={{ fontSize: 24, fontWeight: 700 }}
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          className="fill-[rgb(var(--c-muted))]"
          style={{ fontSize: 11 }}
        >
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}
