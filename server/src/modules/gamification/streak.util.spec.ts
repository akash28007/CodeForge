import { computeStreaks } from './streak.util';

describe('computeStreaks', () => {
  const TODAY = '2026-08-09';

  it('returns zeroes when there is no activity', () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single active day today', () => {
    expect(computeStreaks(['2026-08-09'], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('counts consecutive days ending today', () => {
    const dates = ['2026-08-07', '2026-08-08', '2026-08-09'];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when the last activity was yesterday', () => {
    // Otherwise every streak would read as broken until the user submits again today.
    const dates = ['2026-08-07', '2026-08-08'];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it('breaks the current streak once activity is older than yesterday', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 0, longest: 3 });
  });

  it('remembers the longest run even after it lapses', () => {
    const dates = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-08-08', '2026-08-09'];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 2, longest: 4 });
  });

  it('ignores duplicate and unsorted dates', () => {
    const dates = ['2026-08-09', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-08'];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('handles a run that spans a month boundary', () => {
    const dates = ['2026-07-30', '2026-07-31', '2026-08-01'];
    expect(computeStreaks(dates, '2026-08-01')).toEqual({ current: 3, longest: 3 });
  });
});
