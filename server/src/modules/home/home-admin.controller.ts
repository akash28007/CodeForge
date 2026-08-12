import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { HomeService } from './home.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../utils/roles.decorator';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';
import {
  CreateCompanyDto,
  CreateCourseCardDto,
  CreateFooterLinkDto,
  CreateReviewDto,
  UpdateCompanyDto,
  UpdateCourseCardDto,
  UpdateFooterLinkDto,
  UpdateHomeContentDto,
  UpdateReviewDto,
  UpsertSocialLinkDto,
} from './dto/home.dto';

/**
 * Homepage CMS (guide §11). Guarded on the server, not merely hidden in the UI —
 * every route here needs a valid token *and* the ADMIN role.
 *
 * Every mutation writes an audit entry. Logging happens after the write succeeds, so
 * the trail records what actually changed rather than what was attempted.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/home')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class HomeAdminController {
  constructor(
    private readonly home: HomeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'All homepage content, including unpublished rows' })
  getAll() {
    return this.home.adminContent();
  }

  @Get('newsletter')
  @ApiOperation({ summary: 'Newsletter subscribers' })
  subscribers() {
    return this.home.subscribers();
  }

  // ───────────────────────── page copy ─────────────────────────

  @Patch('content')
  async updateContent(@CurrentUser() user: JwtPayload, @Body() dto: UpdateHomeContentDto) {
    const updated = await this.home.updateContent(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'HomeContent',
      entityId: updated.id,
      summary: `Updated homepage copy (${Object.keys(dto).join(', ') || 'no fields'})`,
    });
    return updated;
  }

  // ───────────────────────── course cards ─────────────────────────

  @Post('courses')
  async createCourse(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseCardDto) {
    const card = await this.home.createCourseCard(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'CourseCard',
      entityId: card.id,
      summary: `Created course card "${card.title}"`,
    });
    return card;
  }

  @Patch('courses/:id')
  async updateCourse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCourseCardDto,
  ) {
    const card = await this.home.updateCourseCard(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'CourseCard',
      entityId: card.id,
      summary: `Updated course card "${card.title}"`,
    });
    return card;
  }

  @Delete('courses/:id')
  async deleteCourse(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const card = await this.home.deleteCourseCard(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'CourseCard',
      entityId: id,
      summary: `Deleted course card "${card.title ?? id}"`,
    });
    return { ok: true };
  }

  // ───────────────────────── reviews ─────────────────────────

  @Post('reviews')
  async createReview(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    const review = await this.home.createReview(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'Review',
      entityId: review.id,
      summary: `Created review by "${review.name}"`,
    });
    return review;
  }

  @Patch('reviews/:id')
  async updateReview(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    const review = await this.home.updateReview(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'Review',
      entityId: review.id,
      // A moderation decision is the thing worth being able to find in the log later,
      // so it is named explicitly rather than logged as a generic "updated".
      summary: dto.status
        ? `${dto.status === 'APPROVED' ? 'Approved' : dto.status === 'REJECTED' ? 'Rejected' : 'Reset to pending'} review by "${review.name}"`
        : `Updated review by "${review.name}"`,
    });
    return review;
  }

  @Delete('reviews/:id')
  async deleteReview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const review = await this.home.deleteReview(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'Review',
      entityId: id,
      summary: `Deleted review by "${review.name ?? id}"`,
    });
    return { ok: true };
  }

  // ───────────────────────── companies ─────────────────────────

  @Post('companies')
  async createCompany(@CurrentUser() user: JwtPayload, @Body() dto: CreateCompanyDto) {
    const company = await this.home.createCompany(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'Company',
      entityId: company.id,
      summary: `Added company "${company.name}" to the marquee`,
    });
    return company;
  }

  @Patch('companies/:id')
  async updateCompany(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    const company = await this.home.updateCompany(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'Company',
      entityId: company.id,
      summary: `Updated company "${company.name}"`,
    });
    return company;
  }

  @Delete('companies/:id')
  async deleteCompany(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const company = await this.home.deleteCompany(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'Company',
      entityId: id,
      summary: `Removed company "${company.name ?? id}" from the marquee`,
    });
    return { ok: true };
  }

  // ───────────────────────── social + footer links ─────────────────────────

  @Put('socials')
  @ApiOperation({ summary: 'Create or replace the link for one platform' })
  async upsertSocial(@CurrentUser() user: JwtPayload, @Body() dto: UpsertSocialLinkDto) {
    const link = await this.home.upsertSocialLink(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'upsert',
      entity: 'SocialLink',
      entityId: link.id,
      summary: `Set the ${link.platform} link`,
    });
    return link;
  }

  @Delete('socials/:id')
  async deleteSocial(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const link = await this.home.deleteSocialLink(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'SocialLink',
      entityId: id,
      summary: `Removed the ${link.platform ?? id} link`,
    });
    return { ok: true };
  }

  @Post('footer-links')
  async createFooterLink(@CurrentUser() user: JwtPayload, @Body() dto: CreateFooterLinkDto) {
    const link = await this.home.createFooterLink(dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'create',
      entity: 'FooterLink',
      entityId: link.id,
      summary: `Created footer link "${link.label}" in ${link.section}`,
    });
    return link;
  }

  @Patch('footer-links/:id')
  async updateFooterLink(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFooterLinkDto,
  ) {
    const link = await this.home.updateFooterLink(id, dto);
    await this.audit.record({
      actorId: user.sub,
      action: 'update',
      entity: 'FooterLink',
      entityId: link.id,
      summary: `Updated footer link "${link.label}"`,
    });
    return link;
  }

  @Delete('footer-links/:id')
  async deleteFooterLink(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const link = await this.home.deleteFooterLink(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'FooterLink',
      entityId: id,
      summary: `Deleted footer link "${link.label ?? id}"`,
    });
    return { ok: true };
  }
}
