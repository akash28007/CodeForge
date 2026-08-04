import { SubmissionStatus } from '@prisma/client';

export interface JudgeRunOutcome {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  oomKilled: boolean;
}

export interface TestCaseLike {
  expectedOutput: string;
  isHidden: boolean;
}

export interface VerdictOutcome {
  status: SubmissionStatus;
  errorMessage: string;
}

/** Returns null when the test case passed and judging should continue to the next one. */
export function decideVerdict(
  outcome: JudgeRunOutcome,
  testCase: TestCaseLike,
  testCaseIndex: number,
): VerdictOutcome | null {
  if (outcome.timedOut) {
    return {
      status: SubmissionStatus.TIME_LIMIT_EXCEEDED,
      errorMessage: `Time limit exceeded on test case ${testCaseIndex + 1}`,
    };
  }
  if (outcome.oomKilled) {
    return {
      status: SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
      errorMessage: `Memory limit exceeded on test case ${testCaseIndex + 1}`,
    };
  }
  if (outcome.exitCode !== 0) {
    return {
      status: SubmissionStatus.RUNTIME_ERROR,
      errorMessage: testCase.isHidden
        ? `Runtime error on test case ${testCaseIndex + 1}`
        : `Runtime error on test case ${testCaseIndex + 1}:\n${outcome.stderr.slice(0, 2000)}`,
    };
  }
  if (outcome.stdout.trim() !== testCase.expectedOutput.trim()) {
    return {
      status: SubmissionStatus.WRONG_ANSWER,
      errorMessage: testCase.isHidden
        ? `Wrong answer on test case ${testCaseIndex + 1}`
        : `Wrong answer on test case ${testCaseIndex + 1}\nExpected: ${testCase.expectedOutput}\nGot: ${outcome.stdout}`,
    };
  }
  return null;
}
