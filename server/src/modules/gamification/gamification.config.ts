import { Injectable } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LevelDefinition {
  rank: number;
  name: string;
  minXp: number;
}

/** Defaults from the spec. Any of these can be overridden per-key in GamificationConfig. */
export const DEFAULT_LEVELS: LevelDefinition[] = [
  { rank: 1, name: 'Beginner', minXp: 0 },
  { rank: 2, name: 'Learner', minXp: 100 },
  { rank: 3, name: 'Pupil', minXp: 300 },
  { rank: 4, name: 'Coder', minXp: 700 },
  { rank: 5, name: 'Specialist', minXp: 1500 },
  { rank: 6, name: 'Expert', minXp: 3000 },
  { rank: 7, name: 'Master', minXp: 6000 },
  { rank: 8, name: 'Knight', minXp: 10000 },
  { rank: 9, name: 'Champion', minXp: 16000 },
  { rank: 10, name: 'Legend', minXp: 25000 },
];

export const DEFAULT_XP = {
  'xp.solve.EASY': 10,
  'xp.solve.MEDIUM': 25,
  'xp.solve.HARD': 50,
  'xp.bonus.firstAccepted': 5,
  'xp.bonus.noEditorial': 10,
  'xp.bonus.quickSolve': 5,
  'xp.bonus.dailyLogin': 2,
  'xp.bonus.streakDay': 3,
  'xp.bonus.streak7': 20,
  'xp.bonus.streak30': 100,
  /** A solve counts as "quick" at or below this many submissions for the problem. */
  'rule.quickSolveAttempts': 3,
} as const;

export type XpConfigKey = keyof typeof DEFAULT_XP;

@Injectable()
export class GamificationConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private cache: Map<string, string> | null = null;
  private loadedAt = 0;
  private static readonly TTL_MS = 30_000;

  private async values(): Promise<Map<string, string>> {
    if (this.cache && Date.now() - this.loadedAt < GamificationConfigService.TTL_MS) {
      return this.cache;
    }
    const rows = await this.prisma.gamificationConfig.findMany();
    this.cache = new Map(rows.map((r) => [r.key, r.value]));
    this.loadedAt = Date.now();
    return this.cache;
  }

  /** Drops the cache so an admin edit takes effect immediately. */
  invalidate() {
    this.cache = null;
  }

  async number(key: XpConfigKey): Promise<number> {
    const overrides = await this.values();
    const raw = overrides.get(key);
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_XP[key];
  }

  async solveXp(difficulty: Difficulty): Promise<number> {
    return this.number(`xp.solve.${difficulty}` as XpConfigKey);
  }

  /** Level table, with any admin overrides for names/thresholds applied. */
  async levels(): Promise<LevelDefinition[]> {
    const overrides = await this.values();
    return DEFAULT_LEVELS.map((level) => {
      const name = overrides.get(`level.${level.rank}.name`) ?? level.name;
      const rawMin = overrides.get(`level.${level.rank}.minXp`);
      const minXp = rawMin !== undefined && Number.isFinite(Number(rawMin)) ? Number(rawMin) : level.minXp;
      return { rank: level.rank, name, minXp };
    }).sort((a, b) => a.minXp - b.minXp);
  }

  async setMany(entries: Record<string, string>) {
    await this.prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        this.prisma.gamificationConfig.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
    this.invalidate();
  }
}

export interface LevelProgress {
  level: LevelDefinition;
  next: LevelDefinition | null;
  percent: number;
  xpRemaining: number;
}

export function levelProgressFor(xp: number, levels: LevelDefinition[]): LevelProgress {
  let current = levels[0];
  for (const level of levels) {
    if (xp >= level.minXp) current = level;
    else break;
  }
  const next = levels.find((l) => l.minXp > xp) ?? null;
  if (!next) {
    return { level: current, next: null, percent: 100, xpRemaining: 0 };
  }
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return {
    level: current,
    next,
    percent: span > 0 ? Math.round((into / span) * 100) : 0,
    xpRemaining: next.minXp - xp,
  };
}
