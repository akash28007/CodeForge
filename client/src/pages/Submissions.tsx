import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import { DifficultyBadge, VerdictPill, statusMeta } from '../components/Badge';
import Dropdown from '../components/ui/Dropdown';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ButtonLink } from '../components/ui/Button';
import CodeEditor from '../components/CodeEditor';
import { IconClipboard } from '../components/icons';

interface SubmissionRow {
  id: string;
  problemId: string;
  problem: { title: string; difficulty: string };
  language: string;
  status: string;
  runtime: number | null;
  memory: number | null;
  passedCount: number | null;
  totalCount: number | null;
  errorMessage: string | null;
  submittedAt: string;
}

interface SubmissionsResponse {
  items: SubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface SubmissionDetail extends SubmissionRow {
  code: string;
}

const ACTIVE = ['PENDING', 'RUNNING'];

const VERDICTS = [
  { value: '', label: 'All verdicts' },
  ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label })),
];

const DIFFICULTIES = [
  { value: '', label: 'All difficulties' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Submissions() {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [verdict, setVerdict] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [language, setLanguage] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState<SubmissionDetail | null>(null);
  const [openLoading, setOpenLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (verdict) params.set('status', verdict);
    if (difficulty) params.set('difficulty', difficulty);
    if (language) params.set('language', language);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));
    params.set('pageSize', '20');
    return params.toString();
  }, [verdict, difficulty, language, from, to, page]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SubmissionsResponse>(`/submissions?${query}`);
      setData(res.data);
      setError(null);
      return res.data;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your submissions.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void api.get<string[]>('/submissions/languages').then((r) => setLanguages(r.data)).catch(() => setLanguages([]));
  }, []);

  // Keep polling only while something is still being judged.
  useEffect(() => {
    if (!data?.items.some((s) => ACTIVE.includes(s.status))) return;
    const timer = setTimeout(() => void load(), 2000);
    return () => clearTimeout(timer);
  }, [data, load]);

  async function openSubmission(row: SubmissionRow) {
    setOpenLoading(true);
    try {
      const res = await api.get<SubmissionDetail>(`/submission/${row.id}`);
      setOpen({ ...row, ...res.data });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load that submission.'));
    } finally {
      setOpenLoading(false);
    }
  }

  function resetFilters() {
    setVerdict('');
    setDifficulty('');
    setLanguage('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const hasFilters = Boolean(verdict || difficulty || language || from || to);
  const dateInputCls =
    'rounded-lg border border-subtle bg-surface px-2.5 py-1.5 text-sm text-primary outline-none transition-colors focus:border-accent';

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-primary">Submissions</h1>
        <p className="mt-1 text-sm text-secondary">Every solution you have submitted, newest first.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Dropdown options={VERDICTS} value={verdict} onChange={(v) => { setVerdict(v); setPage(1); }} className="w-48" />
        <Dropdown options={DIFFICULTIES} value={difficulty} onChange={(v) => { setDifficulty(v); setPage(1); }} className="w-44" />
        <Dropdown
          options={[{ value: '', label: 'All languages' }, ...languages.map((l) => ({ value: l, label: l.toUpperCase() }))]}
          value={language}
          onChange={(v) => { setLanguage(v); setPage(1); }}
          className="w-40"
        />
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={dateInputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={dateInputCls} />
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : loading && !data ? (
        <SkeletonRows rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconClipboard />}
          title={hasFilters ? 'No submissions match these filters' : 'No submissions yet'}
          description={
            hasFilters ? 'Try widening the date range or clearing a filter.' : 'Solve a problem to see your history here.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
            ) : (
              <ButtonLink to="/problems" size="sm">Browse problems</ButtonLink>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-subtle bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-raised/50 text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-2.5 font-medium">Problem</th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Difficulty</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Verdict</th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Language</th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Runtime</th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">Memory</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => void openSubmission(row)}
                      className="cursor-pointer border-t border-subtle transition-colors hover:bg-raised/40"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/problems/${row.problemId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-primary hover:text-accent"
                        >
                          {row.problem.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <DifficultyBadge difficulty={row.problem.difficulty} />
                      </td>
                      <td className="px-4 py-2.5">
                        <VerdictPill
                          status={row.status}
                          compact
                          subtitle={row.totalCount != null ? `${row.passedCount}/${row.totalCount}` : undefined}
                        />
                      </td>
                      <td className="hidden px-4 py-2.5 text-secondary md:table-cell">{row.language.toUpperCase()}</td>
                      <td className="hidden px-4 py-2.5 text-right tabular-nums text-secondary md:table-cell">
                        {row.runtime != null ? `${row.runtime}ms` : '—'}
                      </td>
                      <td className="hidden px-4 py-2.5 text-right tabular-nums text-secondary lg:table-cell">
                        {row.memory != null ? `${row.memory}KB` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted">{relativeTime(row.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} className="mt-4" />
        </>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.problem.title ?? 'Submission'} size="lg">
        {open && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <VerdictPill
                status={open.status}
                subtitle={open.totalCount != null ? `${open.passedCount}/${open.totalCount} test cases` : undefined}
              />
              <span className="text-xs text-muted">
                {open.language.toUpperCase()} · {relativeTime(open.submittedAt)}
                {open.runtime != null && ` · ${open.runtime}ms`}
                {open.memory != null && ` · ${open.memory}KB`}
              </span>
            </div>
            {open.errorMessage && (
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-3 font-mono text-xs text-secondary">
                {open.errorMessage}
              </pre>
            )}
            <div className="h-72 overflow-hidden rounded-lg border border-subtle">
              <CodeEditor value={open.code} onChange={() => {}} language={open.language} fontSize={13} readOnly />
            </div>
            <div className="flex justify-end">
              <ButtonLink to={`/problems/${open.problemId}`} size="sm" variant="outline">
                Open problem
              </ButtonLink>
            </div>
          </div>
        )}
        {openLoading && <p className="text-sm text-muted">Loading…</p>}
      </Modal>
    </div>
  );
}
