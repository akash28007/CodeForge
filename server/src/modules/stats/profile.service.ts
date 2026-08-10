import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { GamificationService } from '../gamification/gamification.service';
import { slugifyUsername } from './username.util';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly gamification: GamificationService,
  ) {}

  /**
   * Finds a free handle derived from `seed`, appending a counter on collision.
   * Used to backfill users created before handles existed.
   */
  private async allocateUsername(seed: string): Promise<string> {
    const base = slugifyUsername(seed);
    for (let suffix = 0; suffix < 100; suffix++) {
      const candidate = suffix === 0 ? base : `${base}${suffix}`.slice(0, 20);
      const taken = await this.prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
      if (!taken) return candidate;
    }
    return `user_${Date.now().toString(36)}`.slice(0, 20);
  }

  /** The sidebar user card: identity, level, rank, and derived skills. */
  async profileCard(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        profileViews: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Backfill on first read for accounts that predate handles.
    if (!user.username) {
      const username = await this.allocateUsername(user.name || user.email.split('@')[0]);
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { username },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          bio: true,
          profileViews: true,
          role: true,
          createdAt: true,
        },
      });
    }

    const [gamification, rank, skills, languages] = await Promise.all([
      this.gamification.summary(userId),
      this.analytics.rank(userId),
      this.gamification.skillXp(userId),
      this.prisma.submission.findMany({ where: { userId }, select: { language: true }, distinct: ['language'] }),
    ]);

    return {
      ...user,
      level: gamification.level,
      xp: gamification.xp,
      rank: rank.rank,
      totalRanked: rank.totalRanked,
      streak: gamification.streak,
      // Skills are derived from what the user has actually solved, never self-declared.
      skills: skills.slice(0, 8).map((s) => s.topic),
      languages: languages.map((l) => l.language),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const taken = await this.prisma.user.findUnique({
        where: { username: dto.username },
        select: { id: true },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException('That username is already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.username !== undefined ? { username: dto.username } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      },
      select: { id: true, name: true, email: true, username: true, bio: true, role: true },
    });
    return user;
  }

  /** Public profile by handle. Viewing someone else's increments their view counter. */
  async publicProfile(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true, bio: true, profileViews: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Profile not found');

    if (viewerId && viewerId !== user.id) {
      await this.prisma.user.update({ where: { id: user.id }, data: { profileViews: { increment: 1 } } });
    }

    const [gamification, rank, solved] = await Promise.all([
      this.gamification.summary(user.id),
      this.analytics.rank(user.id),
      this.prisma.submission.findMany({
        where: { userId: user.id, status: SubmissionStatus.ACCEPTED },
        select: { problemId: true },
        distinct: ['problemId'],
      }),
    ]);

    return {
      ...user,
      level: gamification.level,
      xp: gamification.xp,
      rank: rank.rank,
      streak: gamification.streak,
      solvedCount: solved.length,
      badges: gamification.badges.filter((b) => b.earned),
    };
  }
}
