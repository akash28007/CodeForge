export interface StreakResult {
  current: number;
  longest: number;
}

const DAY_MS = 86_400_000;

function toUtcDay(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/**
 * Current and longest run of consecutive active days.
 *
 * `dates` are YYYY-MM-DD strings and need not be sorted or unique.
 *
 * The current streak counts back from today, but a streak whose last activity was
 * *yesterday* still counts — otherwise every user's streak would appear broken until
 * the moment they submit something on a given day.
 */
export function computeStreaks(dates: string[], today: string): StreakResult {
  const days = [...new Set(dates)].map(toUtcDay).filter(Number.isFinite).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayDay = toUtcDay(today);
  const lastDay = days[days.length - 1];

  // Anything older than yesterday means the run has lapsed.
  if (lastDay < todayDay - 1) return { current: 0, longest };

  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i] === days[i - 1] + 1) current++;
    else break;
  }
  return { current, longest };
}
