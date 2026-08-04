import { parseTimedStderr } from './docker-executor.service';

const TIME_REPORT = `\tCommand being timed: "/sandbox/bin/a.out"
\tUser time (seconds): 0.01
\tSystem time (seconds): 0.00
\tPercent of CPU this job got: 90%
\tElapsed (wall clock) time (h:mm:ss or m:ss): 0:00.02
\tMaximum resident set size (kbytes): 3400
\tExit status: 0`;

describe('parseTimedStderr', () => {
  it('separates the program\'s own stderr from the trailing time report', () => {
    const raw = `some real error output from the program\n${TIME_REPORT}`;

    const { stderr, memoryKb } = parseTimedStderr(raw);

    expect(stderr).toBe('some real error output from the program\n');
    expect(memoryKb).toBe(3400);
  });

  it('returns the whole thing as stderr, with null memory, when time never got to report (e.g. our own timeout kill)', () => {
    const raw = 'partial output before being killed\n';

    const { stderr, memoryKb } = parseTimedStderr(raw);

    expect(stderr).toBe(raw);
    expect(memoryKb).toBeNull();
  });

  it('handles a program with empty stderr', () => {
    const { stderr, memoryKb } = parseTimedStderr(TIME_REPORT);

    expect(stderr).toBe('');
    expect(memoryKb).toBe(3400);
  });

  it('returns null memory if the report is present but the RSS line is missing (defensive: unexpected time output format)', () => {
    const raw = '\tCommand being timed: "x"\n\tExit status: 0';

    const { memoryKb } = parseTimedStderr(raw);

    expect(memoryKb).toBeNull();
  });
});
