import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useToast } from '../../components/ui/Toast';
import { AdminHeader } from './AdminLayout';
import { DifficultyBadge } from '../../components/Badge';
import { ConfirmModal } from '../../components/ui/Modal';
import Button, { ButtonLink } from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows } from '../../components/ui/Skeleton';

interface ProblemRow {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  acceptance: number | null;
  solvedCount?: number;
  tags: string[];
}

interface Page { items: ProblemRow[]; total: number; page: number; pageSize: number }

export default function AdminProblems() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [target, setTarget] = useState<ProblemRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = params.toString();
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page>(`/problems?${query}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load problems')))
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

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      await api.delete(`/problem/${target.id}`);
      toast.push('success', `Deleted "${target.title}"`);
      setTarget(null);
      load();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not delete that problem'));
    } finally {
      setDeleting(false);
    }
  }

  const page = Number(params.get('page') ?? 1);

  return (
    <>
      <AdminHeader
        title="Problems"
        description="Create, edit, and remove problems. Test cases and limits are edited on the problem form."
        action={<ButtonLink to="/problems/new" size="sm">New problem</ButtonLink>}
      />

      <form
        className="mb-4"
        onSubmit={(e) => { e.preventDefault(); patchParams({ search: search.trim() || null }); }}
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problems..."
          aria-label="Search problems"
        />
      </form>

      {loading ? (
        <SkeletonRows rows={8} className="h-12" />
      ) : error ? (
        <ErrorState title="Couldn't load problems" description={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No problems match" description="Try a different search." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-raised/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 text-right font-semibold">Acceptance</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-t border-subtle">
                    <td className="px-4 py-3">
                      <Link to={`/problems/${p.id}`} className="font-medium text-primary hover:text-accent">{p.title}</Link>
                      {p.tags.length > 0 && <div className="mt-0.5 text-xs text-muted">{p.tags.join(', ')}</div>}
                    </td>
                    <td className="px-4 py-3"><DifficultyBadge difficulty={p.difficulty} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-secondary">
                      {p.acceptance === null ? '—' : `${p.acceptance}%`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <ButtonLink to={`/problems/${p.id}/edit`} size="sm" variant="ghost">Edit</ButtonLink>
                        <Button size="sm" variant="danger" onClick={() => setTarget(p)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPageChange={(p) => patchParams({ page: String(p) })} />
        </>
      )}

      <ConfirmModal
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        confirmLabel="Delete problem"
        title={`Delete "${target?.title}"?`}
        // Naming the consequence explicitly: this cascade reaches other people's data,
        // not just the admin's own.
        description="This also deletes every submission against it — including other users' solve history, which will change their leaderboard standing. This cannot be undone."
      />
    </>
  );
}
