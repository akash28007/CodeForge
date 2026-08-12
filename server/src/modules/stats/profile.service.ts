import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { GamificationService } from '../gamification/gamification.service';
import { UploadsService, UPLOAD_ROUTE_PREFIX, type UploadedImage } from '../uploads/uploads.service';
import { slugifyUsername } from './username.util';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Identity fields returned wherever a user describes themselves. */
const IDENTITY_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  bio: true,
  avatarUrl: true,
  profileViews: true,
  role: true,
  createdAt: true,
} as const;

/** One counted view per viewer per profile per day. */
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Above this, expired entries are swept before inserting another. */
const VIEW_CACHE_LIMIT = 5_000;

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  /**
   * Recently counted `viewer:profile` pairs.
   *
   * Deliberately in-memory rather than a `ProfileView` table: this only needs to stop a
   * refresh (and React's double-invoked effects in dev) from inflating the number, and a
   * table would mean a migration, a growing row count and a cleanup job for something
   * nobody ever queries. The cost is that the window resets on restart and is per-process
   * — both acceptable, since the failure mode is counting one extra view.
   */
  private readonly recentViews = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly gamification: GamificationService,
    private readonly uploads: UploadsService,
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
      select: IDENTITY_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');

    // Backfill on first read for accounts that predate handles.
    if (!user.username) {
      const username = await this.allocateUsername(user.name || user.email.split('@')[0]);
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { username },
        select: IDENTITY_SELECT,
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
      select: { id: true, name: true, email: true, username: true, bio: true, avatarUrl: true, role: true },
    });
    return user;
  }

  /**
   * Replaces the caller's avatar.
   *
   * The image is stored by `UploadsService`, which generates the filename and validates
   * the format by magic bytes — so the client never supplies a path or a URL, and the
   * column can only ever hold an image this server wrote.
   */
  async setAvatar(userId: string, file: UploadedImage | undefined) {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!previous) throw new NotFoundException('User not found');

    const stored = await this.uploads.storeImage(file);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: stored.url },
      select: { id: true, name: true, email: true, username: true, bio: true, avatarUrl: true, role: true },
    });

    // Only after the row points at the new file, so a failure here orphans a file rather
    // than leaving the profile pointing at one that has been deleted.
    await this.discardAvatarFile(previous.avatarUrl);
    return user;
  }

  /** Clears the avatar and deletes the backing file, falling back to initials. */
  async removeAvatar(userId: string) {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!previous) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, name: true, email: true, username: true, bio: true, avatarUrl: true, role: true },
    });

    await this.discardAvatarFile(previous.avatarUrl);
    return user;
  }

  /**
   * Best-effort delete of a replaced avatar. Never throws: the user's profile has
   * already been updated successfully at this point, and failing their request because
   * an old file could not be unlinked would be reporting a problem they cannot act on.
   */
  private async discardAvatarFile(url: string | null): Promise<void> {
    if (!url?.startsWith(`${UPLOAD_ROUTE_PREFIX}/`)) return;
    const filename = url.slice(UPLOAD_ROUTE_PREFIX.length + 1);
    try {
      await this.uploads.removeImage(filename);
    } catch (error) {
      this.logger.warn(`Could not delete replaced avatar ${filename}: ${(error as Error).message}`);
    }
  }

  /**
   * Whether this view should count, and records it if so.
   *
   * Anonymous visitors are not counted at all. That is a deliberate policy rather than an
   * oversight: without an account there is nothing stable to deduplicate on except the IP
   * address, which behind the production reverse proxy is the proxy's own — so every
   * signed-out visitor would share one key, and crawlers would inflate the number freely.
   * "Views by other registered users" is a smaller number, but it is a true one.
   */
  private shouldCountView(viewerId: string, profileId: string): boolean {
    const key = `${viewerId}:${profileId}`;
    const now = Date.now();

    const last = this.recentViews.get(key);
    if (last !== undefined && now - last < VIEW_WINDOW_MS) return false;

    if (this.recentViews.size >= VIEW_CACHE_LIMIT) {
      for (const [k, seen] of this.recentViews) {
        if (now - seen >= VIEW_WINDOW_MS) this.recentViews.delete(k);
      }
    }
    this.recentViews.set(key, now);
    return true;
  }

  /** Public profile by handle. Viewing someone else's increments their view counter. */
  async publicProfile(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        profileViews: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Profile not found');

    if (viewerId && viewerId !== user.id && this.shouldCountView(viewerId, user.id)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { profileViews: { increment: 1 } } });
      // The row was read before the increment, so reflect it rather than reporting a
      // count the viewer can see is one behind.
      user.profileViews += 1;
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
