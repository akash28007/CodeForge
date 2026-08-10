import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Which preference flag gates each notification type. */
const PREFERENCE_FOR: Record<NotificationType, keyof Prisma.UserPreferencesSelect | null> = {
  SUBMISSION_RESULT: 'notifyVerdicts',
  BADGE_EARNED: 'notifyBadges',
  LEVEL_UP: 'notifyBadges',
  STREAK_REMINDER: 'notifyStreaks',
  ANNOUNCEMENT: 'notifyAnnouncements',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes a notification unless the user has switched that type off.
   *
   * Never throws: notifications are a side effect of judging and XP awards, and a
   * failure here must not roll back the thing that actually mattered.
   */
  async create(input: CreateNotification): Promise<void> {
    try {
      const flag = PREFERENCE_FOR[input.type];
      if (flag) {
        const prefs = await this.prisma.userPreferences.findUnique({ where: { userId: input.userId } });
        // Absent preferences mean defaults, which are all "on".
        if (prefs && prefs[flag as keyof typeof prefs] === false) return;
      }

      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for ${input.userId}: ${(err as Error).message}`);
    }
  }

  async list(userId: string, { unreadOnly = false, take = 50 } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    // Scoped by userId so one user can't mark another's notification read.
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { id, read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return { id, deleted: true };
  }
}
