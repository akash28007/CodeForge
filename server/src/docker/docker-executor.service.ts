import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { CompileResult, RunResult } from './types';

const EXECUTOR_IMAGE = 'codeforge-executor';
const COMPILE_TIMEOUT_MS = 10_000;
const COMPILE_MEMORY_MB = 512;
const TIMEOUT_GRACE_MS = 1_000;
const WORK_ROOT = join(tmpdir(), 'codeforge-exec');

interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

// GNU time's report always starts with this line; splitting on it separates
// the timed program's own stderr from time's trailing stats block.
const TIME_REPORT_MARKER = '\tCommand being timed:';

export function parseTimedStderr(raw: string): { stderr: string; memoryKb: number | null } {
  const markerIndex = raw.indexOf(TIME_REPORT_MARKER);
  if (markerIndex === -1) {
    // The timed process was killed before `time` could print its report
    // (e.g. our own timeout SIGKILL reaches the whole process group at once).
    return { stderr: raw, memoryKb: null };
  }
  const report = raw.slice(markerIndex);
  const match = report.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  return {
    stderr: raw.slice(0, markerIndex),
    memoryKb: match ? Number(match[1]) : null,
  };
}

@Injectable()
export class DockerExecutorService {
  private readonly logger = new Logger(DockerExecutorService.name);

  async compile(code: string): Promise<CompileResult> {
    const runId = randomUUID();
    const runDir = join(WORK_ROOT, runId);
    const srcDir = join(runDir, 'src');
    const binDir = join(runDir, 'bin');
    await mkdir(srcDir, { recursive: true });
    await mkdir(binDir, { recursive: true });
    await writeFile(join(srcDir, 'main.cpp'), code, 'utf8');

    const containerName = `codeforge-compile-${runId}`;
    const args = [
      'run',
      '--rm',
      `--name=${containerName}`,
      '--network',
      'none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--memory',
      `${COMPILE_MEMORY_MB}m`,
      '--memory-swap',
      `${COMPILE_MEMORY_MB}m`,
      '--cpus',
      '1',
      '--pids-limit',
      '64',
      '--user',
      '1000:1000',
      '--tmpfs',
      '/tmp:rw,size=32m,exec',
      '-v',
      `${srcDir}:/sandbox/src:ro`,
      '-v',
      `${binDir}:/sandbox/bin:rw`,
      EXECUTOR_IMAGE,
      'g++ -O2 -Wall -o /sandbox/bin/a.out /sandbox/src/main.cpp',
    ];

    try {
      const result = await this.runDocker(args, containerName, COMPILE_TIMEOUT_MS);

      if (result.exitCode === 0 && !result.timedOut) {
        return { success: true, binaryDir: binDir, stderr: result.stderr };
      }

      await rm(runDir, { recursive: true, force: true });
      return {
        success: false,
        stderr: result.timedOut ? 'Compilation timed out' : result.stderr,
      };
    } catch (err) {
      await rm(runDir, { recursive: true, force: true });
      throw err;
    }
  }

  async run(binaryDir: string, input: string, timeLimitMs: number, memoryLimitMb: number): Promise<RunResult> {
    const runId = randomUUID();
    const runDir = join(WORK_ROOT, runId);
    const inDir = join(runDir, 'in');
    await mkdir(inDir, { recursive: true });
    await writeFile(join(inDir, 'input.txt'), input, 'utf8');

    const containerName = `codeforge-run-${runId}`;
    const args = [
      'run',
      '--rm',
      `--name=${containerName}`,
      '--network',
      'none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--memory',
      `${memoryLimitMb}m`,
      '--memory-swap',
      `${memoryLimitMb}m`,
      '--cpus',
      '1',
      '--pids-limit',
      '32',
      '--user',
      '1000:1000',
      '--tmpfs',
      '/tmp:rw,size=16m,exec',
      '-v',
      `${binaryDir}:/sandbox/bin:ro`,
      '-v',
      `${inDir}:/sandbox/in:ro`,
      EXECUTOR_IMAGE,
      '/usr/bin/time -v /sandbox/bin/a.out < /sandbox/in/input.txt',
    ];

    const start = Date.now();
    try {
      const result = await this.runDocker(args, containerName, timeLimitMs + TIMEOUT_GRACE_MS);
      const runtimeMs = Date.now() - start;
      const { stderr, memoryKb } = parseTimedStderr(result.stderr);

      return {
        stdout: result.stdout,
        stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        oomKilled: !result.timedOut && result.exitCode === 137,
        runtimeMs,
        memoryKb,
      };
    } finally {
      await rm(runDir, { recursive: true, force: true });
    }
  }

  /** Must be called once the caller is done running all test cases against a compiled binary. */
  async cleanupCompiled(binaryDir: string) {
    await rm(join(binaryDir, '..'), { recursive: true, force: true });
  }

  private runDocker(args: string[], containerName: string, timeoutMs: number): Promise<DockerRunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const killer = setTimeout(() => {
        timedOut = true;
        spawn('docker', ['kill', containerName], { windowsHide: true });
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });

      child.on('error', (err) => {
        clearTimeout(killer);
        reject(new Error(`Failed to spawn docker: ${err.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(killer);
        const exitCode = code ?? -1;

        if (!timedOut && [125, 126, 127].includes(exitCode)) {
          this.logger.error(`Docker infrastructure failure (exit ${exitCode}): ${stderr.trim()}`);
          reject(new Error(`Docker infrastructure failure (exit ${exitCode}): ${stderr.trim()}`));
          return;
        }

        resolve({ stdout, stderr, exitCode, timedOut });
      });
    });
  }
}
