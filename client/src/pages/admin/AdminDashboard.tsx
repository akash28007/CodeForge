import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { AdminHeader } from './AdminLayout';
import { ErrorState } from '../../components/ui/States';
import Skeleton from '../../components/ui/Skeleton';

interface Stats {
  users: { total: number; newToday: number; suspended: number };
  problems: { total: number };
  resources: { total: number };
  submissions: { today: number; total: number; accepted: number; acceptanceRate: number | null };
  queue: { pending: number; running: number; stuck: number };
  newsletter: { active: number };
}

function Tile({ label, value, hint, tone = 'default', to }: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'bad';
  to?: string;
}) {
  const toneClass =
    tone === 'bad' ? 'text-hard' : tone === 'warn' ? 'text-medium' : 'text-primary';

  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-secondary">{hint}</p>}
    </>
  );

  const className = 'rounded-xl border border-subtle bg-surface p-4';
  return to ? (
    <Link to={to} className={`${className} block transition-colors hover:border-accent/50`}>{inner}</Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<Stats>('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load dashboard stats')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return (
      <>
        <AdminHeader title="Dashboard" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </>
    );
  }
  if (error || !stats) return <ErrorState title="Couldn't load the dashboard" description={error ?? undefined} onRetry={load} />;

  // A submission sitting in PENDING/RUNNING for over five minutes means the worker
  // isn't draining the queue. Surfaced prominently because it's the one number here
  // that indicates something is actually broken.
  const judgeHealthy = stats.queue.stuck === 0;

  return (
    <>
      <AdminHeader title="Dashboard" description="Live counts, straight from the database." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Users" value={stats.users.total} hint={`${stats.users.newToday} joined today`} to="/admin/users" />
        <Tile
          label="Suspended"
          value={stats.users.suspended}
          tone={stats.users.suspended > 0 ? 'warn' : 'default'}
          to="/admin/users?suspended=true"
        />
        <Tile label="Problems" value={stats.problems.total} to="/admin/problems" />
        <Tile label="Resources" value={stats.resources.total} to="/admin/resources" />

        <Tile label="Submissions today" value={stats.submissions.today} hint={`${stats.submissions.total} all time`} to="/admin/submissions" />
        <Tile
          label="Acceptance rate"
          value={stats.submissions.acceptanceRate === null ? '—' : `${stats.submissions.acceptanceRate}%`}
          hint={stats.submissions.acceptanceRate === null ? 'No submissions yet' : `${stats.submissions.accepted} accepted`}
        />
        <Tile label="Queue" value={stats.queue.pending + stats.queue.running} hint={`${stats.queue.pending} pending · ${stats.queue.running} running`} />
        <Tile
          label="Stuck jobs"
          value={stats.queue.stuck}
          tone={judgeHealthy ? 'default' : 'bad'}
          hint={judgeHealthy ? 'Judge draining normally' : 'Queued over 5 min — check the worker'}
          to="/admin/submissions"
        />
      </div>

      <div className="mt-4 rounded-xl border border-subtle bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Newsletter</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-primary">{stats.newsletter.active}</p>
        <p className="mt-1 text-xs text-secondary">active subscribers</p>
      </div>
    </>
  );
}
