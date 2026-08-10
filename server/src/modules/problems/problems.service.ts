import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { QueryProblemsDto } from './dto/query-problems.dto';

const summarySelect = Prisma.validator<Prisma.ProblemSelect>()({
  id: true,
  title: true,
  difficulty: true,
  timeLimit: true,
  memoryLimit: true,
  createdAt: true,
  tags: { select: { tag: { select: { name: true } } } },
});

const detailSelect = Prisma.validator<Prisma.ProblemSelect>()({
  id: true,
  title: true,
  difficulty: true,
  statement: true,
  constraints: true,
  inputFormat: true,
  outputFormat: true,
  sampleInput: true,
  sampleOutput: true,
  timeLimit: true,
  memoryLimit: true,
  createdAt: true,
  // Selected only so the response can report *whether* an editorial exists; the text is
  // stripped in findOne and served solely by the gated `editorial()` route.
  editorial: true,
  tags: { select: { tag: { select: { name: true } } } },
});

const adminInclude = Prisma.validator<Prisma.ProblemInclude>()({
  testCases: { orderBy: { order: 'asc' } },
  tags: { include: { tag: true } },
});

type ProblemSummary = Prisma.ProblemGetPayload<{ select: typeof summarySelect }>;
type ProblemWithRelations = Prisma.ProblemGetPayload<{ include: typeof adminInclude }>;

/** Per-problem submission tallies, used for the acceptance rate and "most solved" sort. */
interface SubmissionStats {
  total: number;
  accepted: number;
}

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public list endpoint. `userId` is optional — when present the response also carries
   * that user's solved/bookmarked flags, and the solved/unsolved/bookmarked filters work.
   *
   * Note the security property inherited from Milestone 5: `summarySelect` never includes
   * `testCases`, so hidden test data cannot leak here even accidentally.
   */
  async findAll(query: QueryProblemsDto, userId?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort = query.sort ?? 'recent';

    const where = await this.buildWhere(query, userId);

    // "acceptance" and "solves" rank by data Prisma can't ORDER BY directly (it lives in
    // the Submission table), so those two sort in memory over the filtered set; the rest
    // sort and paginate in the database.
    const needsComputedSort = sort === 'acceptance' || sort === 'solves';

    const total = await this.prisma.problem.count({ where });

    const problems = await this.prisma.problem.findMany({
      where,
      select: summarySelect,
      orderBy: needsComputedSort ? undefined : this.buildOrderBy(query),
      skip: needsComputedSort ? undefined : (page - 1) * pageSize,
      take: needsComputedSort ? undefined : pageSize,
    });

    const ids = problems.map((p) => p.id);
    const [stats, solvedIds, bookmarkedIds] = await Promise.all([
      this.submissionStats(ids),
      this.solvedProblemIds(userId, ids),
      this.bookmarkedProblemIds(userId, ids),
    ]);

    let items = problems.map((problem) =>
      this.toListView(problem, stats.get(problem.id), solvedIds.has(problem.id), bookmarkedIds.has(problem.id)),
    );

    if (needsComputedSort) {
      const direction = (query.order ?? 'desc') === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const left = sort === 'acceptance' ? a.acceptance : a.totalAccepted;
        const right = sort === 'acceptance' ? b.acceptance : b.totalAccepted;
        if (left === right) return a.title.localeCompare(b.title);
        return (left - right) * direction;
      });
      items = items.slice((page - 1) * pageSize, page * pageSize);
    }

    return { items, total, page, pageSize };
  }

  /**
   * Real counts for the sidebar facets. Every count respects the *other* active filters
   * so the numbers stay truthful as the user narrows down (guide 4.1).
   */
  async facets(query: QueryProblemsDto, userId?: string) {
    const baseWhere = await this.buildWhere({ ...query, tags: undefined, difficulty: undefined, status: undefined }, userId);

    const [tagRows, difficultyRows, totalProblems] = await Promise.all([
      this.prisma.problemTag.groupBy({
        by: ['tagId'],
        where: { problem: baseWhere },
        _count: { problemId: true },
      }),
      this.prisma.problem.groupBy({
        by: ['difficulty'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.problem.count({ where: baseWhere }),
    ]);

    const tagNames = await this.prisma.tag.findMany({
      where: { id: { in: tagRows.map((t) => t.tagId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(tagNames.map((t) => [t.id, t.name]));

    const solvedIds = await this.solvedProblemIds(userId);
    const bookmarkedCount = userId ? await this.prisma.bookmark.count({ where: { userId } }) : 0;

    // How many problems in the current base set the user has solved.
    let solvedCount = 0;
    if (userId && solvedIds.size > 0) {
      solvedCount = await this.prisma.problem.count({
        where: { AND: [baseWhere, { id: { in: [...solvedIds] } }] },
      });
    }

    return {
      tags: tagRows
        .map((row) => ({ name: nameById.get(row.tagId) ?? '', count: row._count.problemId }))
        .filter((t) => t.name && t.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      difficulty: Object.values(Difficulty).map((value) => ({
        value,
        count: difficultyRows.find((d) => d.difficulty === value)?._count ?? 0,
      })),
      status: {
        solved: solvedCount,
        unsolved: totalProblems - solvedCount,
        bookmarked: bookmarkedCount,
      },
      total: totalProblems,
    };
  }

  async findOne(id: string, userId?: string, isAdmin = false) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, select: detailSelect });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const [stats, solvedIds, bookmarkedIds] = await Promise.all([
      this.submissionStats([id]),
      this.solvedProblemIds(userId, [id]),
      this.bookmarkedProblemIds(userId, [id]),
    ]);

    const tally = stats.get(id);
    const { tags, editorial, ...rest } = problem;
    return {
      ...rest,
      tags: tags.map((t) => t.tag.name),
      acceptance: this.acceptanceRate(tally),
      totalSubmissions: tally?.total ?? 0,
      solved: solvedIds.has(id),
      bookmarked: bookmarkedIds.has(id),
      // Only whether one exists — the text itself comes from the gated route, so that
      // opening the editorial is a deliberate act we can record.
      hasEditorial: Boolean(editorial),
      // Admins get the text here so the edit form can prefill it. Deliberately not routed
      // through the gated endpoint, which would log the author as having "read" it.
      ...(isAdmin ? { editorial } : {}),
    };
  }

  /**
   * Returns the editorial and records that this user read it. The write is what makes
   * the "solved without help" XP bonus checkable later, so it happens before the text
   * is handed over, not after.
   */
  async editorial(problemId: string, userId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { editorial: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }
    if (!problem.editorial) {
      return { editorial: null, viewed: false };
    }

    await this.prisma.editorialView.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: {},
      create: { userId, problemId },
    });

    return { editorial: problem.editorial, viewed: true };
  }

  /** This user's submissions for one problem, newest first (guide 5.1 Submissions tab). */
  async submissionsForProblem(problemId: string, userId: string) {
    await this.ensureExists(problemId);
    return this.prisma.submission.findMany({
      where: { problemId, userId },
      select: {
        id: true,
        status: true,
        language: true,
        runtime: true,
        memory: true,
        passedCount: true,
        totalCount: true,
        errorMessage: true,
        code: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });
  }

  async create(dto: CreateProblemDto, createdById: string) {
    const tagIds = await this.resolveTagIds(dto.tags ?? []);

    const problem = await this.prisma.problem.create({
      data: {
        title: dto.title,
        difficulty: dto.difficulty,
        statement: dto.statement,
        editorial: dto.editorial,
        constraints: dto.constraints,
        inputFormat: dto.inputFormat,
        outputFormat: dto.outputFormat,
        sampleInput: dto.sampleInput,
        sampleOutput: dto.sampleOutput,
        timeLimit: dto.timeLimit,
        memoryLimit: dto.memoryLimit,
        createdById,
        testCases: {
          create: dto.testCases.map((tc, index) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? true,
            order: index,
          })),
        },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: adminInclude,
    });

    return this.toAdminView(problem);
  }

  async update(id: string, dto: UpdateProblemDto) {
    await this.ensureExists(id);

    const tagIds = dto.tags ? await this.resolveTagIds(dto.tags) : undefined;

    const problem = await this.prisma.problem.update({
      where: { id },
      data: {
        title: dto.title,
        difficulty: dto.difficulty,
        statement: dto.statement,
        editorial: dto.editorial,
        constraints: dto.constraints,
        inputFormat: dto.inputFormat,
        outputFormat: dto.outputFormat,
        sampleInput: dto.sampleInput,
        sampleOutput: dto.sampleOutput,
        timeLimit: dto.timeLimit,
        memoryLimit: dto.memoryLimit,
        ...(dto.testCases && {
          testCases: {
            deleteMany: {},
            create: dto.testCases.map((tc, index) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden ?? true,
              order: index,
            })),
          },
        }),
        ...(tagIds && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: adminInclude,
    });

    return this.toAdminView(problem);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.problem.delete({ where: { id } });
    return { id };
  }

  /* ── bookmarks ─────────────────────────────────────────────── */

  async setBookmark(problemId: string, userId: string, bookmarked: boolean) {
    await this.ensureExists(problemId);

    if (bookmarked) {
      await this.prisma.bookmark.upsert({
        where: { userId_problemId: { userId, problemId } },
        update: {},
        create: { userId, problemId },
      });
    } else {
      await this.prisma.bookmark.deleteMany({ where: { userId, problemId } });
    }

    return { problemId, bookmarked };
  }

  /* ── internals ─────────────────────────────────────────────── */

  private async buildWhere(query: QueryProblemsDto, userId?: string): Promise<Prisma.ProblemWhereInput> {
    const and: Prisma.ProblemWhereInput[] = [];

    if (query.search?.trim()) {
      and.push({ title: { contains: query.search.trim(), mode: 'insensitive' } });
    }

    if (query.tags?.length) {
      // A problem must carry *every* selected topic.
      and.push({ AND: query.tags.map((name) => ({ tags: { some: { tag: { name } } } })) });
    }

    if (query.difficulty?.length) {
      and.push({ difficulty: { in: query.difficulty } });
    }

    if (query.status?.length) {
      const statusOr: Prisma.ProblemWhereInput[] = [];

      if (userId) {
        const solvedFilter = { submissions: { some: { userId, status: SubmissionStatus.ACCEPTED } } };
        if (query.status.includes('solved')) statusOr.push(solvedFilter);
        if (query.status.includes('unsolved')) statusOr.push({ NOT: solvedFilter });
        if (query.status.includes('bookmarked')) statusOr.push({ bookmarks: { some: { userId } } });
      } else {
        /*
         * Signed out, these filters are still *applied*, not ignored. Dropping the
         * clause would answer "which problems have I bookmarked?" with the entire
         * catalogue, and a filter that widens the result set is the more surprising
         * failure. With no user: nothing is solved and nothing is bookmarked, so
         * those match nothing — and everything is therefore unsolved.
         */
        if (query.status.includes('unsolved')) statusOr.push({});
        if (query.status.includes('solved') || query.status.includes('bookmarked')) {
          // Only reached when `unsolved` was not also requested, in which case the
          // empty-set clause below is redundant but harmless.
          statusOr.push({ id: { in: [] } });
        }
      }

      if (statusOr.length) and.push({ OR: statusOr });
    }

    return and.length ? { AND: and } : {};
  }

  private buildOrderBy(query: QueryProblemsDto): Prisma.ProblemOrderByWithRelationInput[] {
    const order = query.order ?? (query.sort === 'title' ? 'asc' : 'desc');
    switch (query.sort) {
      case 'title':
        return [{ title: order }];
      case 'difficulty':
        return [{ difficulty: order }, { title: 'asc' }];
      case 'recent':
      default:
        // Seeded rows share a createdAt, so title is the stable tiebreaker.
        return [{ createdAt: order }, { title: 'asc' }];
    }
  }

  private async submissionStats(problemIds: string[]): Promise<Map<string, SubmissionStats>> {
    const stats = new Map<string, SubmissionStats>();
    if (problemIds.length === 0) return stats;

    const rows = await this.prisma.submission.groupBy({
      by: ['problemId', 'status'],
      where: { problemId: { in: problemIds } },
      _count: { _all: true },
    });

    for (const row of rows) {
      const entry = stats.get(row.problemId) ?? { total: 0, accepted: 0 };
      entry.total += row._count._all;
      if (row.status === SubmissionStatus.ACCEPTED) entry.accepted += row._count._all;
      stats.set(row.problemId, entry);
    }
    return stats;
  }

  private async solvedProblemIds(userId?: string, problemIds?: string[]): Promise<Set<string>> {
    if (!userId) return new Set();
    const rows = await this.prisma.submission.findMany({
      where: {
        userId,
        status: SubmissionStatus.ACCEPTED,
        ...(problemIds ? { problemId: { in: problemIds } } : {}),
      },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    return new Set(rows.map((r) => r.problemId));
  }

  private async bookmarkedProblemIds(userId?: string, problemIds?: string[]): Promise<Set<string>> {
    if (!userId) return new Set();
    const rows = await this.prisma.bookmark.findMany({
      where: { userId, ...(problemIds ? { problemId: { in: problemIds } } : {}) },
      select: { problemId: true },
    });
    return new Set(rows.map((r) => r.problemId));
  }

  private acceptanceRate(stats?: SubmissionStats): number {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.accepted / stats.total) * 1000) / 10;
  }

  private toListView(problem: ProblemSummary, stats: SubmissionStats | undefined, solved: boolean, bookmarked: boolean) {
    const { tags, ...rest } = problem;
    return {
      ...rest,
      tags: tags.map((t) => t.tag.name),
      acceptance: this.acceptanceRate(stats),
      totalSubmissions: stats?.total ?? 0,
      totalAccepted: stats?.accepted ?? 0,
      solved,
      bookmarked,
    };
  }

  private async ensureExists(id: string) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, select: { id: true } });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }
  }

  private async resolveTagIds(names: string[]): Promise<string[]> {
    const tags = await Promise.all(
      names.map((name) => this.prisma.tag.upsert({ where: { name }, update: {}, create: { name } })),
    );
    return tags.map((tag) => tag.id);
  }

  private toAdminView(problem: ProblemWithRelations) {
    const { tags, testCases, ...rest } = problem;
    return {
      ...rest,
      tags: tags.map((t) => t.tag.name),
      testCases: testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    };
  }
}
