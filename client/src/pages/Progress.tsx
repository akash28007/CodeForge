import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useGamification } from '../context/GamificationContext';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/ui/Dropdown';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ui/ProgressBar';
import { ErrorState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import LevelBadge, { LevelBadgeIcon } from '../components/LevelBadge';
import { levelForXp } from '../utils/levels';
import GaugeChart from '../components/charts/GaugeChart';
import DonutChart from '../components/charts/DonutChart';
import ActivityHeatmap from '../components/charts/ActivityHeatmap';
import LineChart from '../components/charts/LineChart';
import type { ActivityDay } from '../components/charts/ActivityCalendar';
import ProfileSidebar, { type ProfileCard } from './progress/ProfileSidebar';
import BadgesSection from './progress/BadgesSection';
import { IconCheckCircle, IconClock, IconCpu, IconFlame } from '../components/icons';

interface Analytics {
  range: string;
  totals: { submissions: number; accepted: number; solved: number; problemsAvailable: number };
  byDifficulty: { difficulty: string; solved: number; total: number }[];
  acceptanceRate: number | null;
  betterThanPercent: number | null;
  avgAttempts: number | null;
  avgSolveMs: number | null;
  firstTryRate: number | null;
  runtimePercentile: number | null;
  languages: { language: string; count: number }[];
  hourHistogram: { hour: number; count: number }[];
  solvedOverTime: { date: string; total: number }[];
}

interface SkillRow {
  topic: string;
  xp: number;
  solved: number;
}

const RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'year', label: 'This Year' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
];

/*
 * Graphics use the theme-independent "--c-bar-*" set: a donut segment and a progress bar
 * are not text, so they are not bound by the 4.5:1 rule that forces the light theme's
 * difficulty *labels* to be dark. Labels elsewhere still use "text-easy" and friends,
 * which do change per theme.
 */
const difficultyColor: Record<string, string> = {
  EASY: 'rgb(var(--c-bar-easy))',
  MEDIUM: 'rgb(var(--c-bar-medium))',
  HARD: 'rgb(var(--c-bar-hard))',
};

const difficultyBar: Record<string, string> = {
  EASY: 'bg-barEasy',
  MEDIUM: 'bg-barMedium',
  HARD: 'bg-barHard',
};

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default function Progress() {
  const { summary, refresh: refreshGamification } = useGamification();

  const [range, setRange] = useState('all');
  const [card, setCard] = useState<ProfileCard | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCard = useCallback(async () => {
    const res = await api.get<ProfileCard>('/me/profile-card');
    setCard(res.data);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, activityRes, skillsRes] = await Promise.all([
        api.get<Analytics>(`/me/analytics?range=${range}`),
        api.get<{ days: ActivityDay[] }>('/me/activity?days=200'),
        api.get<SkillRow[]>('/me/skills'),
      ]);
      setAnalytics(analyticsRes.data);
      setActivity(activityRes.data.days);
      setSkills(skillsRes.data);
      await loadCard();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your progress.'));
    } finally {
      setLoading(false);
    }
  }, [range, loadCard]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (error) return <ErrorState description={error} onRetry={() => void loadAll()} />;

  if (loading && !analytics) {
    return (
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SkeletonRows rows={6} className="h-16" />
        <SkeletonRows rows={5} className="h-28" />
      </div>
    );
  }

  if (!analytics || !card || !summary) return null;

  const peakHour = analytics.hourHistogram.reduce((best, h) => (h.count > best.count ? h : best), {
    hour: 0,
    count: 0,
  });
  const maxHourCount = Math.max(...analytics.hourHistogram.map((h) => h.count), 1);
  const maxSkillXp = Math.max(...skills.map((s) => s.xp), 1);
  const nextLevel = summary.nextLevel;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ProfileSidebar
        card={card}
        onUpdated={() => {
          void loadCard();
          void refreshGamification();
        }}
      />

      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-primary">Progress Overview</h1>
            <p className="text-sm text-secondary">Track your coding journey and improvement.</p>
          </div>
          <Dropdown options={RANGES} value={range} onChange={setRange} className="w-40" />
        </header>

        {/* ── XP / level card ── */}
        <section className="rounded-xl border border-subtle bg-surface p-5">
          <div className="flex flex-wrap items-center gap-4">
            <LevelBadgeIcon level={levelForXp(summary.xp)} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge xp={summary.xp} size="md" />
                <span className="text-sm font-bold tabular-nums text-primary">
                  {summary.xp.toLocaleString()} XP
                </span>
              </div>
              <ProgressBar value={summary.percentToNext} size="md" className="mt-3" />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted">{summary.percentToNext}% complete</span>
                {nextLevel ? (
                  <span className="text-secondary">
                    <span className="font-semibold text-primary">{summary.xpRemaining.toLocaleString()} XP</span> to{' '}
                    {nextLevel.name}
                  </span>
                ) : (
                  <span className="text-medium">Max level reached</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── charts row ── */}
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <h2 className="mb-3 font-semibold text-primary">Overall Progress</h2>
            <GaugeChart
              value={analytics.totals.solved}
              max={analytics.totals.problemsAvailable}
              centerValue={`${analytics.totals.solved} / ${analytics.totals.problemsAvailable}`}
              centerLabel="Problems Solved"
            />
            <ul className="mt-3 flex flex-col gap-2">
              {analytics.byDifficulty.map((d) => (
                <li key={d.difficulty}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-secondary">
                      {d.difficulty.charAt(0) + d.difficulty.slice(1).toLowerCase()}
                    </span>
                    <span className="tabular-nums text-muted">
                      {d.solved} / {d.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                    <div
                      className={`h-full rounded-full ${difficultyBar[d.difficulty]}`}
                      style={{ width: `${d.total ? (d.solved / d.total) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-subtle bg-surface p-5">
            <h2 className="mb-3 font-semibold text-primary">Difficulty Breakdown</h2>
            <DonutChart
              slices={analytics.byDifficulty.map((d) => ({
                label: d.difficulty.charAt(0) + d.difficulty.slice(1).toLowerCase(),
                value: d.solved,
                color: difficultyColor[d.difficulty],
              }))}
              centerValue={String(analytics.totals.solved)}
              centerLabel="Solved"
            />
          </section>
        </div>

        <BadgesSection badges={summary.badges} />

        {/* ── headline stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<IconCheckCircle className="h-4 w-4" />}
            label="Problems Solved"
            value={analytics.totals.solved}
            caption={`Out of ${analytics.totals.problemsAvailable}`}
            tone="text-easy"
          />
          <StatCard
            icon={<IconCpu className="h-4 w-4" />}
            label="Acceptance Rate"
            value={analytics.acceptanceRate === null ? '—' : `${analytics.acceptanceRate}%`}
            caption={
              analytics.betterThanPercent === null
                ? 'No one else to compare with yet'
                : `Better than ${analytics.betterThanPercent}% of users`
            }
            tone="text-accent"
          />
          <StatCard
            icon={<IconClock className="h-4 w-4" />}
            label="Avg. Time to Solve"
            value={formatDuration(analytics.avgSolveMs)}
            caption="First attempt to accepted"
            tone="text-info"
          />
          <StatCard
            icon={<IconFlame className="h-4 w-4" />}
            label="Consistency"
            value={`${summary.streak.current}d`}
            caption={`Longest streak: ${summary.streak.longest} days`}
            tone="text-medium"
          />
        </div>

        {/* ── secondary analytics ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Avg. Attempts"
            value={analytics.avgAttempts ?? '—'}
            caption="Per solved problem"
          />
          <StatCard
            label="First-Try Rate"
            value={analytics.firstTryRate === null ? '—' : `${analytics.firstTryRate}%`}
            caption="Solved on the first submission"
          />
          <StatCard
            label="Runtime Percentile"
            value={analytics.runtimePercentile === null ? '—' : `${analytics.runtimePercentile}th`}
            caption={analytics.runtimePercentile === null ? 'Needs other users to compare against' : 'Across your accepted solutions'}
          />
        </div>

        <section className="rounded-xl border border-subtle bg-surface p-5">
          <h2 className="mb-3 font-semibold text-primary">Submission Activity</h2>
          <ActivityHeatmap days={activity} />
        </section>

        <section className="rounded-xl border border-subtle bg-surface p-5">
          <h2 className="mb-3 font-semibold text-primary">Problems Solved Over Time</h2>
          <LineChart points={analytics.solvedOverTime.map((p) => ({ date: p.date, value: p.total }))} />
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <h2 className="mb-3 font-semibold text-primary">Skill XP by Topic</h2>
            {skills.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Solve a problem to start building topic mastery.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {skills.slice(0, 8).map((s) => (
                  <li key={s.topic}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-secondary">{s.topic}</span>
                      <span className="tabular-nums text-muted">
                        {s.xp} XP · {s.solved} solved
                      </span>
                    </div>
                    <ProgressBar value={(s.xp / maxSkillXp) * 100} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-subtle bg-surface p-5">
            <h2 className="mb-1 font-semibold text-primary">Peak Activity Time</h2>
            <p className="mb-3 text-xs text-muted">
              {peakHour.count > 0
                ? `You submit most around ${String(peakHour.hour).padStart(2, '0')}:00`
                : 'No submissions in this range'}
            </p>
            <div className="flex h-28 items-end gap-[3px]">
              {analytics.hourHistogram.map((h) => (
                <div
                  key={h.hour}
                  title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count} submission${h.count === 1 ? '' : 's'}`}
                  className="flex-1 rounded-t-sm bg-accent/70 transition-colors hover:bg-accent"
                  style={{ height: `${Math.max(3, (h.count / maxHourCount) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
