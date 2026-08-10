import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../utils/roles.decorator';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';
import {
  AdjustXpDto,
  QueryAdminSubmissionsDto,
  QueryUsersDto,
  UpdateGamificationConfigDto,
  UpdateSuspensionDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

/**
 * Admin dashboard, user management, judge monitor and gamification config (guide §11).
 * Homepage and Resources CMS live in their own modules; this covers the rest.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard counters and judge queue health' })
  stats() {
    return this.admin.stats();
  }

  @Get('audit')
  @ApiOperation({ summary: 'Recent admin mutations' })
  auditLog() {
    return this.audit.recent(150);
  }

  // ───────────────────────── users ─────────────────────────

  @Get('users')
  users(@Query() query: QueryUsersDto) {
    return this.admin.users(query);
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.admin.user(id);
  }

  @Patch('users/:id/role')
  async setRole(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const user = await this.admin.setRole(id, dto.role, actor.sub);
    await this.audit.record({
      actorId: actor.sub,
      action: 'update',
      entity: 'UserRole',
      entityId: id,
      summary: `Set ${user.email} to ${dto.role}`,
    });
    return user;
  }

  @Patch('users/:id/suspension')
  async setSuspension(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSuspensionDto,
  ) {
    const user = await this.admin.setSuspension(id, dto.suspended, dto.reason, actor.sub);
    await this.audit.record({
      actorId: actor.sub,
      action: dto.suspended ? 'suspend' : 'unsuspend',
      entity: 'User',
      entityId: id,
      summary: dto.suspended
        ? `Suspended ${user.email}${dto.reason ? ` — ${dto.reason}` : ''}`
        : `Reinstated ${user.email}`,
    });
    return user;
  }

  @Post('users/:id/xp')
  @ApiOperation({ summary: 'Append a manual XP correction to the ledger' })
  async adjustXp(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AdjustXpDto) {
    const result = await this.admin.adjustXp(id, dto, actor.sub);
    await this.audit.record({
      actorId: actor.sub,
      action: 'adjust',
      entity: 'UserXp',
      entityId: id,
      summary: `${dto.amount > 0 ? '+' : ''}${dto.amount} XP — ${dto.reason}`,
    });
    return result;
  }

  // ───────────────────────── judge monitor ─────────────────────────

  @Get('submissions')
  @ApiOperation({ summary: 'Recent submissions with verdicts, for debugging the executor' })
  submissions(@Query() query: QueryAdminSubmissionsDto) {
    return this.admin.submissions(query);
  }

  // ───────────────────────── gamification config ─────────────────────────

  @Get('gamification')
  gamification() {
    return this.admin.gamification();
  }

  @Patch('gamification')
  async updateGamification(@CurrentUser() actor: JwtPayload, @Body() dto: UpdateGamificationConfigDto) {
    const result = await this.admin.updateGamification(dto);
    await this.audit.record({
      actorId: actor.sub,
      action: 'update',
      entity: 'GamificationConfig',
      summary: `Updated ${Object.keys(dto.entries).join(', ')}`,
    });
    return result;
  }
}
