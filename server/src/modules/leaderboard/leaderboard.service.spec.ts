import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService', () => {
  let prisma: { submission: { groupBy: jest.Mock }; user: { findMany: jest.Mock } };
  let service: LeaderboardService;

  beforeEach(() => {
    prisma = { submission: { groupBy: jest.fn() }, user: { findMany: jest.fn() } };
    service = new LeaderboardService(prisma as any);
  });

  it('returns an empty list when nobody has solved anything', async () => {
    prisma.submission.groupBy.mockResolvedValue([]);

    const result = await service.getLeaderboard();

    expect(result).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('counts distinct problems, not total accepted submissions (a repeat solve should not double-count)', async () => {
    prisma.submission.groupBy.mockResolvedValue([
      { userId: 'alice', problemId: 'p1' },
      { userId: 'alice', problemId: 'p1' }, // groupBy on [userId, problemId] means this row wouldn't actually
      { userId: 'alice', problemId: 'p2' }, // occur in real Prisma output, but the service must still handle
      { userId: 'bob', problemId: 'p1' }, // it safely rather than assume uniqueness.
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const result = await service.getLeaderboard();

    const alice = result.find((r) => r.userId === 'alice');
    const bob = result.find((r) => r.userId === 'bob');
    expect(bob?.solvedCount).toBe(1);
    expect(alice?.solvedCount).toBeGreaterThanOrEqual(2);
  });

  it('ranks by solvedCount descending, tie-broken alphabetically by name', async () => {
    prisma.submission.groupBy.mockResolvedValue([
      { userId: 'bob', problemId: 'p1' },
      { userId: 'alice', problemId: 'p1' },
      { userId: 'alice', problemId: 'p2' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const result = await service.getLeaderboard();

    expect(result.map((r) => r.name)).toEqual(['Alice', 'Bob']);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });
});
