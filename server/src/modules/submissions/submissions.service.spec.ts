import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubmissionsService } from './submissions.service';

jest.mock('bullmq', () => ({
  ...jest.requireActual('bullmq'),
  QueueEvents: jest.fn().mockImplementation(() => ({ close: jest.fn() })),
}));
jest.mock('ioredis');

describe('SubmissionsService', () => {
  let prisma: {
    problem: { findUnique: jest.Mock };
    submission: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
  };
  let judgeQueue: { add: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let service: SubmissionsService;

  beforeEach(() => {
    prisma = {
      problem: { findUnique: jest.fn() },
      submission: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    };
    judgeQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1', waitUntilFinished: jest.fn() }) };
    config = {
      get: jest.fn().mockReturnValue(undefined),
      getOrThrow: jest.fn((key: string) => ({ REDIS_HOST: 'localhost', REDIS_PORT: '6379' })[key as 'REDIS_HOST']),
    };
    service = new SubmissionsService(prisma as any, judgeQueue as any, config as any);
  });

  describe('submit', () => {
    it('404s when the problem does not exist', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);

      await expect(service.submit({ problemId: 'missing', code: 'x' }, 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.submission.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING submission and enqueues a judge-submission job', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.submission.create.mockResolvedValue({ id: 'sub-1', status: 'PENDING' });

      const result = await service.submit({ problemId: 'p1', code: 'int main(){}' }, 'user-1');

      expect(prisma.submission.create.mock.calls[0][0].data).toMatchObject({
        userId: 'user-1',
        problemId: 'p1',
        status: 'PENDING',
        language: 'cpp',
      });
      expect(judgeQueue.add).toHaveBeenCalledWith('judge-submission', { submissionId: 'sub-1' });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('findOne (ownership enforcement)', () => {
    it('404s when the submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing', { sub: 'u1', role: Role.USER } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('403s when a different, non-admin user requests it', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'owner', code: 'x' });

      await expect(service.findOne('s1', { sub: 'not-the-owner', role: Role.USER } as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows the owner through', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'owner', code: 'x' });

      const result = await service.findOne('s1', { sub: 'owner', role: Role.USER } as any);
      expect(result.id).toBe('s1');
    });

    it('allows an ADMIN through even when not the owner', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'owner', code: 'x' });

      const result = await service.findOne('s1', { sub: 'some-admin', role: Role.ADMIN } as any);
      expect(result.id).toBe('s1');
    });

    it('strips userId from the response', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'owner', code: 'x' });

      const result = await service.findOne('s1', { sub: 'owner', role: Role.USER } as any);
      expect(result).not.toHaveProperty('userId');
    });
  });

  describe('runSample', () => {
    it('404s when the problem does not exist', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);

      await expect(service.runSample({ problemId: 'missing', code: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('wraps a job failure/timeout as a clean 500 rather than leaking BullMQ internals', async () => {
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p1',
        timeLimit: 1000,
        memoryLimit: 128,
        sampleInput: 'in',
        sampleOutput: 'out',
      });
      judgeQueue.add.mockResolvedValue({
        waitUntilFinished: jest.fn().mockRejectedValue(new Error('job stalled')),
      });

      await expect(service.runSample({ problemId: 'p1', code: 'x' })).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});
