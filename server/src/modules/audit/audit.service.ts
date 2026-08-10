import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId: string;
  /** Verb, e.g. `create` / `update` / `delete`. */
  action: string;
  /** Model or area touched, e.g. `CourseCard`. */
  entity: string;
  entityId?: string | null;
  /** Human-readable one-liner shown in the admin panel. */
  summary: string;
}

/**
 * Append-only record of admin mutations (guide §11).
 *
 * Writes never throw. An audit-log failure must not roll back the change an admin
 * just made and reported as saved — the same reasoning as notifications: this is a
 * side effect of the operation, not the operation itself. Failures are logged so a
 * silent gap in the trail is still visible in the server logs.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          summary: entry.summary,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log (${entry.action} ${entry.entity}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Most recent entries first. Used by the admin dashboard (step 12). */
  async recent(limit = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
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
