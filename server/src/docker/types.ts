export interface CompileResult {
  success: boolean;
  /** Host directory containing the compiled binary. Only set when success is true. */
  binaryDir?: string;
  stderr: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  /** Heuristic: process was killed by SIGKILL (137) and it wasn't our own timeout kill — almost certainly the OOM killer. */
  oomKilled: boolean;
  runtimeMs: number;
  /** Peak resident set size from `time -v`. Null when the process was killed before `time` could report (e.g. our own timeout). */
  memoryKb: number | null;
}
