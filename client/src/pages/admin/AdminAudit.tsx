import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { AdminHeader } from './AdminLayout';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows } from '../../components/ui/Skeleton';

interface Entry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

const actionTone: Record<string, string> = {
  create: 'bg-easy/10 text-easy',
  upload: 'bg-easy/10 text-easy',
  update: 'bg-info/10 text-info',
  upsert: 'bg-info/10 text-info',
  adjust: 'bg-medium/10 text-medium',
  suspend: 'bg-hard/10 text-hard',
  unsuspend: 'bg-easy/10 text-easy',
  delete: 'bg-hard/10 text-hard',
};

export default function AdminAudit() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<Entry[]>('/admin/audit')
      .then((res) => setEntries(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load the audit log')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <>
      <AdminHeader
        title="Audit log"
        description="Every admin mutation, newest first. Append-only — entries are never edited or removed."
      />

      {loading ? (
        <SkeletonRows rows={10} className="h-12" />
      ) : error ? (
        <ErrorState title="Couldn't load the audit log" description={error} onRetry={load} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Admin changes will appear here as they happen." />
      ) : (
        <ul className="flex flex-col rounded-xl border border-subtle">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 border-b border-subtle px-4 py-3 last:border-b-0">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${actionTone[entry.action] ?? 'bg-raised text-secondary'}`}>
                {entry.action}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-primary">{entry.summary}</span>
                <span className="block text-xs text-muted">
                  {entry.entity}
                  {' · '}
                  {entry.actor.name} ({entry.actor.email})
                </span>
              </span>
              <time dateTime={entry.createdAt} className="shrink-0 text-xs text-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
