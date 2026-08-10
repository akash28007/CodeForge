import { Injectable } from '@nestjs/common';
import { Difficulty, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TimeRange = 'week' | 'month' | 'year' | 'all';

export function rangeStart(range: TimeRange, now = new Date()): Date | null {
  if (range === 'all') return null;
  const start = new Date(now);
  if (range === 'week') start.setDate(start.getDate() - 7);
  if (range === 'month') start.setMonth(start.getMonth() - 1);
  if (range === 'year') start.setFullYear(start.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every metric on the Progress page, honouring the selected time range.
   *
   * Anything that cannot be measured honestly is returned as null rather than
   * approximated — the UI shows a dash instead of inventing a number.
   */
  async overview(userId: string, range: TimeRange) {
    const since = rangeStart(range);
    const where = { userId, ...(since ? { submittedAt: { gte: since } } : {}) };

    const submissions = await this.prisma.submission.findMany({
      where,
      select: {
        problemId: true,
        status: true,
        language: true,
        runtime: true,
        submittedAt: true,
        problem: { select: { difficulty: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const total = submissions.length;
    const accepted = submissions.filter((s) => s.status === SubmissionStatus.ACCEPTED);

    /* ── solved (distinct problems) overall and per difficulty ── */
    const solvedFirstAt = new Map<string, Date>();
    const solvedDifficulty = new Map<string, Difficulty>();
    for (const s of accepted) {
      if (!solvedFirstAt.has(s.problemId)) {
        solvedFirstAt.set(s.problemId, s.submittedAt);
        solvedDifficulty.set(s.problemId, s.problem.difficulty);
      }
    }

    const totalsByDifficulty = await this.prisma.problem.groupBy({ by: ['difficulty'], _count: true });
    const byDifficulty = Object.values(Difficulty).map((difficulty) => ({
      difficulty,
      solved: [...solvedDifficulty.values()].filter((d) => d === difficulty).length,
      total: totalsByDifficulty.find((t) => t.difficulty === difficulty)?._count ?? 0,
    }));

    /* ── acceptance rate, and how it compares with everyone else ── */
    const acceptanceRate = total > 0 ? (accepted.length / total) * 100 : null;
    const betterThanPercent = acceptanceRate === null ? null : await this.acceptancePercentile(userId, acceptanceRate);

    /* ── attempts per solved problem, and time from first attempt to solve ── */
    const attemptsByProblem = new Map<string, number>();
    const firstAttemptAt = new Map<string, Date>();
    for (const s of submissions) {
      attemptsByProblem.set(s.problemId, (attemptsByProblem.get(s.problemId) ?? 0) + 1);
      if (!firstAttemptAt.has(s.problemId)) firstAttemptAt.set(s.problemId, s.submittedAt);
    }

    const solvedIds = [...solvedFirstAt.keys()];
    const avgAttempts = solvedIds.length
      ? solvedIds.reduce((sum, id) => sum + (attemptsByProblem.get(id) ?? 0), 0) / solvedIds.length
      : null;

    // "Time per problem" measured as first attempt -> first accepted. Problems solved on
    // the first try take ~0, so this reflects debugging time, not time spent reading.
    const solveDurations = solvedIds
      .map((id) => {
        const first = firstAttemptAt.get(id);
        const done = solvedFirstAt.get(id);
        return first && done ? done.getTime() - first.getTime() : null;
      })
      .filter((d): d is number => d !== null);
    const avgSolveMs = solveDurations.length
      ? solveDurations.reduce((a, b) => a + b, 0) / solveDurations.length
      : null;

    const firstTry = solvedIds.filter((id) => (attemptsByProblem.get(id) ?? 0) === 1).length;
    const firstTryRate = solvedIds.length ? (firstTry / solvedIds.length) * 100 : null;

    /* ── distributions ── */
    const languageCounts = new Map<string, number>();
    const hourCounts = new Array<number>(24).fill(0);
    for (const s of submissions) {
      languageCounts.set(s.language, (languageCounts.get(s.language) ?? 0) + 1);
      hourCounts[s.submittedAt.getHours()]++;
    }

    /* ── cumulative solved over time ── */
    const solvedOverTime: { date: string; total: number }[] = [];
    let running = 0;
    const seen = new Set<string>();
    for (const s of accepted) {
      if (seen.has(s.problemId)) continue;
      seen.add(s.problemId);
      running++;
      const date = s.submittedAt.toISOString().slice(0, 10);
      const last = solvedOverTime[solvedOverTime.length - 1];
      if (last && last.date === date) last.total = running;
      else solvedOverTime.push({ date, total: running });
    }

    return {
      range,
      totals: {
        submissions: total,
        accepted: accepted.length,
        solved: solvedIds.length,
        problemsAvailable: byDifficulty.reduce((sum, d) => sum + d.total, 0),
      },
      byDifficulty,
      acceptanceRate: acceptanceRate === null ? null : Math.round(acceptanceRate * 10) / 10,
      betterThanPercent,
      avgAttempts: avgAttempts === null ? null : Math.round(avgAttempts * 100) / 100,
      avgSolveMs: avgSolveMs === null ? null : Math.round(avgSolveMs),
      firstTryRate: firstTryRate === null ? null : Math.round(firstTryRate),
      runtimePercentile: await this.runtimePercentile(userId, since),
      languages: [...languageCounts.entries()]
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count),
      hourHistogram: hourCounts.map((count, hour) => ({ hour, count })),
      solvedOverTime,
    };
  }

  /**
   * What share of other users this user's acceptance rate beats. Users with no
   * submissions are excluded — they would otherwise inflate the comparison.
   */
  private async acceptancePercentile(userId: string, rate: number): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ userid: string; rate: number }[]>`
      SELECT "userId" AS userid,
             (COUNT(*) FILTER (WHERE status = 'ACCEPTED')::float / COUNT(*)) * 100 AS rate
      FROM "Submission"
      GROUP BY "userId"
      HAVING COUNT(*) > 0
    `;
    const others = rows.filter((r) => r.userid !== userId);
    if (others.length === 0) return null;
    const beaten = others.filter((r) => rate > r.rate).length;
    return Math.round((beaten / others.length) * 100);
  }

  /**
   * Average percentile of the user's accepted runtimes, compared against every other
   * accepted submission for the same problem. Returns null unless there is something to
   * compare against, so a lone user never sees a meaningless "100th percentile".
   */
  private async runtimePercentile(userId: string, since: Date | null): Promise<number | null> {
    const mine = await this.prisma.submission.findMany({
      where: {
        userId,
        status: SubmissionStatus.ACCEPTED,
        runtime: { not: null },
        ...(since ? { submittedAt: { gte: since } } : {}),
      },
      select: { problemId: true, runtime: true },
      distinct: ['problemId'],
    });
    if (mine.length === 0) return null;

    const percentiles: number[] = [];
    for (const submission of mine) {
      const others = await this.prisma.submission.findMany({
        where: {
          problemId: submission.problemId,
          status: SubmissionStatus.ACCEPTED,
          runtime: { not: null },
          userId: { not: userId },
        },
        select: { runtime: true },
      });
      if (others.length === 0) continue;
      const slower = others.filter((o) => (o.runtime ?? 0) > (submission.runtime ?? 0)).length;
      percentiles.push((slower / others.length) * 100);
    }

    if (percentiles.length === 0) return null;
    return Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length);
  }

  /** Global rank by total XP, plus the size of the ranked field. */
  async rank(userId: string): Promise<{ rank: number | null; totalRanked: number }> {
    const rows = await this.prisma.xpEntry.groupBy({
      by: ['userId'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    const index = rows.findIndex((r) => r.userId === userId);
    return { rank: index === -1 ? null : index + 1, totalRanked: rows.length };
  }
}
