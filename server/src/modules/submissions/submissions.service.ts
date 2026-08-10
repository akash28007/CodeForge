import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { QuerySubmissionsDto } from './dto/query-submissions.dto';
import { JwtPayload } from '../../types/jwt-payload.interface';
import { RunSampleResult } from './judge.processor';
import { createRedisConnection } from '../../queue/redis-connection.util';

const summarySelect = Prisma.validator<Prisma.SubmissionSelect>()({
  id: true,
  problemId: true,
  language: true,
  status: true,
  runtime: true,
  memory: true,
  errorMessage: true,
  passedCount: true,
  totalCount: true,
  submittedAt: true,
  problem: { select: { title: true, difficulty: true } },
});

const detailSelect = Prisma.validator<Prisma.SubmissionSelect>()({
  ...summarySelect,
  userId: true,
  code: true,
});

type SubmissionDetail = Prisma.SubmissionGetPayload<{ select: typeof detailSelect }>;

// Generous outer safety net covering compile time + the problem's own time limit + overhead.
// The sandbox's own per-run timeout (enforced in DockerExecutorService) is what actually matters.
const RUN_SAMPLE_WAIT_BUFFER_MS = 15_000;

@Injectable()
export class SubmissionsService implements OnModuleDestroy {
  private readonly queueEvents: QueueEvents;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('judge') private readonly judgeQueue: Queue,
    config: ConfigService,
  ) {
    this.queueEvents = new QueueEvents('judge', { connection: createRedisConnection(config) });
  }

  async onModuleDestroy() {
    await this.queueEvents.close();
  }

  async submit(dto: SubmitCodeDto, userId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: dto.problemId },
      select: { id: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: dto.problemId,
        language: dto.language ?? 'cpp',
        code: dto.code,
        status: 'PENDING',
      },
      select: summarySelect,
    });

    await this.judgeQueue.add('judge-submission', { submissionId: submission.id });

    return submission;
  }

  async runSample(dto: SubmitCodeDto): Promise<RunSampleResult> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: dto.problemId },
      select: { id: true, timeLimit: true, memoryLimit: true, sampleInput: true, sampleOutput: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const job = await this.judgeQueue.add('run-sample', {
      code: dto.code,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      sampleInput: problem.sampleInput,
      sampleOutput: problem.sampleOutput,
    });

    try {
      return (await job.waitUntilFinished(
        this.queueEvents,
        problem.timeLimit + RUN_SAMPLE_WAIT_BUFFER_MS,
      )) as RunSampleResult;
    } catch {
      throw new InternalServerErrorException('Sample run failed — please try again');
    }
  }

  async findOne(id: string, requester: JwtPayload) {
    const submission = await this.prisma.submission.findUnique({ where: { id }, select: detailSelect });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.userId !== requester.sub && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have access to this submission');
    }
    return this.toDetailView(submission);
  }

  /** The user's own history, filterable by verdict, difficulty, language and date range. */
  async findAllForCurrentUser(userId: string, query: QuerySubmissionsDto = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.SubmissionWhereInput = {
      userId,
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.language?.length ? { language: { in: query.language } } : {}),
      ...(query.difficulty?.length ? { problem: { difficulty: { in: query.difficulty } } } : {}),
      ...(query.from || query.to
        ? {
            submittedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              // `to` is inclusive of the whole day the user picked.
              ...(query.to ? { lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const orderBy: Prisma.SubmissionOrderByWithRelationInput =
      query.sort === 'runtime' ? { runtime: 'asc' } : { submittedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        select: summarySelect,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** Distinct languages this user has submitted in — powers the filter dropdown. */
  async languagesUsed(userId: string) {
    const rows = await this.prisma.submission.findMany({
      where: { userId },
      select: { language: true },
      distinct: ['language'],
    });
    return rows.map((r) => r.language);
  }

  private toDetailView(submission: SubmissionDetail) {
    const { userId: _userId, ...rest } = submission;
    return rest;
  }
}
