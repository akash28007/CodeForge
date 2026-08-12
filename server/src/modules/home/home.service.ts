import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus, SocialPlatform, SubmissionStatus } from '@prisma/client';
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
  SubmitReviewDto,
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

export const reviewSelect = {
  id: true,
  name: true,
  designation: true,
  avatarUrl: true,
  rating: true,
  body: true,
  order: true,
  published: true,
  status: true,
  createdAt: true,
  authorId: true,
  // Read through the relation rather than copying the picture onto the review, so a
  // user who changes their profile photo changes it here too.
  author: { select: { id: true, avatarUrl: true, username: true } },
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
      // A review is public only when it is *both* approved and published — flipping the
      // publish toggle can never surface something moderation rejected.
      this.prisma.review.findMany({
        where: { published: true, status: ReviewStatus.APPROVED },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
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

    return {
      content,
      courses,
      reviews: await this.decorateReviews(reviews),
      companies,
      socials,
      footerLinks,
      stats: await this.platformStats(),
      topics: await this.topicCounts(),
    };
  }

  /**
   * Live counters for the homepage strip.
   *
   * Counted on every read rather than cached or stored: these are cheap aggregate
   * queries, and a stored number is a number that will eventually be wrong. Nothing
   * here is rounded up or padded — if the catalogue has 111 problems the page says 111.
   *
   * Every figure describes the **catalogue**, never user activity. Submission counts
   * were removed deliberately: on a site with few accounts a platform-wide
   * "solutions judged / accepted" pair is effectively one person's submission history
   * published to anonymous visitors, and it is not a number a visitor benefits from
   * either. If a usage metric is ever wanted here it needs to be something a single
   * user cannot be reverse-engineered from.
   */
  private async platformStats() {
    const [problems, testCases, topics, resources] = await Promise.all([
      this.prisma.problem.count(),
      this.prisma.testCase.count(),
      this.prisma.tag.count({ where: { problems: { some: {} } } }),
      this.prisma.resource.count({ where: { published: true } }),
    ]);
    return { problems, testCases, topics, resources };
  }

  /**
   * Topics with at least one problem, most-populated first.
   *
   * Tags with no problems are excluded — an empty topic tile links to an empty list,
   * which is worse than not showing the topic at all.
   */
  private async topicCounts() {
    const tags = await this.prisma.tag.findMany({
      where: { problems: { some: {} } },
      select: { name: true, _count: { select: { problems: true } } },
    });
    return tags
      .map((t) => ({ name: t.name, count: t._count.problems }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  /**
   * Resolves the two review fields that are derived rather than stored.
   *
   * `avatarUrl` falls back to the author's live profile picture, and `verified` means
   * "this account has actually solved something here" — computed from ACCEPTED
   * submissions, never self-declared, so the chip cannot be claimed by typing it into a
   * form. Both are resolved in one extra query for the whole batch, not per row.
   */
  private async decorateReviews<
    T extends {
      authorId: string | null;
      avatarUrl: string | null;
      author: { avatarUrl: string | null; username: string | null } | null;
    },
  >(rows: T[]) {
    const authorIds = [...new Set(rows.map((r) => r.authorId).filter((id): id is string => id !== null))];

    const verified = new Set<string>();
    if (authorIds.length > 0) {
      const solvers = await this.prisma.submission.groupBy({
        by: ['userId'],
        where: { userId: { in: authorIds }, status: SubmissionStatus.ACCEPTED },
      });
      solvers.forEach((s) => verified.add(s.userId));
    }

    return rows.map(({ author, ...review }) => ({
      ...review,
      avatarUrl: author?.avatarUrl ?? review.avatarUrl,
      verified: review.authorId !== null && verified.has(review.authorId),
      // Lets the card link to the writer's public profile. Null for admin-authored rows,
      // which have no account behind them and therefore no profile to open.
      authorUsername: author?.username ?? null,
    }));
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
      // Pending submissions first — the moderation queue is the thing an admin opening
      // this screen most likely needs to act on.
      this.prisma.review.findMany({
        orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
        select: reviewSelect,
      }),
      this.prisma.company.findMany({ orderBy: { order: 'asc' }, select: companySelect }),
      this.prisma.socialLink.findMany({ orderBy: { order: 'asc' }, select: socialSelect }),
      this.prisma.footerLink.findMany({
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
        select: footerLinkSelect,
      }),
    ]);

    return {
      content,
      courses,
      reviews: await this.decorateReviews(reviews),
      companies,
      socials,
      footerLinks,
    };
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

  async createReview(dto: CreateReviewDto) {
    const review = await this.prisma.review.create({ data: dto, select: reviewSelect });
    return (await this.decorateReviews([review]))[0];
  }

  async updateReview(id: string, dto: UpdateReviewDto) {
    await this.assertExists('review', id, 'Review');
    const review = await this.prisma.review.update({ where: { id }, data: dto, select: reviewSelect });
    return (await this.decorateReviews([review]))[0];
  }

  // ───────────────────────── user-submitted reviews ─────────────────────────

  /**
   * Submits a review for moderation.
   *
   * The author's display name and picture come from their account rather than the form:
   * a review is attributed to a real profile on this site, so letting the submitter type
   * an arbitrary name would make the attribution meaningless. Only the designation,
   * rating and body are theirs to write.
   */
  async submitReview(userId: string, dto: SubmitReviewDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.review.findFirst({
      where: { authorId: userId, status: { in: [ReviewStatus.PENDING, ReviewStatus.APPROVED] } },
      select: { id: true, status: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === ReviewStatus.PENDING
          ? 'You already have a review awaiting approval'
          : 'You have already published a review',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        name: user.name,
        designation: dto.designation ?? null,
        rating: dto.rating,
        body: dto.body,
        authorId: userId,
        // Both flags matter: a submission is invisible until an admin approves it *and*
        // the row is published.
        status: ReviewStatus.PENDING,
        published: false,
      },
      select: reviewSelect,
    });
    return (await this.decorateReviews([review]))[0];
  }

  /** The caller's own review, whatever state it is in — so the UI can show progress. */
  async myReview(userId: string) {
    const review = await this.prisma.review.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: reviewSelect,
    });
    if (!review) return null;
    return (await this.decorateReviews([review]))[0];
  }

  /** Edits are allowed only while a review is still waiting to be looked at. */
  async updateMyReview(userId: string, dto: SubmitReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('You have not written a review yet');
    if (existing.status !== ReviewStatus.PENDING) {
      throw new ConflictException('A review that has already been reviewed can no longer be edited');
    }

    const review = await this.prisma.review.update({
      where: { id: existing.id },
      data: { designation: dto.designation ?? null, rating: dto.rating, body: dto.body },
      select: reviewSelect,
    });
    return (await this.decorateReviews([review]))[0];
  }

  /** Withdrawing a pending submission. An approved one has to go through an admin. */
  async withdrawMyReview(userId: string) {
    const existing = await this.prisma.review.findFirst({
      where: { authorId: userId, status: ReviewStatus.PENDING },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('You have no pending review to withdraw');
    await this.prisma.review.delete({ where: { id: existing.id } });
    return { withdrawn: true };
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
