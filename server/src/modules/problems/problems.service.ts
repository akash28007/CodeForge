import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';

const summarySelect = Prisma.validator<Prisma.ProblemSelect>()({
  id: true,
  title: true,
  difficulty: true,
  timeLimit: true,
  memoryLimit: true,
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
  tags: { select: { tag: { select: { name: true } } } },
});

const adminInclude = Prisma.validator<Prisma.ProblemInclude>()({
  testCases: true,
  tags: { include: { tag: true } },
});

type ProblemSummary = Prisma.ProblemGetPayload<{ select: typeof summarySelect }>;
type ProblemDetail = Prisma.ProblemGetPayload<{ select: typeof detailSelect }>;
type ProblemWithRelations = Prisma.ProblemGetPayload<{ include: typeof adminInclude }>;

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const problems = await this.prisma.problem.findMany({ select: summarySelect });
    return problems.map((p) => this.toSummaryView(p));
  }

  async findOne(id: string) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, select: detailSelect });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }
    return this.toDetailView(problem);
  }

  async create(dto: CreateProblemDto, createdById: string) {
    const tagIds = await this.resolveTagIds(dto.tags ?? []);

    const problem = await this.prisma.problem.create({
      data: {
        title: dto.title,
        difficulty: dto.difficulty,
        statement: dto.statement,
        constraints: dto.constraints,
        inputFormat: dto.inputFormat,
        outputFormat: dto.outputFormat,
        sampleInput: dto.sampleInput,
        sampleOutput: dto.sampleOutput,
        timeLimit: dto.timeLimit,
        memoryLimit: dto.memoryLimit,
        createdById,
        testCases: {
          create: dto.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? true,
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
            create: dto.testCases.map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden ?? true,
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

  private toSummaryView(problem: ProblemSummary) {
    const { tags, ...rest } = problem;
    return { ...rest, tags: tags.map((t) => t.tag.name) };
  }

  private toDetailView(problem: ProblemDetail) {
    const { tags, ...rest } = problem;
    return { ...rest, tags: tags.map((t) => t.tag.name) };
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
