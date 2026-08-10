/**
 * Level hierarchy (guide Section 6.1) and badge visuals (6.4).
 *
 * These are the *display* definitions. Section 6.7 requires thresholds and names to be
 * admin-configurable from the DB, so once the backend gamification config exists
 * (build-order step 6) this table becomes the fallback/default, and the live values
 * come from the API.
 */

export type LevelShape =
  | 'circle'
  | 'hexagon'
  | 'badge'
  | 'shield'
  | 'star'
  | 'crown'
  | 'diamond'
  | 'shield-gem'
  | 'crown-gem'
  | 'crystal';

export interface LevelDef {
  rank: number;
  name: string;
  minXp: number;
  shape: LevelShape;
  /** Tailwind-independent hex pair, used for the SVG gradient fill. */
  from: string;
  to: string;
  /** Tailwind classes for the text/pill treatment. */
  textClass: string;
  bgClass: string;
}

export const LEVELS: LevelDef[] = [
  { rank: 1, name: 'Beginner', minXp: 0, shape: 'circle', from: '#c2825a', to: '#8b5a34', textClass: 'text-[#d2996f]', bgClass: 'bg-[#c2825a]/12' },
  { rank: 2, name: 'Learner', minXp: 100, shape: 'hexagon', from: '#cf8f63', to: '#96633c', textClass: 'text-[#d9a077]', bgClass: 'bg-[#cf8f63]/12' },
  { rank: 3, name: 'Pupil', minXp: 300, shape: 'badge', from: '#d4d8de', to: '#9aa2ad', textClass: 'text-[#cbd2da]', bgClass: 'bg-[#d4d8de]/12' },
  { rank: 4, name: 'Coder', minXp: 700, shape: 'shield', from: '#dfe3e9', to: '#a5adb8', textClass: 'text-[#d5dbe3]', bgClass: 'bg-[#dfe3e9]/12' },
  { rank: 5, name: 'Specialist', minXp: 1500, shape: 'star', from: '#facc15', to: '#d19b06', textClass: 'text-[#fbd339]', bgClass: 'bg-[#facc15]/12' },
  { rank: 6, name: 'Expert', minXp: 3000, shape: 'crown', from: '#fbbf24', to: '#d08700', textClass: 'text-[#fcc63f]', bgClass: 'bg-[#fbbf24]/12' },
  { rank: 7, name: 'Master', minXp: 6000, shape: 'diamond', from: '#e7ecf5', to: '#aab6cc', textClass: 'text-[#dde4f0]', bgClass: 'bg-[#e7ecf5]/12' },
  { rank: 8, name: 'Knight', minXp: 10000, shape: 'shield-gem', from: '#60a5fa', to: '#1d4ed8', textClass: 'text-[#7db3fb]', bgClass: 'bg-[#60a5fa]/12' },
  { rank: 9, name: 'Champion', minXp: 16000, shape: 'crown-gem', from: '#34d399', to: '#047857', textClass: 'text-[#52dcaa]', bgClass: 'bg-[#34d399]/12' },
  { rank: 10, name: 'Legend', minXp: 25000, shape: 'crystal', from: '#c084fc', to: '#6d28d9', textClass: 'text-[#cb9bfc]', bgClass: 'bg-[#c084fc]/12' },
];

export function levelForXp(xp: number): LevelDef {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level;
    else break;
  }
  return current;
}

export function nextLevelForXp(xp: number): LevelDef | null {
  return LEVELS.find((l) => l.minXp > xp) ?? null;
}

export interface LevelProgress {
  level: LevelDef;
  next: LevelDef | null;
  /** 0-100. Always 100 at max level. */
  percent: number;
  xpIntoLevel: number;
  xpForLevel: number;
  xpRemaining: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const next = nextLevelForXp(xp);
  if (!next) {
    return { level, next: null, percent: 100, xpIntoLevel: 0, xpForLevel: 0, xpRemaining: 0 };
  }
  const span = next.minXp - level.minXp;
  const into = xp - level.minXp;
  return {
    level,
    next,
    percent: Math.round((into / span) * 100),
    xpIntoLevel: into,
    xpForLevel: span,
    xpRemaining: next.minXp - xp,
  };
}
