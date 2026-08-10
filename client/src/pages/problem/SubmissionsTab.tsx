import { useState } from 'react';
import { VerdictPill } from '../../components/Badge';
import { EmptyState } from '../../components/ui/States';
import { SkeletonRows } from '../../components/ui/Skeleton';
import CodeEditor from '../../components/CodeEditor';
import { IconChevronLeft, IconClipboard } from '../../components/icons';

export interface ProblemSubmission {
  id: string;
  status: string;
  language: string;
  runtime: number | null;
  memory: number | null;
  passedCount: number | null;
  totalCount: number | null;
  errorMessage: string | null;
  code: string;
  submittedAt: string;
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SubmissionsTab({
  submissions,
  loading,
}: {
  submissions: ProblemSubmission[] | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState<ProblemSubmission | null>(null);

  if (loading && !submissions) return <SkeletonRows rows={5} />;

  if (open) {
    return (
      <div className="flex h-full flex-col">
        <button
          onClick={() => setOpen(null)}
          className="mb-3 inline-flex items-center gap-1 self-start text-sm text-accent hover:underline"
        >
          <IconChevronLeft className="h-4 w-4" />
          Back to submissions
        </button>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <VerdictPill
            status={open.status}
            subtitle={open.totalCount != null ? `${open.passedCount}/${open.totalCount}` : undefined}
          />
          <span className="text-xs text-muted">
            {open.language.toUpperCase()} · {relativeTime(open.submittedAt)}
            {open.runtime != null && ` · ${open.runtime}ms`}
            {open.memory != null && ` · ${open.memory}KB`}
          </span>
        </div>
        {open.errorMessage && (
          <pre className="mb-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-3 font-mono text-xs text-secondary">
            {open.errorMessage}
          </pre>
        )}
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-subtle">
          <CodeEditor value={open.code} onChange={() => {}} language="cpp" fontSize={13} readOnly />
        </div>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <EmptyState
        icon={<IconClipboard />}
        title="No submissions yet"
        description="Your attempts at this problem will appear here once you submit."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Status</th>
            <th scope="col" className="py-2 pr-3 font-medium">Language</th>
            <th scope="col" className="py-2 pr-3 font-medium">Runtime</th>
            <th scope="col" className="py-2 pr-3 font-medium">Memory</th>
            <th scope="col" className="py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr
              key={s.id}
              onClick={() => setOpen(s)}
              className="cursor-pointer border-t border-subtle transition-colors hover:bg-raised/50"
            >
              <td className="py-2 pr-3">
                <VerdictPill
                  status={s.status}
                  compact
                  subtitle={s.totalCount != null ? `${s.passedCount}/${s.totalCount}` : undefined}
                />
              </td>
              <td className="py-2 pr-3 text-secondary">{s.language.toUpperCase()}</td>
              <td className="py-2 pr-3 tabular-nums text-secondary">{s.runtime != null ? `${s.runtime}ms` : '—'}</td>
              <td className="py-2 pr-3 tabular-nums text-secondary">{s.memory != null ? `${s.memory}KB` : '—'}</td>
              <td className="py-2 text-muted">{relativeTime(s.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
