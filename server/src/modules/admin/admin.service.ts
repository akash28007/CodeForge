import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, SubmissionStatus, XpReason } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_LEVELS,
  DEFAULT_XP,
  GamificationConfigService,
} from '../gamification/gamification.config';
import {
  AdjustXpDto,
  QueryAdminSubmissionsDto,
  QueryUsersDto,
  UpdateGamificationConfigDto,
} from './dto/admin.dto';

/** Verdicts that mean the judge itself failed rather than the submitted code. */
const INFRA_FAILURE: SubmissionStatus[] = [SubmissionStatus.PENDING, SubmissionStatus.RUNNING];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GamificationConfigService,
  ) {}

  // ───────────────────────── dashboard ─────────────────────────

  /** Counts for the dashboard. Every number is a real query — nothing is estimated. */
  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      users,
      newUsersToday,
      suspended,
      problems,
      submissionsToday,
      submissionsTotal,
      accepted,
      resources,
      pending,
      running,
      subscribers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.problem.count(),
      this.prisma.submission.count({ where: { submittedAt: { gte: startOfToday } } }),
      this.prisma.submission.count(),
      this.prisma.submission.count({ where: { status: SubmissionStatus.ACCEPTED } }),
      this.prisma.resource.count(),
      this.prisma.submission.count({ where: { status: SubmissionStatus.PENDING } }),
      this.prisma.submission.count({ where: { status: SubmissionStatus.RUNNING } }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    ]);

    // A submission stuck in PENDING/RUNNING for this long means the worker is not
    // draining the queue — the most useful single signal of judge health.
    const stuckSince = new Date(Date.now() - 5 * 60 * 1000);
    const stuck = await this.prisma.submission.count({
      where: { status: { in: INFRA_FAILURE }, submittedAt: { lt: stuckSince } },
    });

    return {
      users: { total: users, newToday: newUsersToday, suspended },
      problems: { total: problems },
      resources: { total: resources },
      submissions: {
        today: submissionsToday,
        total: submissionsTotal,
        accepted,
        // Null rather than 0 when there is nothing to divide by — an empty judge has
        // no acceptance rate, and reporting 0% would be a lie.
        acceptanceRate: submissionsTotal > 0 ? Math.round((accepted / submissionsTotal) * 1000) / 10 : null,
      },
      queue: { pending, running, stuck },
      newsletter: { active: subscribers },
    };
  }

  // ───────────────────────── users ─────────────────────────

  async users(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const and: Prisma.UserWhereInput[] = [];
    if (query.role) and.push({ role: query.role });
    if (query.suspended !== undefined) {
      and.push(query.suspended ? { suspendedAt: { not: null } } : { suspendedAt: null });
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // `password` is never selected anywhere in this service, admin or not.
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          suspendedAt: true,
          suspendedReason: true,
          createdAt: true,
          _count: { select: { submissions: true, problems: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const xp = await this.xpByUser(rows.map((r) => r.id));

    return {
      items: rows.map((row) => ({ ...row, xp: xp.get(row.id) ?? 0 })),
      total,
      page,
      pageSize,
    };
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        avatarUrl: true,
        role: true,
        suspendedAt: true,
        suspendedReason: true,
        profileViews: true,
        createdAt: true,
        _count: { select: { submissions: true, problems: true, badges: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [xp, solved, recentXp] = await Promise.all([
      this.xpByUser([id]),
      this.prisma.submission.findMany({
        where: { userId: id, status: SubmissionStatus.ACCEPTED },
        distinct: ['problemId'],
        select: { problemId: true },
      }),
      this.prisma.xpEntry.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, amount: true, reason: true, dedupeKey: true, createdAt: true },
      }),
    ]);

    return { ...user, xp: xp.get(id) ?? 0, solvedCount: solved.length, recentXp };
  }

  private async xpByUser(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const sums = await this.prisma.xpEntry.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _sum: { amount: true },
    });
    return new Map(sums.map((s) => [s.userId, s._sum.amount ?? 0]));
  }

  /**
   * Role changes, with two guards that exist to stop an admin locking everyone out:
   * you cannot change your own role, and you cannot remove the last admin.
   */
  async setRole(targetId: string, role: Role, actorId: string) {
    if (targetId === actorId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true, name: true } });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      await this.assertNotLastAdmin(targetId);
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return updated;
  }

  /**
   * Suspension takes effect immediately: `JwtStrategy` re-reads the account on every
   * request, so tokens already in the user's hands stop working at once.
   */
  async setSuspension(targetId: string, suspended: boolean, reason: string | undefined, actorId: string) {
    if (targetId === actorId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
    if (!target) throw new NotFoundException('User not found');

    if (suspended && target.role === Role.ADMIN) {
      await this.assertNotLastAdmin(targetId);
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: {
        suspendedAt: suspended ? new Date() : null,
        suspendedReason: suspended ? (reason ?? null) : null,
      },
      select: { id: true, name: true, email: true, suspendedAt: true, suspendedReason: true },
    });
  }

  private async assertNotLastAdmin(excludingId: string) {
    const others = await this.prisma.user.count({
      where: { role: Role.ADMIN, suspendedAt: null, id: { not: excludingId } },
    });
    if (others === 0) {
      throw new BadRequestException('This is the last active admin — promote another account first');
    }
  }

  /**
   * Manual XP correction.
   *
   * Written as a ledger entry like every other award rather than editing a total,
   * because there is no total to edit: XP is always the sum of the ledger. The
   * dedupeKey is unique per adjustment, so repeated corrections are all recorded
   * instead of collapsing into one.
   */
  async adjustXp(targetId: string, dto: AdjustXpDto, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.xpEntry.create({
      data: {
        userId: targetId,
        amount: dto.amount,
        reason: XpReason.ADMIN_ADJUSTMENT,
        dedupeKey: `admin-adj:${randomUUID()}`,
      },
    });

    const xp = await this.xpByUser([targetId]);
    return { userId: targetId, delta: dto.amount, xp: xp.get(targetId) ?? 0, reason: dto.reason, by: actorId };
  }

  // ───────────────────────── submissions monitor ─────────────────────────

  async submissions(query: QueryAdminSubmissionsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const and: Prisma.SubmissionWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { problem: { title: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    const where: Prisma.SubmissionWhereInput = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Deliberately excludes `code`: the monitor is for spotting judge failures, and
        // an admin browsing a list has no reason to read everyone's source.
        select: {
          id: true,
          status: true,
          language: true,
          runtime: true,
          memory: true,
          passedCount: true,
          totalCount: true,
          errorMessage: true,
          submittedAt: true,
          user: { select: { id: true, name: true, email: true } },
          problem: { select: { id: true, title: true, difficulty: true } },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // ───────────────────────── gamification config ─────────────────────────

  /** Current effective values, showing which have been overridden by an admin. */
  async gamification() {
    const stored = await this.prisma.gamificationConfig.findMany();
    const overrides = new Map(stored.map((r) => [r.key, r.value]));

    const xp = Object.entries(DEFAULT_XP).map(([key, fallback]) => ({
      key,
      value: overrides.get(key) ?? String(fallback),
      default: String(fallback),
      overridden: overrides.has(key),
    }));

    const levels = DEFAULT_LEVELS.map((level) => ({
      rank: level.rank,
      name: overrides.get(`level.${level.rank}.name`) ?? level.name,
      minXp: Number(overrides.get(`level.${level.rank}.minXp`) ?? level.minXp),
      defaultName: level.name,
      defaultMinXp: level.minXp,
      overridden: overrides.has(`level.${level.rank}.name`) || overrides.has(`level.${level.rank}.minXp`),
    }));

    return { xp, levels };
  }

  /** Every key is checked against the known set — an unknown key is a typo, not config. */
  async updateGamification(dto: UpdateGamificationConfigDto) {
    const entries = dto.entries ?? {};
    const keys = Object.keys(entries);
    if (keys.length === 0) throw new BadRequestException('No entries supplied');

    const validXpKeys = new Set(Object.keys(DEFAULT_XP));
    const levelKey = /^level\.(\d+)\.(name|minXp)$/;
    const validRanks = new Set(DEFAULT_LEVELS.map((l) => String(l.rank)));

    for (const key of keys) {
      const match = levelKey.exec(key);
      if (match) {
        if (!validRanks.has(match[1])) throw new BadRequestException(`Unknown level rank in "${key}"`);
        if (match[2] === 'minXp' && !Number.isFinite(Number(entries[key]))) {
          throw new BadRequestException(`"${key}" must be a number`);
        }
        continue;
      }
      if (!validXpKeys.has(key)) throw new BadRequestException(`Unknown config key "${key}"`);
      if (!Number.isFinite(Number(entries[key]))) throw new BadRequestException(`"${key}" must be a number`);
    }

    await this.config.setMany(entries);
    return this.gamification();
  }

  // ───────────────────────── audit log ─────────────────────────

  async audit(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 250),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        summary: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
