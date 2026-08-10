import { LeaderboardService } from './leaderboard.service';
import { DEFAULT_LEVELS } from '../gamification/gamification.config';

describe('LeaderboardService', () => {
  let prisma: {
    xpEntry: { groupBy: jest.Mock };
    submission: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let config: { levels: jest.Mock };
  let service: LeaderboardService;

  beforeEach(() => {
    prisma = {
      xpEntry: { groupBy: jest.fn().mockResolvedValue([]) },
      submission: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      // Streaks are queried per displayed row; no activity by default.
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    config = { levels: jest.fn().mockResolvedValue(DEFAULT_LEVELS) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new LeaderboardService(prisma as any, config as any);
  });

  it('returns an empty board when nobody has earned XP', async () => {
    const result = await service.getLeaderboard();

    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('omits users who have submissions but no XP', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([]);
    prisma.submission.findMany.mockResolvedValue([
      { userId: 'alice', problemId: 'p1', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
    ]);

    const result = await service.getLeaderboard();

    expect(result.entries).toEqual([]);
  });

  it('ranks by XP descending', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([
      { userId: 'alice', _sum: { amount: 120 } },
      { userId: 'bob', _sum: { amount: 400 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'alice', name: 'Alice', username: 'alice' },
      { id: 'bob', name: 'Bob', username: 'bob' },
    ]);

    const result = await service.getLeaderboard();

    expect(result.entries.map((e) => e.name)).toEqual(['Bob', 'Alice']);
    expect(result.entries[0].rank).toBe(1);
    expect(result.entries[0].xp).toBe(400);
  });

  it('breaks an XP tie on problems solved, then name', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([
      { userId: 'alice', _sum: { amount: 100 } },
      { userId: 'bob', _sum: { amount: 100 } },
      { userId: 'carol', _sum: { amount: 100 } },
    ]);
    prisma.submission.findMany.mockResolvedValue([
      { userId: 'bob', problemId: 'p1', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
      { userId: 'bob', problemId: 'p2', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'alice', name: 'Alice', username: 'alice' },
      { id: 'bob', name: 'Bob', username: 'bob' },
      { id: 'carol', name: 'Carol', username: 'carol' },
    ]);

    const result = await service.getLeaderboard();

    // Bob leads on solves; Alice precedes Carol alphabetically.
    expect(result.entries.map((e) => e.name)).toEqual(['Bob', 'Alice', 'Carol']);
  });

  it('counts distinct problems, so a repeat solve does not double-count', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([{ userId: 'alice', _sum: { amount: 50 } }]);
    prisma.submission.findMany.mockResolvedValue([
      { userId: 'alice', problemId: 'p1', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
      { userId: 'alice', problemId: 'p1', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
      { userId: 'alice', problemId: 'p2', status: 'ACCEPTED', problem: { difficulty: 'HARD' } },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'alice', name: 'Alice', username: 'alice' }]);

    const result = await service.getLeaderboard();

    expect(result.entries[0].solvedCount).toBe(2);
    expect(result.entries[0].hardSolved).toBe(1);
  });

  it('computes acceptance from all submissions, not just accepted ones', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([{ userId: 'alice', _sum: { amount: 50 } }]);
    prisma.submission.findMany.mockResolvedValue([
      { userId: 'alice', problemId: 'p1', status: 'ACCEPTED', problem: { difficulty: 'EASY' } },
      { userId: 'alice', problemId: 'p1', status: 'WRONG_ANSWER', problem: { difficulty: 'EASY' } },
      { userId: 'alice', problemId: 'p2', status: 'WRONG_ANSWER', problem: { difficulty: 'EASY' } },
      { userId: 'alice', problemId: 'p2', status: 'WRONG_ANSWER', problem: { difficulty: 'EASY' } },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'alice', name: 'Alice', username: 'alice' }]);

    const result = await service.getLeaderboard();

    expect(result.entries[0].acceptance).toBe(25);
  });

  it('pins the viewer even when their row falls outside the requested page', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([
      { userId: 'a', _sum: { amount: 300 } },
      { userId: 'b', _sum: { amount: 200 } },
      { userId: 'me', _sum: { amount: 10 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'a', name: 'A', username: 'a' },
      { id: 'b', name: 'B', username: 'b' },
      { id: 'me', name: 'Me', username: 'me' },
    ]);

    const result = await service.getLeaderboard({ page: 1, pageSize: 2 }, 'me');

    expect(result.entries.map((e) => e.name)).toEqual(['A', 'B']);
    expect(result.currentUser?.name).toBe('Me');
    expect(result.currentUser?.rank).toBe(3);
  });

  it('leaves currentUser null for an anonymous viewer', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([{ userId: 'a', _sum: { amount: 300 } }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'a', name: 'A', username: 'a' }]);

    const result = await service.getLeaderboard();

    expect(result.currentUser).toBeNull();
  });

  it('reports how many users sit at each level', async () => {
    prisma.xpEntry.groupBy.mockResolvedValue([
      { userId: 'a', _sum: { amount: 0 } }, // no XP — excluded
      { userId: 'b', _sum: { amount: 50 } }, // Beginner
      { userId: 'c', _sum: { amount: 150 } }, // Learner
      { userId: 'd', _sum: { amount: 350 } }, // Pupil
    ]);

    const distribution = await service.levelDistribution();

    expect(distribution).toHaveLength(DEFAULT_LEVELS.length);
    expect(distribution.find((l) => l.name === 'Beginner')?.users).toBe(1);
    expect(distribution.find((l) => l.name === 'Learner')?.users).toBe(1);
    expect(distribution.find((l) => l.name === 'Pupil')?.users).toBe(1);
  });
});
