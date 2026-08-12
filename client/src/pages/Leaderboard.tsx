import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import Avatar from '../components/ui/Avatar';
import Dropdown from '../components/ui/Dropdown';
import Pagination from '../components/ui/Pagination';
import ProgressBar from '../components/ui/ProgressBar';
import { EmptyState, ErrorState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ButtonLink } from '../components/ui/Button';
import LevelBadge, { LevelBadgeIcon } from '../components/LevelBadge';
import { levelForXp } from '../utils/levels';
import { IconFlame, IconTrophy } from '../components/icons';

interface Entry {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  xp: number;
  level: { rank: number; name: string; minXp: number };
  solvedCount: number;
  hardSolved: number;
  acceptance: number;
  streak: number;
}

interface LeaderboardResponse {
  entries: Entry[];
  total: number;
  page: number;
  pageSize: number;
  period: string;
  currentUser: Entry | null;
}

interface LevelBucket {
  rank: number;
  name: string;
  minXp: number;
  users: number;
}

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
];

const podiumAccent = ['text-medium', 'text-secondary', 'text-error'];
const podiumRing = ['ring-medium/40', 'ring-muted/30', 'ring-error/30'];

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${podiumAccent[rank - 1]}`}>
        <IconTrophy className="h-4 w-4" />
        {rank}
      </span>
    );
  }
  return <span className="tabular-nums text-muted">{rank}</span>;
}

function UserCell({ entry }: { entry: Entry }) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <Avatar name={entry.name} src={entry.avatarUrl} size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-primary">{entry.name}</span>
        {entry.username && <span className="block truncate text-xs text-muted">@{entry.username}</span>}
      </span>
    </span>
  );
  return entry.username ? (
    <Link to={`/u/${entry.username}`} className="transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [levels, setLevels] = useState<LevelBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [board, distribution] = await Promise.all([
        api.get<LeaderboardResponse>(`/leaderboard?period=${period}&page=${page}&pageSize=25`),
        api.get<LevelBucket[]>('/leaderboard/levels'),
      ]);
      setData(board.data);
      setLevels(distribution.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the leaderboard.'));
    } finally {
      setLoading(false);
    }
  }, [period, page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  const podium = data && data.page === 1 ? data.entries.slice(0, 3) : [];
  const maxLevelUsers = Math.max(...levels.map((l) => l.users), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-primary">
              <IconTrophy className="h-5 w-5 text-medium" />
              Leaderboard
            </h1>
            <p className="mt-1 text-sm text-secondary">
              Ranked by total XP. Ties break on problems solved, then hard problems.
            </p>
          </div>
          <Dropdown
            options={PERIODS}
            value={period}
            onChange={(v) => {
              setPeriod(v);
              setPage(1);
            }}
            className="w-40"
          />
        </header>

        {loading && !data ? (
          <SkeletonRows rows={8} />
        ) : !data || data.total === 0 ? (
          <EmptyState
            icon={<IconTrophy />}
            title="Nobody has earned XP yet"
            description="Solve your first problem to claim the top spot."
            action={<ButtonLink to="/problems" size="sm">Browse problems</ButtonLink>}
          />
        ) : (
          <>
            {podium.length === 3 && (
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {podium.map((entry, i) => (
                  <div
                    key={entry.userId}
                    className={`flex flex-col items-center rounded-xl border border-subtle bg-surface p-4 text-center ring-1 ${podiumRing[i]}`}
                  >
                    <span className={`text-xs font-bold uppercase tracking-wide ${podiumAccent[i]}`}>
                      #{entry.rank}
                    </span>
                    <div className="my-2">
                      <Avatar name={entry.name} src={entry.avatarUrl} size="lg" />
                    </div>
                    <p className="truncate font-semibold text-primary">{entry.name}</p>
                    <div className="mt-1.5">
                      <LevelBadge xp={entry.xp} />
                    </div>
                    <p className="mt-2 text-lg font-bold tabular-nums text-primary">
                      {entry.xp.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-muted">XP</span>
                    </p>
                    <p className="text-xs text-muted">{entry.solvedCount} solved</p>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-subtle bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-raised/50 text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="w-16 px-4 py-2.5 font-medium">Rank</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">User</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Level</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">XP</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Solved</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Hard</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">Acceptance</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((entry) => {
                      const isMe = entry.userId === user?.id;
                      return (
                        <tr
                          key={entry.userId}
                          className={`border-t border-subtle transition-colors ${
                            isMe ? 'bg-accent/10' : 'hover:bg-raised/40'
                          }`}
                        >
                          <td className="px-4 py-2.5"><RankCell rank={entry.rank} /></td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <UserCell entry={entry} />
                              {isMe && (
                                <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><LevelBadge xp={entry.xp} /></td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primary">
                            {entry.xp.toLocaleString()}
                          </td>
                          <td className="hidden px-4 py-2.5 text-right tabular-nums text-secondary sm:table-cell">
                            {entry.solvedCount}
                          </td>
                          <td className="hidden px-4 py-2.5 text-right tabular-nums text-hard md:table-cell">
                            {entry.hardSolved}
                          </td>
                          <td className="hidden px-4 py-2.5 text-right tabular-nums text-secondary lg:table-cell">
                            {entry.acceptance}%
                          </td>
                          <td className="hidden px-4 py-2.5 text-right sm:table-cell">
                            {entry.streak > 0 ? (
                              <span className="inline-flex items-center gap-1 tabular-nums text-medium">
                                <IconFlame className="h-3.5 w-3.5" />
                                {entry.streak}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pinned so you can find yourself even from deep in the rankings. */}
              {data.currentUser && !data.entries.some((e) => e.userId === data.currentUser?.userId) && (
                <div className="flex items-center justify-between gap-3 border-t-2 border-accent/30 bg-accent/10 px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <RankCell rank={data.currentUser.rank} />
                    <UserCell entry={data.currentUser} />
                    <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                      You
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums text-primary">
                    {data.currentUser.xp.toLocaleString()} XP
                  </span>
                </div>
              )}
            </div>

            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        {data?.currentUser && (
          <section className="rounded-xl border border-subtle bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Your Standing</h2>
            <div className="flex items-center gap-3">
              <LevelBadgeIcon level={levelForXp(data.currentUser.xp)} className="h-10 w-10" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-primary">#{data.currentUser.rank}</p>
                <p className="text-xs text-muted">of {data.total} ranked</p>
              </div>
            </div>
            <dl className="mt-3 flex flex-col gap-1.5 border-t border-subtle pt-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">XP</dt>
                <dd className="font-semibold tabular-nums text-primary">
                  {data.currentUser.xp.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Solved</dt>
                <dd className="tabular-nums text-secondary">{data.currentUser.solvedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Acceptance</dt>
                <dd className="tabular-nums text-secondary">{data.currentUser.acceptance}%</dd>
              </div>
            </dl>
            {(() => {
              // How far to the next person up — concrete and motivating, not just a rank.
              const ahead = data.entries
                .filter((e) => e.rank < (data.currentUser?.rank ?? 0))
                .sort((a, b) => b.rank - a.rank)[0];
              if (!ahead || !data.currentUser) return null;
              const gap = ahead.xp - data.currentUser.xp;
              return (
                <p className="mt-3 border-t border-subtle pt-3 text-xs text-secondary">
                  <span className="font-semibold text-primary">{gap.toLocaleString()} XP</span> to overtake{' '}
                  {ahead.name}
                </p>
              );
            })()}
          </section>
        )}

        <section className="rounded-xl border border-subtle bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-primary">Level Distribution</h2>
          {levels.length === 0 ? (
            <p className="text-xs text-muted">No ranked users yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {levels.map((bucket) => (
                <li key={bucket.rank}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-secondary">{bucket.name}</span>
                    <span className="tabular-nums text-muted">{bucket.users}</span>
                  </div>
                  <ProgressBar value={(bucket.users / maxLevelUsers) * 100} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
