import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons';

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityCalendarProps {
  days: ActivityDay[];
  selected: string | null;
  onSelect: (date: string | null) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Sequential ramp: one hue, monotonically lighter as the count rises. */
function intensityVar(count: number): string {
  if (count <= 0) return 'var(--c-heat-0)';
  if (count === 1) return 'var(--c-heat-1)';
  if (count <= 3) return 'var(--c-heat-2)';
  if (count <= 6) return 'var(--c-heat-3)';
  return 'var(--c-heat-4)';
}

export default function ActivityCalendar({ days, selected, onSelect }: ActivityCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const countsByDate = useMemo(() => new Map(days.map((d) => [d.date, d.count])), [days]);
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-primary"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-primary">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-primary"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-[10px] font-medium text-muted">
            {d}
          </span>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <span key={`pad-${i}`} />;

          const key = toKey(cursor.year, cursor.month, day);
          const count = countsByDate.get(key) ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;

          return (
            <button
              key={key}
              onClick={() => onSelect(isSelected ? null : key)}
              title={`${count} submission${count === 1 ? '' : 's'} on ${key}`}
              aria-label={`${key}: ${count} submissions`}
              aria-pressed={isSelected}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums transition-colors ${
                isSelected ? 'ring-2 ring-accent' : ''
              } ${isToday && !isSelected ? 'ring-1 ring-muted' : ''} ${
                /*
                 * Ink flips at the same ramp step in both themes, which is why two
                 * classes suffice: steps 1-2 are the dark end in dark mode and the
                 * light end in light mode, so `primary` is legible on both; steps 3-4
                 * are the reverse, where `canvas` is. Hard-coding white failed on the
                 * light theme's pale low steps.
                 */
                count > 3
                  ? 'font-semibold text-canvas'
                  : count > 0
                    ? 'font-semibold text-primary'
                    : 'text-secondary hover:bg-raised'
              }`}
              style={count > 0 ? { backgroundColor: `rgb(${intensityVar(count)})` } : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
