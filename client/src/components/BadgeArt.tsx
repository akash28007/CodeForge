import { useId, type ReactNode } from 'react';

/**
 * Per-badge emblem art.
 *
 * Deliberately code-side rather than a `Badge.icon` column: the art is a design asset,
 * not content an admin needs to author, and keeping it here avoids a migration plus an
 * upload/preview flow in the admin panel for something that changes once a year.
 * Adding a badge to `seed-data/badges.json` without adding it here still renders — see
 * `fallbackFor` — it just gets the generic emblem for its criteria until art is drawn.
 *
 * Every entry pairs a *distinct plate silhouette* with a *distinct glyph* and a
 * *distinct hue*, so two badges can never read as the same thing even at 40px.
 */

interface ArtDef {
  /** Outer medallion silhouette. Inherits the gradient fill from its wrapper. */
  plate: ReactNode;
  /** Inner motif. Inherits a white stroke; elements may override to fill instead. */
  glyph: ReactNode;
  from: string;
  to: string;
}

/* ── plate silhouettes (48×48) ─────────────────────────────── */

const PLATE = {
  circle: <path d="M24 4.5a19.5 19.5 0 1 1 0 39 19.5 19.5 0 0 1 0-39z" />,
  hexagon: <path d="M24 3.5l17.7 10.2v20.6L24 44.5 6.3 34.3V13.7z" />,
  squircle: (
    <path d="M15 4.5h18a10.5 10.5 0 0 1 10.5 10.5v18A10.5 10.5 0 0 1 33 43.5H15A10.5 10.5 0 0 1 4.5 33V15A10.5 10.5 0 0 1 15 4.5z" />
  ),
  shield: <path d="M24 3.5l17 6.1v12.9c0 9.7-6.9 18.4-17 22.7C13.9 40.9 7 32.2 7 22.5V9.6z" />,
  rosette: (
    <>
      <rect x="7" y="7" width="34" height="34" rx="7" />
      <rect x="7" y="7" width="34" height="34" rx="7" transform="rotate(45 24 24)" />
    </>
  ),
  pentagon: <path d="M24 3.5l20 14.5-7.6 23.5H11.6L4 18z" />,
  gem: <path d="M16 6h16l10 12-18 24L6 18z" />,
  octagon: <path d="M17 4.5h14L43.5 17v14L31 43.5H17L4.5 31V17z" />,
  star: <path d="M24 3l6.4 13 14.3 2.1-10.3 10.1 2.4 14.2L24 35.7l-12.8 6.7 2.4-14.2L3.3 18.1 17.6 16z" />,
  crown: (
    <>
      <path d="M7 19l8.5 6.5L24 10l8.5 15.5L41 19l-3.5 20h-27z" />
      <rect x="11" y="40.5" width="26" height="3.5" rx="1.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/** Numerals read instantly at small sizes, which outline art does not. */
function Numeral({ children, size }: { children: string; size: number }) {
  return (
    <text
      x="24"
      y="24.5"
      textAnchor="middle"
      dominantBaseline="central"
      stroke="none"
      fill="#fff"
      fontSize={size}
      fontWeight={800}
      letterSpacing="-0.5"
    >
      {children}
    </text>
  );
}

/* ── the ten seeded badges ─────────────────────────────────── */

const ART: Record<string, ArtDef> = {
  'first-steps': {
    plate: PLATE.circle,
    // A flag planted at a start line.
    glyph: (
      <>
        <path d="M19 34V14" />
        <path d="M19 15.5h10.5l-3 4 3 4H19" />
        <path d="M14.5 35.5h19" />
      </>
    ),
    from: '#e0ab74',
    to: '#a2683c',
  },
  'getting-going': {
    plate: PLATE.hexagon,
    // Three rising bars — momentum.
    glyph: (
      <>
        <path d="M16.5 32.5v-5" strokeWidth={3.4} />
        <path d="M24 32.5v-10.5" strokeWidth={3.4} />
        <path d="M31.5 32.5v-16" strokeWidth={3.4} />
        <path d="M13 36h22" />
      </>
    ),
    from: '#cdd6e2',
    to: '#8592a4',
  },
  'problem-solver': {
    plate: PLATE.squircle,
    // Lightbulb.
    glyph: (
      <>
        <path d="M24 12.5a8.5 8.5 0 0 1 5 15.4v2.6h-10v-2.6a8.5 8.5 0 0 1 5-15.4z" />
        <path d="M20.5 34h7M22 37h4" />
      </>
    ),
    from: '#8fdcb0',
    to: '#3d9a6c',
  },
  'half-century': {
    plate: PLATE.shield,
    glyph: <Numeral size={17}>50</Numeral>,
    from: '#88c8f6',
    to: '#3a7fc4',
  },
  centurion: {
    plate: PLATE.rosette,
    glyph: <Numeral size={14}>100</Numeral>,
    from: '#c9a6ff',
    to: '#7343d4',
  },
  'hard-mode': {
    plate: PLATE.pentagon,
    // A summit.
    glyph: (
      <>
        <path d="M11 34l8.5-12.5 5 7 4.5-6L37 34z" />
        <path d="M15.5 27.5l4-2.5 3 2" />
      </>
    ),
    from: '#f7ab90',
    to: '#d4562f',
  },
  'hard-hitter': {
    plate: PLATE.gem,
    // Impact burst.
    glyph: (
      <path d="M24 11.5l3 8.2 8.2-3-3 8.3 3 8.2-8.2-3-3 8.3-3-8.3-8.2 3 3-8.2-3-8.3 8.2 3z" />
    ),
    from: '#f2a8d3',
    to: '#bd3d9c',
  },
  consistent: {
    plate: PLATE.octagon,
    // Single flame.
    glyph: (
      <path d="M24 11.5c4.2 5.2 7.2 7.8 7.2 12.4a7.2 7.2 0 1 1-14.4 0c0-3.1 1.5-5.2 3.1-7.2.5 2.1 1.5 3.1 3.1 3.6-1-3.6-.5-6.2 1-8.8z" />
    ),
    from: '#ffc978',
    to: '#e2892b',
  },
  unstoppable: {
    plate: PLATE.star,
    // Lightning bolt.
    glyph: <path d="M26.5 11.5L17 25.5h6.5L21 38l9.5-14.5H24z" />,
    from: '#ffdd85',
    to: '#dd9c11',
  },
  veteran: {
    plate: PLATE.crown,
    // Laurel wreath around a star.
    glyph: (
      <>
        <path d="M24 15.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z" />
        <path d="M15.5 32c-3.2-4.2-3.2-9.3 0-13.5M32.5 32c3.2-4.2 3.2-9.3 0-13.5" />
      </>
    ),
    from: '#9df0d4',
    to: '#11a184',
  },
};

/** Keeps a newly seeded badge from rendering blank before its art is drawn. */
function fallbackFor(criteria?: string): ArtDef {
  const byCriteria: Record<string, [string, string]> = {
    PROBLEMS_SOLVED: ['#8fdcb0', '#3d9a6c'],
    HARD_SOLVED: ['#f7ab90', '#d4562f'],
    STREAK_DAYS: ['#ffc978', '#e2892b'],
    TOTAL_XP: ['#c9a6ff', '#7343d4'],
  };
  const [from, to] = byCriteria[criteria ?? ''] ?? ['#cdd6e2', '#8592a4'];
  return {
    plate: PLATE.circle,
    glyph: <path d="M24 14l3 6.4 7 1-5 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-4.9 7-1z" />,
    from,
    to,
  };
}

interface BadgeArtProps {
  code: string;
  criteria?: string;
  /** Locked badges keep their real art, dimmed — the point is to show what's on offer. */
  locked?: boolean;
  className?: string;
}

export default function BadgeArt({ code, criteria, locked = false, className = 'h-16 w-16' }: BadgeArtProps) {
  const gradientId = useId();
  const art = ART[code] ?? fallbackFor(criteria);

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={art.from} />
          <stop offset="100%" stopColor={art.to} />
        </linearGradient>
      </defs>

      {/* Locked art stays recognisable — partial desaturation rather than a flat grey
          silhouette, so the reward is legible and worth chasing. */}
      <g opacity={locked ? 0.42 : 1} style={locked ? { filter: 'grayscale(0.5)' } : undefined}>
        <g fill={`url(#${gradientId})`}>{art.plate}</g>
        <g
          fill="none"
          stroke="#fff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={locked ? 0.8 : 0.95}
        >
          {art.glyph}
        </g>
      </g>

      {locked && (
        <g>
          <circle cx="37.5" cy="37.5" r="9" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-subtle))" />
          <rect x="33.5" y="37" width="8" height="6" rx="1.6" fill="rgb(var(--c-muted))" />
          <path
            d="M35.5 37v-1.8a2 2 0 0 1 4 0V37"
            fill="none"
            stroke="rgb(var(--c-muted))"
            strokeWidth={1.5}
          />
        </g>
      )}
    </svg>
  );
}
