import { useMemo, useState } from 'react';

export interface LinePoint {
  date: string;
  value: number;
}

/**
 * Cumulative area+line for a single series, with a crosshair on hover.
 * One series, so no legend — the surrounding heading names it.
 */
export default function LineChart({ points, height = 160 }: { points: LinePoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const padding = { top: 12, right: 12, bottom: 22, left: 34 };

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const maxValue = Math.max(...points.map((p) => p.value), 1);
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const xFor = (i: number) => padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yFor = (v: number) => padding.top + innerH - (v / maxValue) * innerH;

    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), ...p }));
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${padding.top + innerH} L ${coords[0].x.toFixed(
      1,
    )} ${padding.top + innerH} Z`;

    const ticks = [0, Math.round(maxValue / 2), maxValue];
    return { coords, line, area, maxValue, ticks, innerH };
  }, [points, height]);

  if (!geometry) {
    return <p className="py-8 text-center text-sm text-muted">No solved problems in this range yet.</p>;
  }

  const active = hover !== null ? geometry.coords[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Problems solved over time"
        onMouseLeave={() => setHover(null)}
      >
        {geometry.ticks.map((t) => {
          const y = padding.top + geometry.innerH - (t / geometry.maxValue) * geometry.innerH;
          return (
            <g key={t}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgb(var(--c-subtle))" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" style={{ fontSize: 9 }} fill="rgb(var(--c-muted))">
                {t}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="cf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity={0} />
          </linearGradient>
        </defs>

        <path d={geometry.area} fill="url(#cf-area)" />
        <path d={geometry.line} fill="none" stroke="rgb(var(--c-accent))" strokeWidth={2} strokeLinejoin="round" />

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={padding.top}
              y2={padding.top + geometry.innerH}
              stroke="rgb(var(--c-accent))"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={active.x} cy={active.y} r={4} fill="rgb(var(--c-accent))" stroke="rgb(var(--c-surface))" strokeWidth={2} />
          </>
        )}

        {/* Invisible wide hit areas — easier to hit than the 2px line itself. */}
        {geometry.coords.map((c, i) => (
          <rect
            key={c.date}
            x={c.x - width / (geometry.coords.length * 2)}
            y={padding.top}
            width={width / geometry.coords.length}
            height={geometry.innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {active && (
        <div className="pointer-events-none absolute -top-1 left-0 rounded-md border border-subtle bg-surface px-2 py-1 text-xs shadow-panel">
          <span className="font-semibold text-primary">{active.value} solved</span>
          <span className="ml-2 text-muted">{active.date}</span>
        </div>
      )}
    </div>
  );
}
