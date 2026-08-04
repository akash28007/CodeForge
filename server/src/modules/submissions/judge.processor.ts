import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DockerExecutorService } from '../../docker/docker-executor.service';
import { decideVerdict } from './judge-verdict.util';

interface JudgeSubmissionJob {
  submissionId: string;
}

interface RunSampleJob {
  code: string;
  timeLimit: number;
  memoryLimit: number;
  sampleInput: string;
  sampleOutput: string;
}

export interface RunSampleResult {
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  runtimeMs: number;
  memoryKb: number | null;
  compileError?: string;
}

@Injectable()
@Processor('judge')
export class JudgeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(JudgeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerExecutor: DockerExecutorService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  onModuleInit() {
    this.worker.concurrency = Number(this.config.get('EXEC_QUEUE_CONCURRENCY') ?? 4);
  }

  process(job: Job): Promise<unknown> {
    if (job.name === 'judge-submission') {
      return this.judgeSubmission(job.data as JudgeSubmissionJob);
    }
    if (job.name === 'run-sample') {
      return this.runSample(job.data as RunSampleJob);
    }
    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async judgeSubmission({ submissionId }: JudgeSubmissionJob): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { problem: { include: { testCases: true } } },
    });
    if (!submission) {
      this.logger.warn(`Submission ${submissionId} vanished before judging`);
      return;
    }

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.RUNNING },
    });

    const { problem } = submission;
    const testCases = problem.testCases;

    try {
      const compileResult = await this.dockerExecutor.compile(submission.code);
      if (!compileResult.success || !compileResult.binaryDir) {
        await this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.COMPILE_ERROR,
            errorMessage: compileResult.stderr.slice(0, 4000),
            passedCount: 0,
            totalCount: testCases.length,
          },
        });
        return;
      }

      try {
        let passedCount = 0;
        let maxRuntimeMs = 0;
        let maxMemoryKb = 0;
        let finalStatus: SubmissionStatus = SubmissionStatus.ACCEPTED;
        let errorMessage: string | null = null;

        for (let i = 0; i < testCases.length; i++) {
          const testCase = testCases[i];
          const runResult = await this.dockerExecutor.run(
            compileResult.binaryDir,
            testCase.input,
            problem.timeLimit,
            problem.memoryLimit,
          );
          maxRuntimeMs = Math.max(maxRuntimeMs, runResult.runtimeMs);
          if (runResult.memoryKb !== null) {
            maxMemoryKb = Math.max(maxMemoryKb, runResult.memoryKb);
          }

          const verdict = decideVerdict(runResult, testCase, i);
          if (verdict) {
            finalStatus = verdict.status;
            errorMessage = verdict.errorMessage;
            break;
          }

          passedCount++;
        }

        await this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: finalStatus,
            runtime: maxRuntimeMs,
            memory: maxMemoryKb || null,
            errorMessage,
            passedCount,
            totalCount: testCases.length,
          },
        });
      } finally {
        await this.dockerExecutor.cleanupCompiled(compileResult.binaryDir);
      }
    } catch (err) {
      this.logger.error(`Judging failed for submission ${submissionId}: ${(err as Error).message}`);
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.RUNTIME_ERROR,
          errorMessage: 'Internal judging error — please resubmit.',
        },
      });
      throw err;
    }
  }

  private async runSample({
    code,
    timeLimit,
    memoryLimit,
    sampleInput,
    sampleOutput,
  }: RunSampleJob): Promise<RunSampleResult> {
    const compileResult = await this.dockerExecutor.compile(code);
    if (!compileResult.success || !compileResult.binaryDir) {
      return {
        passed: false,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        runtimeMs: 0,
        memoryKb: null,
        compileError: compileResult.stderr,
      };
    }

    try {
      const runResult = await this.dockerExecutor.run(compileResult.binaryDir, sampleInput, timeLimit, memoryLimit);
      return {
        passed: !runResult.timedOut && runResult.exitCode === 0 && runResult.stdout.trim() === sampleOutput.trim(),
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        timedOut: runResult.timedOut,
        runtimeMs: runResult.runtimeMs,
        memoryKb: runResult.memoryKb,
      };
    } finally {
      await this.dockerExecutor.cleanupCompiled(compileResult.binaryDir);
    }
  }
}
