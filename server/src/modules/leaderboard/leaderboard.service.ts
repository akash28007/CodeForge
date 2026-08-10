import { Injectable } from '@nestjs/common';
import { Difficulty, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationConfigService, levelProgressFor } from '../gamification/gamification.config';
import { computeStreaks } from '../gamification/streak.util';

export type LeaderboardPeriod = 'all' | 'month' | 'week';

export interface LeaderboardQuery {
  period?: LeaderboardPeriod;
  page?: number;
  pageSize?: number;
}

interface Aggregates {
  xp: number;
  solved: number;
  hardSolved: number;
  accepted: number;
  submissions: number;
}

function periodStart(period: LeaderboardPeriod, now = new Date()): Date | null {
  if (period === 'all') return null;
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  if (period === 'month') start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GamificationConfigService,
  ) {}

  /**
   * Ranked by total XP (guide 6.6), with solved / hard-solved / acceptance / streak shown
   * alongside. Ties break on problems solved, then hard problems, then name — so the order
   * is deterministic rather than dependent on row order.
   *
   * Users with no XP are omitted rather than listed with a zero.
   */
  async getLeaderboard(query: LeaderboardQuery = {}, viewerId?: string) {
    const period = query.period ?? 'all';
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const since = periodStart(period);

    const aggregates = await this.aggregate(since);
    if (aggregates.size === 0) {
      return { entries: [], total: 0, page, pageSize, period, currentUser: null };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...aggregates.keys()] } },
      select: { id: true, name: true, username: true },
    });
    const levels = await this.config.levels();

    const ranked = users
      .map((user) => {
        const stats = aggregates.get(user.id)!;
        const progress = levelProgressFor(stats.xp, levels);
        return {
          userId: user.id,
          name: user.name,
          username: user.username,
          xp: stats.xp,
          level: progress.level,
          solvedCount: stats.solved,
          hardSolved: stats.hardSolved,
          acceptance: stats.submissions > 0 ? Math.round((stats.accepted / stats.submissions) * 1000) / 10 : 0,
          streak: 0,
        };
      })
      .sort(
        (a, b) =>
          b.xp - a.xp ||
          b.solvedCount - a.solvedCount ||
          b.hardSolved - a.hardSolved ||
          a.name.localeCompare(b.name),
      )
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    const pageSlice = ranked.slice((page - 1) * pageSize, page * pageSize);

    // Streaks need a per-user query, so only compute them for rows actually being shown
    // (plus the viewer's own pinned row).
    const viewerEntry = viewerId ? ranked.find((r) => r.userId === viewerId) ?? null : null;
    const needStreaks = new Map(pageSlice.map((r) => [r.userId, r]));
    if (viewerEntry) needStreaks.set(viewerEntry.userId, viewerEntry);

    await Promise.all(
      [...needStreaks.values()].map(async (entry) => {
        entry.streak = (await this.streakFor(entry.userId)).current;
      }),
    );

    return {
      entries: pageSlice,
      total: ranked.length,
      page,
      pageSize,
      period,
      // Pinned so a user can always find themselves, even from page 40.
      currentUser: viewerEntry,
    };
  }

  /** XP and solve stats per user, optionally restricted to a period. */
  private async aggregate(since: Date | null): Promise<Map<string, Aggregates>> {
    const [xpRows, submissions] = await Promise.all([
      this.prisma.xpEntry.groupBy({
        by: ['userId'],
        where: since ? { createdAt: { gte: since } } : {},
        _sum: { amount: true },
      }),
      this.prisma.submission.findMany({
        where: since ? { submittedAt: { gte: since } } : {},
        select: {
          userId: true,
          problemId: true,
          status: true,
          problem: { select: { difficulty: true } },
        },
      }),
    ]);

    const stats = new Map<string, Aggregates>();
    const ensure = (userId: string) => {
      let entry = stats.get(userId);
      if (!entry) {
        entry = { xp: 0, solved: 0, hardSolved: 0, accepted: 0, submissions: 0 };
        stats.set(userId, entry);
      }
      return entry;
    };

    for (const row of xpRows) {
      ensure(row.userId).xp = row._sum.amount ?? 0;
    }

    // Distinct (user, problem) pairs — repeat solves of the same problem count once.
    const solvedPairs = new Set<string>();
    for (const s of submissions) {
      const entry = ensure(s.userId);
      entry.submissions++;
      if (s.status !== SubmissionStatus.ACCEPTED) continue;
      entry.accepted++;

      const pairKey = `${s.userId}:${s.problemId}`;
      if (solvedPairs.has(pairKey)) continue;
      solvedPairs.add(pairKey);
      entry.solved++;
      if (s.problem.difficulty === Difficulty.HARD) entry.hardSolved++;
    }

    // Someone with submissions but no XP yet shouldn't appear on an XP-ranked board.
    for (const [userId, entry] of stats) {
      if (entry.xp <= 0) stats.delete(userId);
    }
    return stats;
  }

  private async streakFor(userId: string) {
    const rows = await this.prisma.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT TO_CHAR("submittedAt", 'YYYY-MM-DD') AS day
      FROM "Submission"
      WHERE "userId" = ${userId}
      ORDER BY day ASC
    `;
    return computeStreaks(
      rows.map((r) => r.day),
      new Date().toISOString().slice(0, 10),
    );
  }

  /** How many users sit at each level — the sidebar distribution chart. */
  async levelDistribution() {
    const [xpRows, levels] = await Promise.all([
      this.prisma.xpEntry.groupBy({ by: ['userId'], _sum: { amount: true } }),
      this.config.levels(),
    ]);

    const counts = new Map<number, number>(levels.map((l) => [l.rank, 0]));
    for (const row of xpRows) {
      const xp = row._sum.amount ?? 0;
      if (xp <= 0) continue;
      const { level } = levelProgressFor(xp, levels);
      counts.set(level.rank, (counts.get(level.rank) ?? 0) + 1);
    }

    return levels.map((level) => ({
      rank: level.rank,
      name: level.name,
      minXp: level.minXp,
      users: counts.get(level.rank) ?? 0,
    }));
  }
}
