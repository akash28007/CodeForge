import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ResourcesService } from './resources.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../utils/roles.decorator';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';
import {
  CreateLearningPathDto,
  CreateResourceCategoryDto,
  CreateResourceDto,
  UpdateLearningPathDto,
  UpdateResourceCategoryDto,
  UpdateResourceDto,
} from './dto/resources.dto';

/**
 * Resources CMS (guide §9 + §11). Guarded on the server, not merely hidden in the UI.
 * Every mutation is audit-logged after it succeeds.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ResourcesAdminController {
  constructor(
    private readonly resources: ResourcesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'All resources, including unpublished' })
  all() {
    return this.resources.adminResources();
  }

  @Get('categories')
  categories() {
    return this.resources.adminCategories();
  }

  @Get('paths')
  paths() {
    return this.resources.adminPaths();
  }

  /* ── categories ── */

  @Post('categories')
  async createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateResourceCategoryDto) {
    const created = await this.resources.createCategory(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'ResourceCategory',
      entityId: created.id,
      summary: `Created resource category "${created.name}"`,
    });
    return created;
  }

  @Patch('categories/:id')
  async updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateResourceCategoryDto,
  ) {
    const updated = await this.resources.updateCategory(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'ResourceCategory',
      entityId: id,
      summary: `Updated resource category "${updated.name}"`,
    });
    return updated;
  }

  @Delete('categories/:id')
  async deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.resources.deleteCategory(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'ResourceCategory',
      entityId: id,
      summary: `Deleted a resource category and everything filed under it`,
    });
    return result;
  }

  /* ── resources ── */

  @Post()
  async createResource(@CurrentUser() user: JwtPayload, @Body() dto: CreateResourceDto) {
    const created = await this.resources.createResource(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'Resource',
      entityId: created.id,
      summary: `Created resource "${created.title}"`,
    });
    return created;
  }

  @Patch(':id')
  async updateResource(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateResourceDto) {
    const updated = await this.resources.updateResource(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'Resource',
      entityId: id,
      summary: `Updated resource "${updated.title}"`,
    });
    return updated;
  }

  @Delete(':id')
  async deleteResource(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.resources.deleteResource(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'Resource',
      entityId: id,
      summary: 'Deleted a resource',
    });
    return result;
  }

  /* ── learning paths ── */

  @Post('paths')
  async createPath(@CurrentUser() user: JwtPayload, @Body() dto: CreateLearningPathDto) {
    const created = await this.resources.createPath(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'LearningPath',
      entityId: created.id,
      summary: `Created learning path "${created.title}"`,
    });
    return created;
  }

  @Patch('paths/:id')
  async updatePath(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLearningPathDto) {
    const updated = await this.resources.updatePath(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'LearningPath',
      entityId: id,
      summary: `Updated learning path "${updated.title}"`,
    });
    return updated;
  }

  @Delete('paths/:id')
  async deletePath(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.resources.deletePath(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'LearningPath',
      entityId: id,
      summary: 'Deleted a learning path',
    });
    return result;
  }
}
