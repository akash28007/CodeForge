import { useMemo } from 'react';
import type { ActivityDay } from './ActivityCalendar';

const DAY_MS = 86_400_000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sequential ramp — one hue, monotonically lighter as the count rises. */
function levelVar(count: number): string {
  if (count <= 0) return '--c-heat-0';
  if (count === 1) return '--c-heat-1';
  if (count <= 3) return '--c-heat-2';
  if (count <= 6) return '--c-heat-3';
  return '--c-heat-4';
}

function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GitHub-style contribution grid: one column per week, one cell per day.
 * Scrolls horizontally rather than squeezing cells below a usable hit target.
 */
export default function ActivityHeatmap({ days, weeks = 27 }: { days: ActivityDay[]; weeks?: number }) {
  const counts = useMemo(() => new Map(days.map((d) => [d.date, d.count])), [days]);

  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Wind back to the Sunday that starts the earliest visible week.
    const start = new Date(today.getTime() - (weeks * 7 - 1) * DAY_MS);
    start.setDate(start.getDate() - start.getDay());

    const cols: { date: Date; iso: string }[][] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const week: { date: Date; iso: string }[] = [];
      for (let d = 0; d < 7; d++) {
        week.push({ date: new Date(cursor), iso: key(cursor) });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(week);
    }
    return cols;
  }, [weeks]);

  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1">
            {columns.map((week, i) => {
              const first = week[0].date;
              const showLabel = first.getDate() <= 7;
              return (
                <span key={i} className="w-3 text-[9px] text-muted">
                  {showLabel ? MONTH_LABELS[first.getMonth()] : ''}
                </span>
              );
            })}
          </div>

          <div className="flex gap-1">
            {columns.map((week, i) => (
              <div key={i} className="flex flex-col gap-1">
                {week.map(({ date, iso }) => {
                  const isFuture = date > new Date();
                  const count = counts.get(iso) ?? 0;
                  return (
                    <span
                      key={iso}
                      title={isFuture ? '' : `${count} submission${count === 1 ? '' : 's'} on ${iso}`}
                      className={`h-3 w-3 rounded-sm ${isFuture ? 'opacity-0' : ''}`}
                      style={{ backgroundColor: `rgb(var(${levelVar(count)}))` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span>{total} submissions</span>
        <span className="ml-auto flex items-center gap-1">
          Less
          {['--c-heat-0', '--c-heat-1', '--c-heat-2', '--c-heat-3', '--c-heat-4'].map((v) => (
            <span key={v} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgb(var(${v}))` }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
