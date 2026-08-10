import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResourceType, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLearningPathDto,
  CreateResourceCategoryDto,
  CreateResourceDto,
  QueryResourcesDto,
  UpdateLearningPathDto,
  UpdateResourceCategoryDto,
  UpdateResourceDto,
} from './dto/resources.dto';

const resourceSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  url: true,
  thumbnailUrl: true,
  estimatedMinutes: true,
  order: true,
  published: true,
  categoryId: true,
  category: { select: { id: true, slug: true, name: true, icon: true, accent: true } },
} satisfies Prisma.ResourceSelect;

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A resource is either a curated outbound link or a locally-authored sheet, never
   * both and never neither. Postgres can't express that through Prisma's schema, so
   * it is enforced here — the one place every write passes through.
   */
  private assertExactlyOneSource(url?: string | null, body?: string | null, required = true) {
    const hasUrl = Boolean(url && url.trim());
    const hasBody = Boolean(body && body.trim());

    if (hasUrl && hasBody) {
      throw new BadRequestException('A resource can have either a link or a written body, not both');
    }
    if (required && !hasUrl && !hasBody) {
      throw new BadRequestException('A resource needs either a link or a written body');
    }
  }

  /* ── public reads ─────────────────────────────────────────── */

  async categories() {
    const rows = await this.prisma.resourceCategory.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        accent: true,
        _count: { select: { resources: { where: { published: true } } } },
      },
    });
    return rows.map(({ _count, ...rest }) => ({ ...rest, resourceCount: _count.resources }));
  }

  /** Filterable, searchable resource list. Only published rows. */
  async list(query: QueryResourcesDto) {
    const and: Prisma.ResourceWhereInput[] = [{ published: true }];

    if (query.category) and.push({ category: { slug: query.category } });
    if (query.type) and.push({ type: query.type });
    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return this.prisma.resource.findMany({
      where: { AND: and },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      select: resourceSelect,
    });
  }

  /** A locally-authored sheet. Curated links have no body to serve. */
  async bySlug(slug: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { slug },
      select: { ...resourceSelect, body: true, createdAt: true },
    });
    if (!resource || !resource.published) throw new NotFoundException('Resource not found');
    return resource;
  }

  /**
   * Learning paths with per-step completion for the given user.
   *
   * Problem steps are *derived* from the judge (an ACCEPTED submission), never from a
   * stored tick — a path can't claim a problem is done when the judge disagrees.
   * Resource steps use the explicit completion row.
   */
  async paths(userId?: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        accent: true,
        steps: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            label: true,
            resourceId: true,
            problemId: true,
            resource: { select: { slug: true, title: true, type: true, url: true } },
            problem: { select: { id: true, title: true, difficulty: true } },
          },
        },
      },
    });

    if (!userId) {
      return paths.map((path) => ({
        ...path,
        steps: path.steps.map((step) => ({ ...step, completed: false })),
        completedSteps: 0,
      }));
    }

    const stepIds = paths.flatMap((p) => p.steps.map((s) => s.id));
    const problemIds = paths.flatMap((p) => p.steps.map((s) => s.problemId).filter((id): id is string => Boolean(id)));

    const [ticks, solved] = await Promise.all([
      stepIds.length
        ? this.prisma.learningPathStepCompletion.findMany({
            where: { userId, stepId: { in: stepIds } },
            select: { stepId: true },
          })
        : Promise.resolve([]),
      problemIds.length
        ? this.prisma.submission.findMany({
            where: { userId, problemId: { in: problemIds }, status: SubmissionStatus.ACCEPTED },
            select: { problemId: true },
            distinct: ['problemId'],
          })
        : Promise.resolve([]),
    ]);

    const tickedSteps = new Set(ticks.map((t) => t.stepId));
    const solvedProblems = new Set(solved.map((s) => s.problemId));

    return paths.map((path) => {
      const steps = path.steps.map((step) => ({
        ...step,
        completed: step.problemId ? solvedProblems.has(step.problemId) : tickedSteps.has(step.id),
      }));
      return { ...path, steps, completedSteps: steps.filter((s) => s.completed).length };
    });
  }

  /** Ticking applies only to resource steps; problem steps are judged, not self-reported. */
  async setStepCompletion(stepId: string, userId: string, completed: boolean) {
    const step = await this.prisma.learningPathStep.findUnique({
      where: { id: stepId },
      select: { id: true, problemId: true },
    });
    if (!step) throw new NotFoundException('Step not found');
    if (step.problemId) {
      throw new BadRequestException('Problem steps complete themselves when the judge accepts a solution');
    }

    if (completed) {
      await this.prisma.learningPathStepCompletion.upsert({
        where: { userId_stepId: { userId, stepId } },
        update: {},
        create: { userId, stepId },
      });
    } else {
      await this.prisma.learningPathStepCompletion.deleteMany({ where: { userId, stepId } });
    }
    return { stepId, completed };
  }

  /* ── admin ────────────────────────────────────────────────── */

  adminCategories() {
    return this.prisma.resourceCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  }

  adminResources() {
    return this.prisma.resource.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      select: { ...resourceSelect, body: true },
    });
  }

  createCategory(dto: CreateResourceCategoryDto) {
    return this.prisma.resourceCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateResourceCategoryDto) {
    await this.ensureCategory(id);
    return this.prisma.resourceCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.ensureCategory(id);
    // Resources cascade with the category — the schema says so explicitly.
    await this.prisma.resourceCategory.delete({ where: { id } });
    return { id };
  }

  async createResource(dto: CreateResourceDto) {
    this.assertExactlyOneSource(dto.url, dto.body);
    await this.ensureCategory(dto.categoryId);
    return this.prisma.resource.create({ data: dto, select: resourceSelect });
  }

  async updateResource(id: string, dto: UpdateResourceDto) {
    const existing = await this.prisma.resource.findUnique({ where: { id }, select: { url: true, body: true } });
    if (!existing) throw new NotFoundException('Resource not found');

    // Validate the *resulting* row, not just the patch, so clearing one field without
    // supplying the other can't leave a resource with no content at all.
    const nextUrl = dto.url !== undefined ? dto.url : existing.url;
    const nextBody = dto.body !== undefined ? dto.body : existing.body;
    this.assertExactlyOneSource(nextUrl, nextBody);

    if (dto.categoryId) await this.ensureCategory(dto.categoryId);
    return this.prisma.resource.update({ where: { id }, data: dto, select: resourceSelect });
  }

  async deleteResource(id: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Resource not found');
    await this.prisma.resource.delete({ where: { id } });
    return { id };
  }

  adminPaths() {
    return this.prisma.learningPath.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async createPath(dto: CreateLearningPathDto) {
    const { steps, ...path } = dto;
    return this.prisma.learningPath.create({
      data: { ...path, ...(steps ? { steps: { create: this.buildSteps(steps) } } : {}) },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async updatePath(id: string, dto: UpdateLearningPathDto) {
    const existing = await this.prisma.learningPath.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Learning path not found');

    const { steps, ...path } = dto;
    return this.prisma.learningPath.update({
      where: { id },
      data: {
        ...path,
        // Replacing the whole step list keeps `order` contiguous and unique, which a
        // partial patch could not guarantee.
        ...(steps ? { steps: { deleteMany: {}, create: this.buildSteps(steps) } } : {}),
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async deletePath(id: string) {
    const existing = await this.prisma.learningPath.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Learning path not found');
    await this.prisma.learningPath.delete({ where: { id } });
    return { id };
  }

  private buildSteps(steps: NonNullable<CreateLearningPathDto['steps']>) {
    return steps.map((step, index) => {
      const hasResource = Boolean(step.resourceId);
      const hasProblem = Boolean(step.problemId);
      if (hasResource === hasProblem) {
        throw new BadRequestException('Each step must point at exactly one of a resource or a problem');
      }
      return {
        order: index,
        label: step.label ?? null,
        resourceId: step.resourceId ?? null,
        problemId: step.problemId ?? null,
      };
    });
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.resourceCategory.findUnique({ where: { id }, select: { id: true } });
    if (!category) throw new NotFoundException('Category not found');
  }
}

export { ResourceType };
