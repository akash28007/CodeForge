import { useId } from 'react';
import { LEVELS, levelForXp, type LevelDef, type LevelShape } from '../utils/levels';

/** Badge silhouettes for the 10 levels (guide 6.4), drawn in a 24×24 box. */
const SHAPES: Record<LevelShape, string> = {
  circle: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z',
  hexagon: 'M12 2.2l8.2 4.7v9.4L12 21l-8.2-4.7V6.9z',
  badge: 'M12 2.2l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.2L12 21.8l-2.6-1.9-3.2.2-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.2z',
  shield: 'M12 2.3l7.6 2.8v6.1c0 4.3-3 8.2-7.6 10.5-4.6-2.3-7.6-6.2-7.6-10.5V5.1z',
  star: 'M12 2.4l3 6.1 6.7.9-4.9 4.7 1.2 6.7L12 17.6l-6 3.2 1.2-6.7-4.9-4.7 6.7-.9z',
  crown: 'M3.2 8.1l4 3.3L12 4.2l4.8 7.2 4-3.3-1.7 10.4H4.9zM4.4 20.2h15.2v2.1H4.4z',
  diamond: 'M7.6 2.8h8.8l4.4 5.6L12 21.6 3.2 8.4z',
  'shield-gem': 'M12 2.3l7.6 2.8v6.1c0 4.3-3 8.2-7.6 10.5-4.6-2.3-7.6-6.2-7.6-10.5V5.1zM12 7.4l-3 3 3 3 3-3z',
  'crown-gem': 'M3.2 8.1l4 3.3L12 4.2l4.8 7.2 4-3.3-1.7 10.4H4.9zM4.4 20.2h15.2v2.1H4.4zM12 12.4l2 2-2 2-2-2z',
  crystal:
    'M12 1.8l5.6 4.3 2.1 6.8L12 22.2 4.3 12.9l2.1-6.8zM12 6.2L8.6 12l3.4 5.8L15.4 12z',
};

interface LevelBadgeIconProps {
  level: LevelDef;
  className?: string;
  /** Renders greyed out with a lock overlay (guide 6.4: unearned badges). */
  locked?: boolean;
}

export function LevelBadgeIcon({ level, className = 'w-6 h-6', locked = false }: LevelBadgeIconProps) {
  const gradientId = useId();

  if (locked) {
    return (
      <svg viewBox="0 0 24 24" className={className} role="img" aria-label={`${level.name} (locked)`}>
        <path d={SHAPES[level.shape]} fill="rgb(var(--c-raised))" stroke="rgb(var(--c-subtle))" strokeWidth={0.8} />
        <g transform="translate(12 12.5) scale(0.42) translate(-12 -12)">
          <rect x="5" y="10" width="14" height="10" rx="2" fill="rgb(var(--c-muted))" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="rgb(var(--c-muted))" strokeWidth={2.5} />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={level.name}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={level.from} />
          <stop offset="100%" stopColor={level.to} />
        </linearGradient>
      </defs>
      <path d={SHAPES[level.shape]} fill={`url(#${gradientId})`} />
    </svg>
  );
}

interface LevelBadgeProps {
  /** Pass either an explicit level, or an XP value to derive it from. */
  level?: LevelDef;
  xp?: number;
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
}

/** The pill form used next to a user's name across the app. */
export default function LevelBadge({ level, xp, size = 'sm', showName = true, className = '' }: LevelBadgeProps) {
  const resolved = level ?? levelForXp(xp ?? 0);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${pad} ${resolved.textClass} ${resolved.bgClass} ${className}`}
    >
      <LevelBadgeIcon level={resolved} className={icon} />
      {showName && resolved.name}
    </span>
  );
}

export { LEVELS };
