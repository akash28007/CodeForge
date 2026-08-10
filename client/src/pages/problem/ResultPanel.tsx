import { VerdictPill, verdictMeta } from '../../components/Badge';
import { IconCheckCircle, IconClock, IconCpu, IconLoader } from '../../components/icons';

export interface SubmissionResult {
  id: string;
  status: string;
  runtime: number | null;
  memory: number | null;
  errorMessage: string | null;
  passedCount: number | null;
  totalCount: number | null;
}

export interface RunResult {
  passed: boolean;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  runtimeMs?: number;
  memoryKb?: number;
  compileError?: string;
}

const PENDING_STATUSES = ['PENDING', 'RUNNING'];

interface Props {
  mode: 'run' | 'submit' | null;
  running: boolean;
  runResult: RunResult | null;
  submission: SubmissionResult | null;
  error: string | null;
  /** The problem's configured limits, so TLE/MLE can say what was exceeded. */
  timeLimit: number;
  memoryLimit: number;
  expectedSample: string;
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-secondary">
      {icon}
      {children}
    </span>
  );
}

export default function ResultPanel({
  mode,
  running,
  runResult,
  submission,
  error,
  timeLimit,
  memoryLimit,
  expectedSample,
}: Props) {
  if (!mode && !error) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-6 text-center text-xs text-muted">
        Run against the sample to check your logic, or submit to be judged on all test cases.
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4">
        <p className="rounded-lg border border-hard/30 bg-hard/10 px-3 py-2 text-sm text-hard">{error}</p>
      </div>
    );
  }

  /* ── live judging progress ── */
  const status = submission?.status;
  if (mode === 'submit' && (running || (status && PENDING_STATUSES.includes(status)))) {
    return (
      <div className="px-4 py-5">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <IconLoader className="h-4 w-4 text-accent" />
          {status === 'RUNNING' ? 'Running your code against the test cases…' : 'Queued for judging…'}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {['PENDING', 'RUNNING', 'Verdict'].map((label, i) => {
            const reached = i === 0 || (i === 1 && status === 'RUNNING');
            return (
              <span
                key={label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  reached ? 'bg-accent/15 text-accent' : 'bg-raised text-muted'
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'run' && running) {
    return (
      <div className="flex items-center gap-2 px-4 py-5 text-sm text-primary">
        <IconLoader className="h-4 w-4 text-accent" />
        Compiling and running against the sample…
      </div>
    );
  }

  /* ── sample run result ── */
  if (mode === 'run' && runResult) {
    if (runResult.compileError) {
      return (
        <div className="px-4 py-4">
          <VerdictPill status="COMPILE_ERROR" />
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-3 font-mono text-xs text-hard">
            {runResult.compileError}
          </pre>
        </div>
      );
    }

    return (
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              runResult.passed ? 'border-easy/30 bg-easy/10 text-easy' : 'border-hard/30 bg-hard/10 text-hard'
            }`}
          >
            <IconCheckCircle className="h-3.5 w-3.5" />
            {runResult.timedOut ? 'Timed out on sample' : runResult.passed ? 'Sample passed' : 'Sample failed'}
          </span>
          {runResult.runtimeMs != null && (
            <Stat icon={<IconClock className="h-3 w-3" />}>{runResult.runtimeMs}ms</Stat>
          )}
          {runResult.memoryKb != null && <Stat icon={<IconCpu className="h-3 w-3" />}>{runResult.memoryKb}KB</Stat>}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Your output</h4>
            <pre className="min-h-[2.5rem] overflow-x-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-2.5 font-mono text-xs text-primary">
              {runResult.stdout || '(no output)'}
            </pre>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Expected</h4>
            <pre className="min-h-[2.5rem] overflow-x-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-2.5 font-mono text-xs text-secondary">
              {expectedSample}
            </pre>
          </div>
        </div>

        {runResult.stderr && (
          <div className="mt-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">stderr</h4>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-2.5 font-mono text-xs text-medium">
              {runResult.stderr}
            </pre>
          </div>
        )}
      </div>
    );
  }

  /* ── final verdict ── */
  if (submission && status) {
    const meta = verdictMeta(status);
    const accepted = status === 'ACCEPTED';

    return (
      <div className={`px-4 py-4 ${accepted ? 'animate-pop' : ''}`}>
        <div className="flex flex-wrap items-center gap-3">
          <VerdictPill
            status={status}
            subtitle={
              submission.totalCount != null
                ? `${submission.passedCount}/${submission.totalCount} test cases`
                : undefined
            }
          />
          {submission.runtime != null && (
            <Stat icon={<IconClock className="h-3 w-3" />}>{submission.runtime}ms</Stat>
          )}
          {submission.memory != null && <Stat icon={<IconCpu className="h-3 w-3" />}>{submission.memory}KB</Stat>}
        </div>

        {accepted && (
          <p className="mt-2 text-sm text-easy">
            Accepted — all {submission.totalCount} test cases passed.
          </p>
        )}

        {/* Say plainly which limit was hit, and what it was set to. */}
        {status === 'TIME_LIMIT_EXCEEDED' && (
          <p className="mt-2 text-sm text-secondary">
            Your solution exceeded this problem&apos;s time limit of{' '}
            <span className="font-semibold text-primary">{timeLimit}ms</span> per test case.
          </p>
        )}
        {status === 'MEMORY_LIMIT_EXCEEDED' && (
          <p className="mt-2 text-sm text-secondary">
            Your solution exceeded this problem&apos;s memory limit of{' '}
            <span className="font-semibold text-primary">{memoryLimit}MB</span>.
          </p>
        )}

        {submission.errorMessage && (
          <pre
            className={`mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-xs ${meta.border} bg-canvas text-secondary`}
          >
            {submission.errorMessage}
          </pre>
        )}
      </div>
    );
  }

  return null;
}
