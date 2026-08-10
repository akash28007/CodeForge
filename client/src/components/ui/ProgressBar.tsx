interface ProgressBarProps {
  value: number;
  max?: number;
  /** Tailwind bg-* class for the fill. Defaults to the brand accent. */
  color?: string;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'bg-accent',
  size = 'sm',
  label,
  className = '',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`overflow-hidden rounded-full bg-raised ${size === 'sm' ? 'h-1.5' : 'h-2.5'} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
