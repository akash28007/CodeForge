import { Injectable } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard() {
    // One row per (userId, problemId) that has at least one ACCEPTED submission —
    // this is what makes "solved" count distinct problems, not total accepted submissions.
    const solved = await this.prisma.submission.groupBy({
      by: ['userId', 'problemId'],
      where: { status: SubmissionStatus.ACCEPTED },
    });

    const solvedCountByUser = new Map<string, number>();
    for (const row of solved) {
      solvedCountByUser.set(row.userId, (solvedCountByUser.get(row.userId) ?? 0) + 1);
    }

    if (solvedCountByUser.size === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...solvedCountByUser.keys()] } },
      select: { id: true, name: true },
    });

    return users
      .map((user) => ({
        userId: user.id,
        name: user.name,
        solvedCount: solvedCountByUser.get(user.id) ?? 0,
      }))
      .sort((a, b) => b.solvedCount - a.solvedCount || a.name.localeCompare(b.name))
      .map((entry, index) => ({ rank: index + 1, ...entry }));
  }
}
