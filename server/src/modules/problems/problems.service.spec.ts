import { NotFoundException } from '@nestjs/common';
import { ProblemsService } from './problems.service';

describe('ProblemsService', () => {
  let prisma: {
    problem: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    submission: { groupBy: jest.Mock; findMany: jest.Mock };
    bookmark: { findMany: jest.Mock; count: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
    problemTag: { groupBy: jest.Mock };
    tag: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let service: ProblemsService;

  beforeEach(() => {
    prisma = {
      problem: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      submission: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]) },
      bookmark: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      problemTag: { groupBy: jest.fn().mockResolvedValue([]) },
      tag: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ProblemsService(prisma as any);
  });

  describe('hidden test case protection', () => {
    it('never asks Prisma to select testCases when listing problems', async () => {
      await service.findAll({});

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

  describe('findAll', () => {
    it('paginates in the database for non-computed sorts', async () => {
      await service.findAll({ page: 3, pageSize: 10, sort: 'title' });

      const args = prisma.problem.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });

    it('searches titles case-insensitively', async () => {
      await service.findAll({ search: '  Sum ' });

      const where = prisma.problem.findMany.mock.calls[0][0].where;
      expect(where.AND).toContainEqual({ title: { contains: 'Sum', mode: 'insensitive' } });
    });

    it('requires a problem to carry every selected topic', async () => {
      await service.findAll({ tags: ['arrays', 'hashing'] });

      const where = prisma.problem.findMany.mock.calls[0][0].where;
      expect(where.AND).toContainEqual({
        AND: [{ tags: { some: { tag: { name: 'arrays' } } } }, { tags: { some: { tag: { name: 'hashing' } } } }],
      });
    });

    /*
     * These filters are per-user, but an anonymous caller must still have them
     * *applied* rather than dropped. Silently ignoring the clause answered "which
     * problems have I bookmarked?" with the entire catalogue — a filter that widens
     * the result set is the more surprising failure, and this is the regression guard.
     */
    it('applies solved/bookmarked filters as empty for anonymous callers, never ignoring them', async () => {
      for (const status of [['solved'], ['bookmarked']] as const) {
        prisma.problem.findMany.mockClear();
        await service.findAll({ status: [...status] });

        const where = prisma.problem.findMany.mock.calls[0][0].where;
        const serialised = JSON.stringify(where);
        // No per-user clause can be built without a user...
        expect(serialised).not.toContain('userId');
        // ...but the filter still has to constrain the result to nothing.
        expect(serialised).toContain('"in":[]');
      }
    });

    it('treats everything as unsolved for an anonymous caller', async () => {
      await service.findAll({ status: ['unsolved'] });

      const where = prisma.problem.findMany.mock.calls[0][0].where;
      // A match-all clause, not an impossible one — nobody has solved anything.
      expect(JSON.stringify(where)).not.toContain('"in":[]');
    });

    it('still builds a real per-user clause when a caller is signed in', async () => {
      await service.findAll({ status: ['bookmarked'] }, 'user-1');

      const where = prisma.problem.findMany.mock.calls[0][0].where;
      expect(JSON.stringify(where)).toContain('user-1');
    });

    it('computes the acceptance rate from real submission tallies', async () => {
      prisma.problem.findMany.mockResolvedValue([{ id: 'p1', title: 'A', difficulty: 'EASY', tags: [] }]);
      prisma.submission.groupBy.mockResolvedValue([
        { problemId: 'p1', status: 'ACCEPTED', _count: { _all: 3 } },
        { problemId: 'p1', status: 'WRONG_ANSWER', _count: { _all: 1 } },
      ]);

      const result = await service.findAll({});

      expect(result.items[0].acceptance).toBe(75);
      expect(result.items[0].totalSubmissions).toBe(4);
    });

    it('reports solved and bookmarked flags for a signed-in caller', async () => {
      prisma.problem.findMany.mockResolvedValue([
        { id: 'p1', title: 'A', difficulty: 'EASY', tags: [] },
        { id: 'p2', title: 'B', difficulty: 'EASY', tags: [] },
      ]);
      prisma.submission.findMany.mockResolvedValue([{ problemId: 'p1' }]);
      prisma.bookmark.findMany.mockResolvedValue([{ problemId: 'p2' }]);

      const result = await service.findAll({}, 'user-1');

      expect(result.items.find((i) => i.id === 'p1')).toMatchObject({ solved: true, bookmarked: false });
      expect(result.items.find((i) => i.id === 'p2')).toMatchObject({ solved: false, bookmarked: true });
    });

    it('does not query per-user tables when nobody is signed in', async () => {
      prisma.problem.findMany.mockResolvedValue([{ id: 'p1', title: 'A', difficulty: 'EASY', tags: [] }]);

      await service.findAll({});

      expect(prisma.submission.findMany).not.toHaveBeenCalled();
      expect(prisma.bookmark.findMany).not.toHaveBeenCalled();
    });
  });

  describe('bookmarks', () => {
    it('upserts so bookmarking twice cannot create a duplicate', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p1' });

      await service.setBookmark('p1', 'user-1', true);

      expect(prisma.bookmark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId_problemId: { userId: 'user-1', problemId: 'p1' } } }),
      );
    });

    it('404s for a problem that does not exist instead of creating an orphan row', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);

      await expect(service.setBookmark('missing', 'user-1', true)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.bookmark.upsert).not.toHaveBeenCalled();
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
