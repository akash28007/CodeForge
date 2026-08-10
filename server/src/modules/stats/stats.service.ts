import { Injectable } from '@nestjs/common';
import { Difficulty, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ActivityDay {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submissions per calendar day for the activity calendar / heatmap.
   * Aggregated in SQL rather than by pulling every row into Node.
   */
  async activity(userId: string, days: number): Promise<{ days: ActivityDay[]; activeDays: number; total: number }> {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR("submittedAt", 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM "Submission"
      WHERE "userId" = ${userId} AND "submittedAt" >= ${from}
      GROUP BY day
      ORDER BY day ASC
    `;

    const result = rows.map((row) => ({ date: row.day, count: Number(row.count) }));
    return {
      days: result,
      activeDays: result.length,
      total: result.reduce((sum, d) => sum + d.count, 0),
    };
  }

  /** Solved vs total, overall and per difficulty — powers the progress donut and bars. */
  async progress(userId: string) {
    const [totals, solvedRows] = await Promise.all([
      this.prisma.problem.groupBy({ by: ['difficulty'], _count: true }),
      this.prisma.submission.findMany({
        where: { userId, status: SubmissionStatus.ACCEPTED },
        select: { problem: { select: { difficulty: true } }, problemId: true },
        distinct: ['problemId'],
      }),
    ]);

    const solvedByDifficulty = new Map<Difficulty, number>();
    for (const row of solvedRows) {
      const key = row.problem.difficulty;
      solvedByDifficulty.set(key, (solvedByDifficulty.get(key) ?? 0) + 1);
    }

    const byDifficulty = Object.values(Difficulty).map((difficulty) => ({
      difficulty,
      solved: solvedByDifficulty.get(difficulty) ?? 0,
      total: totals.find((t) => t.difficulty === difficulty)?._count ?? 0,
    }));

    return {
      solved: byDifficulty.reduce((sum, d) => sum + d.solved, 0),
      total: byDifficulty.reduce((sum, d) => sum + d.total, 0),
      byDifficulty,
    };
  }
}
