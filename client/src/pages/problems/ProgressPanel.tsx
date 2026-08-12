import ProgressRing from '../../components/charts/ProgressRing';
import ActivityCalendar, { type ActivityDay } from '../../components/charts/ActivityCalendar';
import { IconFlame } from '../../components/icons';

export interface ProgressData {
  solved: number;
  total: number;
  byDifficulty: { difficulty: string; solved: number; total: number }[];
}

interface Props {
  progress: ProgressData | null;
  activity: { days: ActivityDay[]; activeDays: number } | null;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

// Fills use the theme-independent set; the labels below stay theme-aware.
const barColor: Record<string, string> = {
  EASY: 'bg-barEasy',
  MEDIUM: 'bg-barMedium',
  HARD: 'bg-barHard',
};

const labelColor: Record<string, string> = {
  EASY: 'text-easy',
  MEDIUM: 'text-medium',
  HARD: 'text-hard',
};

export default function ProgressPanel({ progress, activity, selectedDate, onSelectDate }: Props) {
  const selectedCount = selectedDate ? (activity?.days.find((d) => d.date === selectedDate)?.count ?? 0) : null;

  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-xl border border-subtle bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">Calendar</h2>
        <ActivityCalendar days={activity?.days ?? []} selected={selectedDate} onSelect={onSelectDate} />
        {selectedDate && (
          <p className="mt-3 border-t border-subtle pt-3 text-xs text-secondary">
            <span className="font-semibold text-primary">{selectedCount}</span> submission
            {selectedCount === 1 ? '' : 's'} on {selectedDate}
          </p>
        )}
      </section>

      <section className="flex items-center justify-between rounded-xl border border-subtle bg-surface px-4 py-3">
        <span className="text-sm font-medium text-secondary">Active Days</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-primary">
          <IconFlame className="h-4 w-4 text-medium" />
          {activity?.activeDays ?? 0}
        </span>
      </section>

      <section className="rounded-xl border border-subtle bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">Progress</h2>
        {!progress ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <ProgressRing value={progress.solved} max={progress.total} caption="Solved" size={104} />
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wide text-muted">Total Problems</p>
                <p className="font-bold text-primary tabular-nums">{progress.total}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-muted">Solved</p>
                <p className="text-lg font-bold text-primary tabular-nums">{progress.solved}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {progress.byDifficulty.map((d) => {
                const label = d.difficulty.charAt(0) + d.difficulty.slice(1).toLowerCase();
                const pct = d.total > 0 ? (d.solved / d.total) * 100 : 0;
                return (
                  <div key={d.difficulty}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      {/* Direct label on every row — difficulty is never encoded by colour alone. */}
                      <span className={`font-medium ${labelColor[d.difficulty]}`}>{label}</span>
                      <span className="tabular-nums text-muted">
                        {d.solved} / {d.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor[d.difficulty]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </aside>
  );
}
