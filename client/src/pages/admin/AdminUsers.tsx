import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { AdminHeader } from './AdminLayout';
import { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows } from '../../components/ui/Skeleton';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: 'USER' | 'ADMIN';
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  xp: number;
  _count: { submissions: number; problems: number };
}

interface Page {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [xpTarget, setXpTarget] = useState<AdminUser | null>(null);
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');

  const query = params.toString();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page>(`/admin/users?${query}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load users')))
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

  async function act(id: string, fn: () => Promise<unknown>, successMessage: string) {
    setBusy(id);
    try {
      await fn();
      toast.push('success', successMessage);
      load();
    } catch (err) {
      // The server owns the lockout rules (last admin, self-targeting) — surfacing its
      // message keeps the UI from having to restate them and get them subtly wrong.
      toast.push('error', getErrorMessage(err, 'That change was rejected'));
    } finally {
      setBusy(null);
    }
  }

  const setRole = (u: AdminUser) =>
    act(u.id, () => api.patch(`/admin/users/${u.id}/role`, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }),
      `${u.name} is now ${u.role === 'ADMIN' ? 'a user' : 'an admin'}`);

  async function confirmSuspend() {
    if (!suspendTarget) return;
    const target = suspendTarget;
    const suspending = !target.suspendedAt;
    await act(target.id,
      () => api.patch(`/admin/users/${target.id}/suspension`, { suspended: suspending, reason: suspendReason || undefined }),
      suspending ? `${target.name} suspended` : `${target.name} reinstated`);
    setSuspendTarget(null);
    setSuspendReason('');
  }

  async function confirmXp() {
    if (!xpTarget) return;
    const target = xpTarget;
    const amount = Number(xpAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.push('error', 'Enter a non-zero whole number');
      return;
    }
    await act(target.id, () => api.post(`/admin/users/${target.id}/xp`, { amount, reason: xpReason }),
      `${amount > 0 ? '+' : ''}${amount} XP applied to ${target.name}`);
    setXpTarget(null);
    setXpAmount('');
    setXpReason('');
  }

  const page = Number(params.get('page') ?? 1);

  return (
    <>
      <AdminHeader title="Users" description="Search accounts, change roles, suspend, and correct XP." />

      <div className="mb-4 flex flex-wrap gap-2">
        <form
          className="min-w-[220px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ search: search.trim() || null });
          }}
        >
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, or username..."
            aria-label="Search users"
          />
        </form>
        <select
          value={params.get('role') ?? ''}
          onChange={(e) => patchParams({ role: e.target.value || null })}
          aria-label="Filter by role"
          className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary"
        >
          <option value="">All roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={params.get('suspended') ?? ''}
          onChange={(e) => patchParams({ suspended: e.target.value || null })}
          aria-label="Filter by status"
          className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary"
        >
          <option value="">Any status</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
      </div>

      {loading ? (
        <SkeletonRows rows={8} className="h-14" />
      ) : error ? (
        <ErrorState title="Couldn't load users" description={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No accounts match" description="Try a different search or filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-raised/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 text-right font-semibold">XP</th>
                  <th className="px-4 py-3 text-right font-semibold">Subs</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-t border-subtle">
                      <td className="px-4 py-3">
                        <div className="font-medium text-primary">
                          {u.name}
                          {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
                        </div>
                        <div className="text-xs text-muted">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-accent/10 text-accent' : 'bg-raised text-secondary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-secondary">{u.xp}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-secondary">{u._count.submissions}</td>
                      <td className="px-4 py-3">
                        {u.suspendedAt ? (
                          <span title={u.suspendedReason ?? undefined} className="rounded-full bg-hard/10 px-2 py-0.5 text-xs font-semibold text-hard">
                            Suspended
                          </span>
                        ) : (
                          <span className="rounded-full bg-easy/10 px-2 py-0.5 text-xs font-semibold text-easy">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setXpTarget(u)} disabled={busy === u.id}>
                            XP
                          </Button>
                          {/* Self-targeting is blocked by the server; disabling here just
                              avoids offering an action that can only fail. */}
                          <Button size="sm" variant="ghost" onClick={() => setRole(u)} disabled={isSelf || busy === u.id}>
                            {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                          </Button>
                          <Button
                            size="sm"
                            variant={u.suspendedAt ? 'ghost' : 'danger'}
                            onClick={() => { setSuspendTarget(u); setSuspendReason(''); }}
                            disabled={isSelf || busy === u.id}
                          >
                            {u.suspendedAt ? 'Reinstate' : 'Suspend'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => patchParams({ page: String(p) })}
          />
        </>
      )}

      <ConfirmModal
        open={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        onConfirm={confirmSuspend}
        destructive={!suspendTarget?.suspendedAt}
        confirmLabel={suspendTarget?.suspendedAt ? 'Reinstate' : 'Suspend'}
        title={suspendTarget?.suspendedAt ? `Reinstate ${suspendTarget?.name}?` : `Suspend ${suspendTarget?.name}?`}
        description={
          suspendTarget?.suspendedAt
            ? 'They will be able to sign in and submit again immediately.'
            : 'They are signed out immediately — existing sessions stop working at once, not at token expiry.'
        }
      >
        {!suspendTarget?.suspendedAt && (
          <label className="block text-sm">
            <span className="text-secondary">Reason (optional, stored on the account)</span>
            <input
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              placeholder="e.g. abusive submissions"
            />
          </label>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={xpTarget !== null}
        onClose={() => setXpTarget(null)}
        onConfirm={confirmXp}
        destructive={false}
        confirmLabel="Apply adjustment"
        title={`Adjust XP for ${xpTarget?.name}`}
        description="Recorded as a new ledger entry, not an edit to a total. Use a negative number to remove XP."
      >
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="text-secondary">Amount (e.g. 50 or -25)</span>
            <input
              type="number"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-secondary">Reason (required)</span>
            <input
              value={xpReason}
              onChange={(e) => setXpReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              placeholder="Why this correction is being made"
            />
          </label>
        </div>
      </ConfirmModal>
    </>
  );
}
