import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { AdminHeader } from './AdminLayout';
import { StatusBadge } from '../../components/Badge';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows } from '../../components/ui/Skeleton';

const STATUSES = [
  'PENDING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILE_ERROR',
] as const;

interface Row {
  id: string;
  status: (typeof STATUSES)[number];
  language: string;
  runtime: number | null;
  memory: number | null;
  passedCount: number | null;
  totalCount: number | null;
  errorMessage: string | null;
  submittedAt: string;
  user: { id: string; name: string; email: string };
  problem: { id: string; title: string; difficulty: string };
}

interface Page { items: Row[]; total: number; page: number; pageSize: number }

export default function AdminSubmissions() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('search') ?? '');

  const query = params.toString();
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page>(`/admin/submissions?${query}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load submissions')))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(load, [load]);

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  }

  const page = Number(params.get('page') ?? 1);

  return (
    <>
      <AdminHeader
        title="Judge monitor"
        description="Recent submissions and their verdicts, for debugging the executor."
        action={
          <button onClick={load} className="rounded-lg border border-subtle px-3 py-1.5 text-sm text-secondary hover:text-primary">
            Refresh
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <form
          className="min-w-[220px] flex-1"
          onSubmit={(e) => { e.preventDefault(); patchParams({ search: search.trim() || null }); }}
        >
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="User or problem..."
            aria-label="Search submissions"
          />
        </form>
        <select
          value={params.get('status') ?? ''}
          onChange={(e) => patchParams({ status: e.target.value || null })}
          aria-label="Filter by verdict"
          className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary"
        >
          <option value="">All verdicts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonRows rows={8} className="h-14" />
      ) : error ? (
        <ErrorState title="Couldn't load submissions" description={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No submissions match" description="Try a different verdict or search." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-raised/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Problem</th>
                  <th className="px-4 py-3 font-semibold">Verdict</th>
                  <th className="px-4 py-3 text-right font-semibold">Tests</th>
                  <th className="px-4 py-3 text-right font-semibold">Time</th>
                  <th className="px-4 py-3 text-right font-semibold">Memory</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className="border-t border-subtle align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {new Date(s.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-primary">{s.user.name}</div>
                      <div className="text-xs text-muted">{s.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/problems/${s.problem.id}`} className="text-accent hover:underline">
                        {s.problem.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                      {/* Compile/runtime detail is the whole point of this screen. */}
                      {s.errorMessage && (
                        <pre className="mt-1.5 max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded bg-canvas p-2 font-mono text-[11px] text-secondary">
                          {s.errorMessage.slice(0, 400)}
                        </pre>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-secondary">
                      {s.passedCount !== null && s.totalCount !== null ? `${s.passedCount}/${s.totalCount}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-secondary">
                      {s.runtime !== null ? `${s.runtime} ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-secondary">
                      {s.memory !== null ? `${Math.round(s.memory / 1024)} MB` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPageChange={(p) => patchParams({ page: String(p) })} />
        </>
      )}
    </>
  );
}
