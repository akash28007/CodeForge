import { NotFoundException } from '@nestjs/common';
import { ProblemsService } from './problems.service';

describe('ProblemsService', () => {
  let prisma: {
    problem: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    tag: { upsert: jest.Mock };
  };
  let service: ProblemsService;

  beforeEach(() => {
    prisma = {
      problem: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tag: { upsert: jest.fn() },
    };
    service = new ProblemsService(prisma as any);
  });

  describe('hidden test case protection', () => {
    it('never asks Prisma to select testCases when listing problems', async () => {
      await service.findAll();

      const selectArg = prisma.problem.findMany.mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('testCases');
    });

    it('never asks Prisma to select testCases when fetching one problem', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p1', tags: [] });

      await service.findOne('p1');

      const selectArg = prisma.problem.findUnique.mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('testCases');
    });
  });

  it('findOne throws 404 for a missing problem', async () => {
    prisma.problem.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create upserts tag names into ids and links them via the join table', async () => {
    prisma.tag.upsert.mockImplementation(({ where }) => Promise.resolve({ id: `tag-${where.name}`, name: where.name }));
    prisma.problem.create.mockResolvedValue({ id: 'p1', tags: [], testCases: [] });

    await service.create(
      {
        title: 't',
        difficulty: 'EASY',
        statement: 's',
        constraints: 'c',
        inputFormat: 'i',
        outputFormat: 'o',
        sampleInput: 'si',
        sampleOutput: 'so',
        timeLimit: 1000,
        memoryLimit: 128,
        tags: ['arrays', 'dp'],
        testCases: [{ input: 'x', expectedOutput: 'y' }],
      },
      'admin-id',
    );

    const createData = prisma.problem.create.mock.calls[0][0].data;
    expect(createData.tags.create).toEqual([{ tagId: 'tag-arrays' }, { tagId: 'tag-dp' }]);
    expect(createData.createdById).toBe('admin-id');
  });

  it('update 404s before touching Prisma.update when the problem does not exist', async () => {
    prisma.problem.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', { title: 'new' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.problem.update).not.toHaveBeenCalled();
  });

  it('update leaves testCases and tags alone when not provided in the DTO', async () => {
    prisma.problem.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.problem.update.mockResolvedValue({ id: 'p1', tags: [], testCases: [] });

    await service.update('p1', { title: 'new title' });

    const updateData = prisma.problem.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('testCases');
    expect(updateData).not.toHaveProperty('tags');
  });

  it('remove 404s before deleting when the problem does not exist', async () => {
    prisma.problem.findUnique.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.problem.delete).not.toHaveBeenCalled();
  });
});
