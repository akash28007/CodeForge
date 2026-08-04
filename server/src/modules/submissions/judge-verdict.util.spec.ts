import { SubmissionStatus } from '@prisma/client';
import { decideVerdict } from './judge-verdict.util';

const passingOutcome = { stdout: '5\n', stderr: '', exitCode: 0, timedOut: false, oomKilled: false };
const testCase = { expectedOutput: '5', isHidden: false };
const hiddenTestCase = { expectedOutput: '5', isHidden: true };

describe('decideVerdict', () => {
  it('returns null (continue) when the output matches, ignoring trailing whitespace', () => {
    expect(decideVerdict({ ...passingOutcome, stdout: '5\n' }, testCase, 0)).toBeNull();
  });

  it('flags TLE before checking anything else', () => {
    const result = decideVerdict({ ...passingOutcome, timedOut: true, exitCode: null }, testCase, 2);
    expect(result?.status).toBe(SubmissionStatus.TIME_LIMIT_EXCEEDED);
    expect(result?.errorMessage).toContain('test case 3');
  });

  it('flags MLE when oomKilled, even if exitCode looks non-zero', () => {
    const result = decideVerdict({ ...passingOutcome, oomKilled: true, exitCode: 137 }, testCase, 0);
    expect(result?.status).toBe(SubmissionStatus.MEMORY_LIMIT_EXCEEDED);
  });

  it('flags RUNTIME_ERROR on non-zero exit and includes stderr for a non-hidden test case', () => {
    const result = decideVerdict({ ...passingOutcome, exitCode: 1, stderr: 'segfault' }, testCase, 0);
    expect(result?.status).toBe(SubmissionStatus.RUNTIME_ERROR);
    expect(result?.errorMessage).toContain('segfault');
  });

  it('flags RUNTIME_ERROR but omits stderr for a hidden test case', () => {
    const result = decideVerdict({ ...passingOutcome, exitCode: 1, stderr: 'secret internal detail' }, hiddenTestCase, 0);
    expect(result?.status).toBe(SubmissionStatus.RUNTIME_ERROR);
    expect(result?.errorMessage).not.toContain('secret internal detail');
  });

  it('flags WRONG_ANSWER and includes expected/got for a non-hidden test case', () => {
    const result = decideVerdict({ ...passingOutcome, stdout: '999' }, testCase, 0);
    expect(result?.status).toBe(SubmissionStatus.WRONG_ANSWER);
    expect(result?.errorMessage).toContain('Expected: 5');
    expect(result?.errorMessage).toContain('Got: 999');
  });

  it('flags WRONG_ANSWER but never reveals expected/actual output for a hidden test case', () => {
    const result = decideVerdict({ ...passingOutcome, stdout: 'wrong-guess' }, hiddenTestCase, 4);
    expect(result?.status).toBe(SubmissionStatus.WRONG_ANSWER);
    expect(result?.errorMessage).not.toContain('Expected:');
    expect(result?.errorMessage).not.toContain('Got:');
    expect(result?.errorMessage).not.toContain('wrong-guess');
    expect(result?.errorMessage).toContain('test case 5');
  });
});
