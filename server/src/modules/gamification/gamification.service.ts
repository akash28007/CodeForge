import { Injectable, Logger } from '@nestjs/common';
import { BadgeCriteria, Difficulty, NotificationType, Prisma, SubmissionStatus, XpReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationConfigService, levelProgressFor } from './gamification.config';
import { computeStreaks } from './streak.util';
import { NotificationsService } from '../notifications/notifications.service';

interface AwardInput {
  userId: string;
  amount: number;
  reason: XpReason;
  dedupeKey: string;
  problemId?: string;
}

/** Postgres unique-violation, surfaced by Prisma. */
const UNIQUE_VIOLATION = 'P2002';

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GamificationConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Inserts one ledger entry, or does nothing if this exact award already exists.
   *
   * Idempotency is enforced by the `(userId, dedupeKey)` unique index rather than a
   * read-then-write check, so two concurrent callers can't both slip an award through.
   * Returns the amount actually granted (0 when it was a duplicate).
   */
  private async award({ userId, amount, reason, dedupeKey, problemId }: AwardInput): Promise<number> {
    if (amount <= 0) return 0;
    try {
      await this.prisma.xpEntry.create({ data: { userId, amount, reason, dedupeKey, problemId } });
      return amount;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) {
        return 0;
      }
      throw err;
    }
  }

  async totalXp(userId: string): Promise<number> {
    const result = await this.prisma.xpEntry.aggregate({ where: { userId }, _sum: { amount: true } });
    return result._sum.amount ?? 0;
  }

  /**
   * Everything earned by an accepted submission. Called by the judge once a submission
   * reaches ACCEPTED.
   *
   * Base XP is keyed on the problem, so re-solving an already-solved problem grants
   * nothing further — exactly what the spec requires.
   */
  async awardForAcceptedSubmission(submissionId: string): Promise<number> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        userId: true,
        problemId: true,
        problem: { select: { difficulty: true } },
      },
    });
    if (!submission) return 0;

    const { userId, problemId } = submission;
    // Captured before any award so a level crossing can be detected afterwards.
    const xpBefore = await this.totalXp(userId);
    let granted = 0;

    granted += await this.award({
      userId,
      problemId,
      amount: await this.config.solveXp(submission.problem.difficulty),
      reason: XpReason.PROBLEM_SOLVED,
      dedupeKey: `solve:${problemId}`,
    });

    granted += await this.award({
      userId,
      problemId,
      amount: await this.config.number('xp.bonus.firstAccepted'),
      reason: XpReason.FIRST_ACCEPTED,
      dedupeKey: 'first-accepted',
    });

    // "Solved without viewing the editorial" — this is why opening one is recorded.
    const viewedEditorial = await this.prisma.editorialView.count({ where: { userId, problemId } });
    if (viewedEditorial === 0) {
      granted += await this.award({
        userId,
        problemId,
        amount: await this.config.number('xp.bonus.noEditorial'),
        reason: XpReason.SOLVED_WITHOUT_EDITORIAL,
        dedupeKey: `no-editorial:${problemId}`,
      });
    }

    const attempts = await this.prisma.submission.count({ where: { userId, problemId } });
    if (attempts <= (await this.config.number('rule.quickSolveAttempts'))) {
      granted += await this.award({
        userId,
        problemId,
        amount: await this.config.number('xp.bonus.quickSolve'),
        reason: XpReason.QUICK_SOLVE,
        dedupeKey: `quick-solve:${problemId}`,
      });
    }

    granted += await this.evaluateBadges(userId);
    await this.notifyIfLevelChanged(userId, xpBefore);
    return granted;
  }

  /** Raises a LEVEL_UP notification when the new XP total crosses a level threshold. */
  private async notifyIfLevelChanged(userId: string, xpBefore: number): Promise<void> {
    const xpAfter = await this.totalXp(userId);
    if (xpAfter === xpBefore) return;

    const levels = await this.config.levels();
    const before = levelProgressFor(xpBefore, levels).level;
    const after = levelProgressFor(xpAfter, levels).level;
    if (after.rank <= before.rank) return;

    await this.notifications.create({
      userId,
      type: NotificationType.LEVEL_UP,
      title: `Level up — you're now ${after.name}!`,
      body: `You reached ${xpAfter.toLocaleString()} XP.`,
      link: '/progress',
    });
  }

  /**
   * Daily check-in: login XP, plus streak-day and streak-milestone bonuses.
   * Safe to call on every authenticated request — the dedupe keys are date-scoped.
   */
  async checkIn(userId: string): Promise<{ granted: number; current: number; longest: number }> {
    const today = todayKey();
    let granted = 0;

    granted += await this.award({
      userId,
      amount: await this.config.number('xp.bonus.dailyLogin'),
      reason: XpReason.DAILY_LOGIN,
      dedupeKey: `login:${today}`,
    });

    const { current, longest } = await this.streaks(userId);

    if (current > 0) {
      granted += await this.award({
        userId,
        amount: await this.config.number('xp.bonus.streakDay'),
        reason: XpReason.STREAK_DAY,
        dedupeKey: `streak-day:${today}`,
      });

      // Milestones are keyed on the streak length, so a 7-day streak pays out once per
      // streak run rather than every day it stays above 7.
      if (current >= 7) {
        granted += await this.award({
          userId,
          amount: await this.config.number('xp.bonus.streak7'),
          reason: XpReason.STREAK_MILESTONE,
          dedupeKey: `streak7:${current - (current % 7)}:${today.slice(0, 7)}`,
        });
      }
      if (current >= 30) {
        granted += await this.award({
          userId,
          amount: await this.config.number('xp.bonus.streak30'),
          reason: XpReason.STREAK_MILESTONE,
          dedupeKey: `streak30:${current - (current % 30)}:${today.slice(0, 7)}`,
        });
      }
    }

    granted += await this.evaluateBadges(userId);
    return { granted, current, longest };
  }

  async streaks(userId: string) {
    const rows = await this.prisma.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT TO_CHAR("submittedAt", 'YYYY-MM-DD') AS day
      FROM "Submission"
      WHERE "userId" = ${userId}
      ORDER BY day ASC
    `;
    return computeStreaks(
      rows.map((r) => r.day),
      todayKey(),
    );
  }

  /** Awards any badge whose criteria the user now meets. Idempotent per badge. */
  async evaluateBadges(userId: string): Promise<number> {
    const badges = await this.prisma.badge.findMany({ orderBy: { threshold: 'asc' } });
    if (badges.length === 0) return 0;

    const earned = await this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
    const earnedIds = new Set(earned.map((b) => b.badgeId));
    const pending = badges.filter((b) => !earnedIds.has(b.id));
    if (pending.length === 0) return 0;

    const needs = new Set(pending.map((b) => b.criteria));
    const stats = {
      [BadgeCriteria.PROBLEMS_SOLVED]: needs.has(BadgeCriteria.PROBLEMS_SOLVED) ? await this.solvedCount(userId) : 0,
      [BadgeCriteria.HARD_SOLVED]: needs.has(BadgeCriteria.HARD_SOLVED)
        ? await this.solvedCount(userId, Difficulty.HARD)
        : 0,
      [BadgeCriteria.STREAK_DAYS]: needs.has(BadgeCriteria.STREAK_DAYS) ? (await this.streaks(userId)).longest : 0,
      [BadgeCriteria.TOTAL_XP]: needs.has(BadgeCriteria.TOTAL_XP) ? await this.totalXp(userId) : 0,
    };

    let granted = 0;
    for (const badge of pending) {
      if (stats[badge.criteria] < badge.threshold) continue;
      try {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) continue;
        throw err;
      }
      granted += await this.award({
        userId,
        amount: badge.xpReward,
        reason: XpReason.BADGE_EARNED,
        dedupeKey: `badge:${badge.code}`,
      });
      await this.notifications.create({
        userId,
        type: NotificationType.BADGE_EARNED,
        title: `Badge earned — ${badge.name}`,
        body: `${badge.description} (+${badge.xpReward} XP)`,
        link: '/progress',
      });
      this.logger.log(`User ${userId} earned badge ${badge.code}`);
    }
    return granted;
  }

  private async solvedCount(userId: string, difficulty?: Difficulty): Promise<number> {
    const rows = await this.prisma.submission.findMany({
      where: {
        userId,
        status: SubmissionStatus.ACCEPTED,
        ...(difficulty ? { problem: { difficulty } } : {}),
      },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    return rows.length;
  }

  /**
   * Per-topic mastery (spec 6.5). Derived from solved problems and their tags rather than
   * stored separately, so it can never drift out of sync with the ledger.
   */
  async skillXp(userId: string) {
    const solved = await this.prisma.submission.findMany({
      where: { userId, status: SubmissionStatus.ACCEPTED },
      select: { problem: { select: { difficulty: true, tags: { select: { tag: { select: { name: true } } } } } } },
      distinct: ['problemId'],
    });

    const perDifficulty: Record<Difficulty, number> = {
      EASY: await this.config.solveXp(Difficulty.EASY),
      MEDIUM: await this.config.solveXp(Difficulty.MEDIUM),
      HARD: await this.config.solveXp(Difficulty.HARD),
    };

    const totals = new Map<string, { xp: number; solved: number }>();
    for (const row of solved) {
      const xp = perDifficulty[row.problem.difficulty];
      for (const link of row.problem.tags) {
        const entry = totals.get(link.tag.name) ?? { xp: 0, solved: 0 };
        entry.xp += xp;
        entry.solved += 1;
        totals.set(link.tag.name, entry);
      }
    }

    return [...totals.entries()]
      .map(([topic, v]) => ({ topic, xp: v.xp, solved: v.solved }))
      .sort((a, b) => b.xp - a.xp || a.topic.localeCompare(b.topic));
  }

  /** Everything the profile card, dropdown and progress page need in one call. */
  async summary(userId: string) {
    const { current, longest } = await this.checkIn(userId);
    const [xp, levels, badges, earned] = await Promise.all([
      this.totalXp(userId),
      this.config.levels(),
      this.prisma.badge.findMany({ orderBy: [{ order: 'asc' }, { threshold: 'asc' }] }),
      this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true } }),
    ]);

    const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));
    const progress = levelProgressFor(xp, levels);

    return {
      xp,
      level: progress.level,
      nextLevel: progress.next,
      percentToNext: progress.percent,
      xpRemaining: progress.xpRemaining,
      streak: { current, longest },
      badges: badges.map((b) => ({
        code: b.code,
        name: b.name,
        description: b.description,
        rarity: b.rarity,
        threshold: b.threshold,
        criteria: b.criteria,
        earned: earnedMap.has(b.id),
        earnedAt: earnedMap.get(b.id) ?? null,
      })),
      earnedBadges: earnedMap.size,
      totalBadges: badges.length,
    };
  }

  /** Recent ledger entries, for an activity/XP history view. */
  history(userId: string, take = 30) {
    return this.prisma.xpEntry.findMany({
      where: { userId },
      select: { amount: true, reason: true, problemId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
