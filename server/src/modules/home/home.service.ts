import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HOME_CONTENT_ID,
  defaultCompanies,
  defaultCourseCards,
  defaultFooterLinks,
  defaultHomeContent,
  defaultReviews,
  defaultSocialLinks,
} from './home-defaults';
import {
  CreateCompanyDto,
  CreateCourseCardDto,
  CreateFooterLinkDto,
  CreateReviewDto,
  SubscribeDto,
  UpdateCompanyDto,
  UpdateCourseCardDto,
  UpdateFooterLinkDto,
  UpdateHomeContentDto,
  UpdateReviewDto,
  UpsertSocialLinkDto,
} from './dto/home.dto';

/** Prisma's error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = 'P2002';

/** CMS collections whose rows can be looked up and deleted by id. */
type DeletableModel = 'courseCard' | 'review' | 'company' | 'socialLink' | 'footerLink';

/**
 * The minimum a deleted row has to expose for the audit-log summary. Each model
 * contributes whichever of these it actually has.
 */
interface AuditableRow {
  id: string;
  title?: string;
  name?: string;
  label?: string;
  platform?: SocialPlatform;
}

const cardSelect = {
  id: true,
  title: true,
  description: true,
  metaLabel: true,
  href: true,
  icon: true,
  accent: true,
  order: true,
  published: true,
} satisfies Prisma.CourseCardSelect;

const reviewSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  rating: true,
  body: true,
  order: true,
  published: true,
} satisfies Prisma.ReviewSelect;

const companySelect = {
  id: true,
  name: true,
  logoUrl: true,
  order: true,
  published: true,
} satisfies Prisma.CompanySelect;

const socialSelect = {
  id: true,
  platform: true,
  url: true,
  order: true,
  published: true,
} satisfies Prisma.SocialLinkSelect;

const footerLinkSelect = {
  id: true,
  section: true,
  label: true,
  href: true,
  order: true,
  published: true,
} satisfies Prisma.FooterLinkSelect;

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── public read ─────────────────────────

  /**
   * Everything the homepage and the site footer need, in one request.
   *
   * Only `published` rows are returned, and they come back already ordered so the
   * client never has to know the ordering rule.
   */
  async publicContent() {
    const content = await this.ensureContent();

    const [courses, reviews, companies, socials, footerLinks] = await Promise.all([
      this.prisma.courseCard.findMany({
        where: { published: true },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        select: cardSelect,
      }),
      this.prisma.review.findMany({
        where: { published: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: reviewSelect,
      }),
      this.prisma.company.findMany({
        where: { published: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: companySelect,
      }),
      this.prisma.socialLink.findMany({
        where: { published: true },
        orderBy: { order: 'asc' },
        select: socialSelect,
      }),
      this.prisma.footerLink.findMany({
        where: { published: true },
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
        select: footerLinkSelect,
      }),
    ]);

    return { content, courses, reviews, companies, socials, footerLinks };
  }

  /**
   * Reads the singleton, installing the placeholder content set on first access.
   *
   * The install races if two visitors arrive simultaneously on a cold database, so
   * it is guarded by the primary key rather than a read-then-write check: whoever
   * loses the race gets a unique violation, treats it as "someone else installed
   * it", and re-reads. The child rows are only created by the winner, so a race
   * cannot produce duplicate course cards.
   */
  private async ensureContent() {
    const existing = await this.prisma.homeContent.findUnique({ where: { id: HOME_CONTENT_ID } });
    if (existing) return existing;

    try {
      const created = await this.prisma.homeContent.create({ data: defaultHomeContent });
      await this.installDefaultLists();
      this.logger.log('Installed default homepage content');
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
        const winner = await this.prisma.homeContent.findUnique({ where: { id: HOME_CONTENT_ID } });
        if (winner) return winner;
      }
      throw error;
    }
  }

  /**
   * Creates the placeholder cards/reviews/companies/links, skipping any collection
   * that already has rows so a partially-populated database is never duplicated.
   * Also used by the seed script.
   */
  async installDefaultLists() {
    const [courses, reviews, companies, socials, footerLinks] = await Promise.all([
      this.prisma.courseCard.count(),
      this.prisma.review.count(),
      this.prisma.company.count(),
      this.prisma.socialLink.count(),
      this.prisma.footerLink.count(),
    ]);

    if (courses === 0) await this.prisma.courseCard.createMany({ data: defaultCourseCards });
    if (reviews === 0) await this.prisma.review.createMany({ data: defaultReviews });
    if (companies === 0) await this.prisma.company.createMany({ data: defaultCompanies });
    if (socials === 0) await this.prisma.socialLink.createMany({ data: defaultSocialLinks });
    if (footerLinks === 0) await this.prisma.footerLink.createMany({ data: defaultFooterLinks });
  }

  /** Installs defaults if missing, without returning anything. Used by the seed. */
  async ensureInstalled() {
    await this.ensureContent();
    await this.installDefaultLists();
  }

  // ───────────────────────── newsletter ─────────────────────────

  /**
   * Records a newsletter signup.
   *
   * Deliberately returns the same response whether the address was new, already
   * subscribed, or resubscribing: a different message per case would turn this
   * public endpoint into an "is this email registered?" oracle.
   */
  async subscribe(dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      // Clearing the timestamp is what makes a resubscribe work.
      update: { unsubscribedAt: null },
      create: { email },
    });

    return { ok: true, message: "Thanks — you're subscribed." };
  }

  /**
   * Marks an address as unsubscribed. Also uniform: an address that was never
   * subscribed gets the same answer as one that was, for the same reason as above.
   */
  async unsubscribe(dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();

    await this.prisma.newsletterSubscriber.updateMany({
      where: { email, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });

    return { ok: true, message: "You've been unsubscribed." };
  }

  /** Admin-only view of the list. */
  async subscribers() {
    const [items, total, active] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: { id: true, email: true, createdAt: true, unsubscribedAt: true },
      }),
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    ]);
    return { items, total, active };
  }

  // ───────────────────────── admin: singleton ─────────────────────────

  /** Admin read — same shape as the public one but including unpublished rows. */
  async adminContent() {
    const content = await this.ensureContent();

    const [courses, reviews, companies, socials, footerLinks] = await Promise.all([
      this.prisma.courseCard.findMany({ orderBy: { order: 'asc' }, select: cardSelect }),
      this.prisma.review.findMany({ orderBy: { order: 'asc' }, select: reviewSelect }),
      this.prisma.company.findMany({ orderBy: { order: 'asc' }, select: companySelect }),
      this.prisma.socialLink.findMany({ orderBy: { order: 'asc' }, select: socialSelect }),
      this.prisma.footerLink.findMany({
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
        select: footerLinkSelect,
      }),
    ]);

    return { content, courses, reviews, companies, socials, footerLinks };
  }

  async updateContent(dto: UpdateHomeContentDto) {
    await this.ensureContent();
    return this.prisma.homeContent.update({ where: { id: HOME_CONTENT_ID }, data: dto });
  }

  // ───────────────────────── admin: course cards ─────────────────────────

  createCourseCard(dto: CreateCourseCardDto) {
    return this.prisma.courseCard.create({ data: dto, select: cardSelect });
  }

  async updateCourseCard(id: string, dto: UpdateCourseCardDto) {
    await this.assertExists('courseCard', id, 'Course card');
    return this.prisma.courseCard.update({ where: { id }, data: dto, select: cardSelect });
  }

  async deleteCourseCard(id: string) {
    const card = await this.assertExists('courseCard', id, 'Course card');
    await this.prisma.courseCard.delete({ where: { id } });
    return card;
  }

  // ───────────────────────── admin: reviews ─────────────────────────

  createReview(dto: CreateReviewDto) {
    return this.prisma.review.create({ data: dto, select: reviewSelect });
  }

  async updateReview(id: string, dto: UpdateReviewDto) {
    await this.assertExists('review', id, 'Review');
    return this.prisma.review.update({ where: { id }, data: dto, select: reviewSelect });
  }

  async deleteReview(id: string) {
    const review = await this.assertExists('review', id, 'Review');
    await this.prisma.review.delete({ where: { id } });
    return review;
  }

  // ───────────────────────── admin: companies ─────────────────────────

  createCompany(dto: CreateCompanyDto) {
    return this.prisma.company.create({ data: dto, select: companySelect });
  }

  async updateCompany(id: string, dto: UpdateCompanyDto) {
    await this.assertExists('company', id, 'Company');
    return this.prisma.company.update({ where: { id }, data: dto, select: companySelect });
  }

  async deleteCompany(id: string) {
    const company = await this.assertExists('company', id, 'Company');
    await this.prisma.company.delete({ where: { id } });
    return company;
  }

  // ───────────────────────── admin: social + footer links ─────────────────────────

  /** One row per platform, so this upserts rather than creating duplicates. */
  upsertSocialLink(dto: UpsertSocialLinkDto) {
    const { platform, ...rest } = dto;
    return this.prisma.socialLink.upsert({
      where: { platform },
      update: rest,
      create: { platform, ...rest },
      select: socialSelect,
    });
  }

  async deleteSocialLink(id: string) {
    const link = await this.assertExists('socialLink', id, 'Social link');
    await this.prisma.socialLink.delete({ where: { id } });
    return link;
  }

  createFooterLink(dto: CreateFooterLinkDto) {
    return this.prisma.footerLink.create({ data: dto, select: footerLinkSelect });
  }

  async updateFooterLink(id: string, dto: UpdateFooterLinkDto) {
    await this.assertExists('footerLink', id, 'Footer link');
    return this.prisma.footerLink.update({ where: { id }, data: dto, select: footerLinkSelect });
  }

  async deleteFooterLink(id: string) {
    const link = await this.assertExists('footerLink', id, 'Footer link');
    await this.prisma.footerLink.delete({ where: { id } });
    return link;
  }

  /**
   * Loads a row by id or throws 404, so `update`/`delete` report a missing record as
   * a clean 404 instead of leaking Prisma's P2025. The returned row is what the
   * controller writes into the audit log, which is why deletes look it up first.
   *
   * Written as an explicit switch rather than indexing `this.prisma[model]`: the
   * dynamic form needs a cast through `unknown` to satisfy Prisma's per-delegate
   * argument types, and losing type safety to save ten lines is a bad trade.
   */
  private async assertExists(model: DeletableModel, id: string, label: string): Promise<AuditableRow> {
    const row = await this.findRow(model, id);
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }

  private findRow(model: DeletableModel, id: string): Promise<AuditableRow | null> {
    switch (model) {
      case 'courseCard':
        return this.prisma.courseCard.findUnique({ where: { id }, select: { id: true, title: true } });
      case 'review':
        return this.prisma.review.findUnique({ where: { id }, select: { id: true, name: true } });
      case 'company':
        return this.prisma.company.findUnique({ where: { id }, select: { id: true, name: true } });
      case 'socialLink':
        return this.prisma.socialLink.findUnique({ where: { id }, select: { id: true, platform: true } });
      case 'footerLink':
        return this.prisma.footerLink.findUnique({ where: { id }, select: { id: true, label: true } });
    }
  }
}
