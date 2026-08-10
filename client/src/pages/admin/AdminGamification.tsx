import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useToast } from '../../components/ui/Toast';
import { AdminHeader } from './AdminLayout';
import Button from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import Skeleton from '../../components/ui/Skeleton';

interface XpEntry { key: string; value: string; default: string; overridden: boolean }
interface LevelEntry { rank: number; name: string; minXp: number; defaultName: string; defaultMinXp: number; overridden: boolean }
interface Config { xp: XpEntry[]; levels: LevelEntry[] }

const LABELS: Record<string, string> = {
  'xp.solve.EASY': 'Solve an Easy problem',
  'xp.solve.MEDIUM': 'Solve a Medium problem',
  'xp.solve.HARD': 'Solve a Hard problem',
  'xp.bonus.firstAccepted': 'Bonus: first accepted solution',
  'xp.bonus.noEditorial': 'Bonus: solved without the editorial',
  'xp.bonus.quickSolve': 'Bonus: solved quickly',
  'xp.bonus.dailyLogin': 'Daily check-in',
  'xp.bonus.streakDay': 'Each streak day',
  'xp.bonus.streak7': 'Streak milestone: 7 days',
  'xp.bonus.streak30': 'Streak milestone: 30 days',
  'rule.quickSolveAttempts': 'Attempts that still count as a "quick" solve',
};

export default function AdminGamification() {
  const toast = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Only edited keys are sent, so an untouched value stays un-overridden. */
  const [dirty, setDirty] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<Config>('/admin/gamification')
      .then((res) => { setConfig(res.data); setDirty({}); })
      .catch((err) => setError(getErrorMessage(err, 'Could not load configuration')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const res = await api.patch<Config>('/admin/gamification', { entries: dirty });
      setConfig(res.data);
      setDirty({});
      toast.push('success', 'Configuration saved — it applies to the next award immediately');
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not save configuration'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><AdminHeader title="Gamification" /><Skeleton className="h-96 rounded-xl" /></>;
  if (error || !config) return <ErrorState title="Couldn't load configuration" description={error ?? undefined} onRetry={load} />;

  const dirtyCount = Object.keys(dirty).length;
  const valueOf = (key: string, current: string) => dirty[key] ?? current;

  return (
    <>
      <AdminHeader
        title="Gamification"
        description="XP awards and level thresholds. Changes take effect on the next award — no deploy or migration."
        action={
          <Button onClick={save} loading={saving} disabled={dirtyCount === 0}>
            {dirtyCount === 0 ? 'No changes' : `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`}
          </Button>
        }
      />

      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">XP awards</h3>
        <ul className="flex flex-col gap-2">
          {config.xp.map((entry) => (
            <li key={entry.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle pb-2 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm text-primary">{LABELS[entry.key] ?? entry.key}</p>
                <p className="font-mono text-[11px] text-muted">{entry.key}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Default shown alongside so an admin can always see what they changed from. */}
                <span className="text-xs text-muted">default {entry.default}</span>
                <input
                  type="number"
                  value={valueOf(entry.key, entry.value)}
                  onChange={(e) => setDirty((d) => ({ ...d, [entry.key]: e.target.value }))}
                  aria-label={LABELS[entry.key] ?? entry.key}
                  className={`w-24 rounded-lg border bg-canvas px-2 py-1.5 text-right text-sm tabular-nums text-primary outline-none focus:border-accent ${
                    entry.key in dirty ? 'border-accent' : 'border-subtle'
                  }`}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">Levels</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="pb-2 font-semibold">Rank</th>
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 text-right font-semibold">Min XP</th>
              </tr>
            </thead>
            <tbody>
              {config.levels.map((level) => {
                const nameKey = `level.${level.rank}.name`;
                const minKey = `level.${level.rank}.minXp`;
                return (
                  <tr key={level.rank} className="border-t border-subtle">
                    <td className="py-2 tabular-nums text-secondary">{level.rank}</td>
                    <td className="py-2 pr-2">
                      <input
                        value={valueOf(nameKey, level.name)}
                        onChange={(e) => setDirty((d) => ({ ...d, [nameKey]: e.target.value }))}
                        aria-label={`Level ${level.rank} name`}
                        className={`w-full rounded-lg border bg-canvas px-2 py-1.5 text-sm text-primary outline-none focus:border-accent ${
                          nameKey in dirty ? 'border-accent' : 'border-subtle'
                        }`}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={valueOf(minKey, String(level.minXp))}
                        onChange={(e) => setDirty((d) => ({ ...d, [minKey]: e.target.value }))}
                        aria-label={`Level ${level.rank} minimum XP`}
                        className={`w-28 rounded-lg border bg-canvas px-2 py-1.5 text-right text-sm tabular-nums text-primary outline-none focus:border-accent ${
                          minKey in dirty ? 'border-accent' : 'border-subtle'
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
