import { useId, useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  /** CSS colour, e.g. `rgb(var(--c-easy))`. */
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue: string;
  centerLabel: string;
}

/**
 * Categorical donut. A 2px surface-coloured gap separates adjacent segments so they
 * never bleed into one another, and every slice is direct-labelled in the legend —
 * identity is never carried by colour alone.
 */
export default function DonutChart({
  slices,
  size = 150,
  thickness = 18,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const GAP = total > 0 ? 2 : 0;

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(var(--c-raised))"
            strokeWidth={thickness}
          />
          {total > 0 &&
            slices.map((slice) => {
              if (slice.value === 0) return null;
              const length = (slice.value / total) * circumference;
              const dash = Math.max(0, length - GAP);
              const element = (
                <circle
                  key={`${id}-${slice.label}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={hovered === slice.label ? thickness + 3 : thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHovered(slice.label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${slice.label}: ${slice.value} (${Math.round((slice.value / total) * 100)}%)`}</title>
                </circle>
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-primary">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex min-w-[9rem] flex-col gap-1.5 text-sm">
        {slices.map((slice) => (
          <li
            key={slice.label}
            className="flex items-center gap-2"
            onMouseEnter={() => setHovered(slice.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="text-secondary">{slice.label}</span>
            <span className="ml-auto tabular-nums text-primary">{slice.value}</span>
            <span className="w-11 text-right text-xs tabular-nums text-muted">
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
