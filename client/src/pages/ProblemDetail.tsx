import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { useSplitPane } from '../hooks/useSplitPane';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { clearDraft, loadDraft, saveDraft } from '../utils/draftStorage';
import { DifficultyBadge, TopicChip } from '../components/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { ConfirmModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { EmptyState, ErrorState } from '../components/ui/States';
import CodeEditor from '../components/CodeEditor';
import CopyBlock from './problem/CopyBlock';
import ResultPanel, { type RunResult, type SubmissionResult } from './problem/ResultPanel';
import SubmissionsTab, { type ProblemSubmission } from './problem/SubmissionsTab';
import {
  IconBookmark,
  IconCheckCircle,
  IconLock,
  IconPlay,
  IconSend,
  IconTrash,
} from '../components/icons';

interface ProblemDetailData {
  id: string;
  title: string;
  difficulty: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  timeLimit: number;
  memoryLimit: number;
  tags: string[];
  acceptance: number;
  totalSubmissions: number;
  solved: boolean;
  bookmarked: boolean;
  hasEditorial: boolean;
}

const DEFAULT_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`;

const TERMINAL = [
  'ACCEPTED',
  'WRONG_ANSWER',
  'RUNTIME_ERROR',
  'COMPILE_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
];

const FONT_SIZES = [
  { value: '12', label: '12px' },
  { value: '13', label: '13px' },
  { value: '14', label: '14px' },
  { value: '16', label: '16px' },
];

// C++ is the only language the judge accepts today; the selector exists so adding more
// is a data change rather than a UI rewrite.
const LANGUAGES = [{ value: 'cpp', label: 'C++ (GNU g++)' }];

type Tab = 'description' | 'submissions' | 'editorial';

export default function ProblemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const { containerRef, ratio, dragging, startDrag, onKeyDown } = useSplitPane();

  /**
   * Below `lg` the two panes stack, and the statement is several screens tall on a
   * phone — which buried the editor far below the fold. Under that breakpoint we show
   * one pane at a time instead, so the editor is always one tap away.
   */
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobilePane, setMobilePane] = useState<'problem' | 'code'>('problem');

  const [problem, setProblem] = useState<ProblemDetailData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('description');

  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('cpp');
  const [fontSize, setFontSize] = useState(13);

  const [mode, setMode] = useState<'run' | 'submit' | null>(null);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<ProblemSubmission[] | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [editorial, setEditorial] = useState<string | null>(null);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── load the problem ── */
  useEffect(() => {
    if (!id) return;
    setProblem(null);
    setLoadError(null);
    api
      .get<ProblemDetailData>(`/problem/${id}`)
      .then((res) => setProblem(res.data))
      .catch((err) => setLoadError(getErrorMessage(err, 'Problem not found.')));
  }, [id]);

  /* ── restore any saved draft when the problem or language changes ── */
  useEffect(() => {
    if (!id) return;
    const draft = user ? loadDraft(user.id, id, language) : null;
    setCode(draft ?? DEFAULT_CODE);
  }, [id, language, user]);

  /* ── autosave, debounced so we aren't hammering localStorage per keystroke ── */
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (!user || !id) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const timer = setTimeout(() => saveDraft(user.id, id, language, code), 500);
    return () => clearTimeout(timer);
  }, [code, user, id, language]);

  const loadSubmissions = useCallback(async () => {
    if (!id || !user) return;
    setSubmissionsLoading(true);
    try {
      const res = await api.get<ProblemSubmission[]>(`/problem/${id}/submissions`);
      setSubmissions(res.data);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (tab === 'submissions') void loadSubmissions();
  }, [tab, loadSubmissions]);

  async function openEditorial() {
    if (!id) return;
    setTab('editorial');
    if (editorial !== null) return;
    setEditorialLoading(true);
    try {
      const res = await api.get<{ editorial: string | null }>(`/problem/${id}/editorial`);
      setEditorial(res.data.editorial ?? '');
    } catch (err) {
      push('error', 'Could not load the editorial', getErrorMessage(err, 'Please try again.'));
      setEditorial('');
    } finally {
      setEditorialLoading(false);
    }
  }

  /* ── run / submit ── */
  async function handleRun() {
    if (!id) return;
    setMode('run');
    setBusy(true);
    setRunResult(null);
    setSubmission(null);
    setActionError(null);
    try {
      const res = await api.post<RunResult>('/run', { problemId: id, code });
      setRunResult(res.data);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Run failed.'));
    } finally {
      setBusy(false);
    }
  }

  const pollSubmission = useCallback(async (submissionId: string) => {
    for (let i = 0; i < 40; i++) {
      const res = await api.get<SubmissionResult>(`/submission/${submissionId}`);
      setSubmission(res.data);
      if (TERMINAL.includes(res.data.status)) return res.data;
      await new Promise((r) => setTimeout(r, 800));
    }
    return null;
  }, []);

  async function handleSubmit() {
    if (!id) return;
    setMode('submit');
    setBusy(true);
    setRunResult(null);
    setSubmission(null);
    setActionError(null);
    try {
      const res = await api.post<SubmissionResult>('/submission', { problemId: id, code });
      setSubmission(res.data);
      const final = await pollSubmission(res.data.id);

      if (final?.status === 'ACCEPTED') {
        push('success', 'Accepted!', `All ${final.totalCount} test cases passed.`);
        setProblem((p) => (p ? { ...p, solved: true } : p));
      }
      // Keep the Submissions tab honest if the user switches to it next.
      setSubmissions(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Submission failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    if (!problem) return;
    const next = !problem.bookmarked;
    setProblem({ ...problem, bookmarked: next });
    try {
      if (next) await api.post(`/problem/${problem.id}/bookmark`);
      else await api.delete(`/problem/${problem.id}/bookmark`);
    } catch (err) {
      setProblem((p) => (p ? { ...p, bookmarked: !next } : p));
      push('error', 'Could not update bookmark', getErrorMessage(err, 'Please try again.'));
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/problem/${id}`);
      push('success', 'Problem deleted');
      navigate('/problems');
    } catch (err) {
      push('error', 'Delete failed', getErrorMessage(err, 'Please try again.'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function resetCode() {
    setCode(DEFAULT_CODE);
    if (user && id) clearDraft(user.id, id, language);
  }

  if (loadError) return <ErrorState title="Problem not found" description={loadError} />;
  if (!problem) return <p className="text-secondary">Loading…</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'description', label: 'Description' },
    ...(user ? ([{ key: 'submissions', label: 'Submissions' }] as { key: Tab; label: string }[]) : []),
    ...(problem.hasEditorial && user
      ? ([{ key: 'editorial', label: 'Editorial' }] as { key: Tab; label: string }[])
      : []),
  ];

  return (
    <>
      {/* Mobile-only pane switcher. Hidden from `lg` up, where both panes are visible
          side by side and the draggable divider takes over. */}
      <div
        role="tablist"
        aria-label="Switch between the problem and the editor"
        className="mb-3 flex gap-1 rounded-lg border border-subtle bg-surface p-1 lg:hidden"
      >
        {(['problem', 'code'] as const).map((pane) => (
          <button
            key={pane}
            role="tab"
            aria-selected={mobilePane === pane}
            onClick={() => setMobilePane(pane)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mobilePane === pane
                ? 'bg-raised text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {pane === 'problem' ? 'Problem' : 'Code'}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="flex flex-col gap-4 lg:h-[calc(100vh-7rem)] lg:flex-row lg:gap-0"
      >
      {/* ── left pane ── */}
      {/* `min-w-0` is load-bearing: a flex item defaults to `min-width: auto`, so
          without it the pane refuses to shrink below its content's intrinsic width and
          the divider silently stops responding in that direction. */}
      <section
        className={`${
          mobilePane === 'problem' ? 'flex' : 'hidden'
        } min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-subtle bg-surface lg:flex lg:shrink-0`}
        // Gated to desktop deliberately: below `lg` the container is `flex-col`, so a
        // percentage flex-basis would size this pane's HEIGHT rather than its width.
        // An inline style also outranks any Tailwind class, so this cannot be done in CSS.
        style={isDesktop ? { flexBasis: `${ratio}%` } : undefined}
      >
        <div className="flex items-center gap-1 border-b border-subtle px-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => (t.key === 'editorial' ? void openEditorial() : setTab(t.key))}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-accent text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'description' && (
            <article>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-bold text-primary">{problem.title}</h1>
                <div className="flex shrink-0 items-center gap-1">
                  {user && (
                    <button
                      onClick={() => void toggleBookmark()}
                      aria-label={problem.bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
                      aria-pressed={problem.bookmarked}
                      className={`rounded-md p-1.5 transition-colors ${
                        problem.bookmarked ? 'text-accent' : 'text-muted hover:text-primary'
                      }`}
                    >
                      <IconBookmark className="h-4 w-4" filled={problem.bookmarked} />
                    </button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <>
                      <Link
                        to={`/problems/${problem.id}/edit`}
                        className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(true)}
                        aria-label="Delete problem"
                        className="rounded-md p-1.5 text-muted transition-colors hover:text-hard"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                {problem.solved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-easy/10 px-2 py-0.5 text-xs font-semibold text-easy">
                    <IconCheckCircle className="h-3 w-3" />
                    Solved
                  </span>
                )}
                {problem.totalSubmissions > 0 && (
                  <span className="text-xs text-muted">
                    Acceptance <span className="font-medium text-secondary">{problem.acceptance}%</span>
                  </span>
                )}
                {problem.tags.map((t) => (
                  <TopicChip key={t} name={t} />
                ))}
              </div>

              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-primary">{problem.statement}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Input format</h3>
                  <p className="whitespace-pre-wrap text-sm text-secondary">{problem.inputFormat}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Output format</h3>
                  <p className="whitespace-pre-wrap text-sm text-secondary">{problem.outputFormat}</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Constraints</h3>
                <p className="whitespace-pre-wrap font-mono text-xs text-secondary">{problem.constraints}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CopyBlock label="Sample input" value={problem.sampleInput} />
                <CopyBlock label="Sample output" value={problem.sampleOutput} />
              </div>

              <p className="mt-4 border-t border-subtle pt-3 text-xs text-muted">
                Time limit {problem.timeLimit}ms · Memory limit {problem.memoryLimit}MB
              </p>
            </article>
          )}

          {tab === 'submissions' && <SubmissionsTab submissions={submissions} loading={submissionsLoading} />}

          {tab === 'editorial' &&
            (editorialLoading ? (
              <p className="text-sm text-muted">Loading editorial…</p>
            ) : editorial ? (
              <div>
                <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-medium/30 bg-medium/10 px-3 py-2 text-xs text-medium">
                  <IconLock className="h-3.5 w-3.5" />
                  Opening the editorial is recorded — solving without it earns a bonus.
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-primary">{editorial}</div>
              </div>
            ) : (
              <EmptyState title="No editorial yet" description="This problem doesn't have a written walkthrough." />
            ))}
        </div>
      </section>

      {/* ── draggable divider ── */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        tabIndex={0}
        onMouseDown={startDrag}
        onKeyDown={onKeyDown}
        className={`hidden shrink-0 cursor-col-resize items-center justify-center lg:flex lg:w-2 ${
          dragging ? 'bg-accent/40' : 'hover:bg-accent/25'
        } transition-colors`}
      >
        <span className="h-8 w-0.5 rounded-full bg-subtle" />
      </div>

      {/* ── right pane ── */}
      <section
        className={`${
          mobilePane === 'code' ? 'flex' : 'hidden'
        } min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex`}
      >
        {/* Monaco needs a parent with a resolved height. On desktop `flex-1` supplies it
            from the container's fixed height; below `lg` the container is auto-height, so
            flex-grow has nothing to distribute and an explicit viewport height is the
            only thing that gives the editor real space. */}
        <div className="flex h-[62vh] min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border border-subtle bg-surface lg:h-auto">
          <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-3 py-2">
            <Dropdown options={LANGUAGES} value={language} onChange={setLanguage} className="w-44" align="left" />
            <Dropdown
              options={FONT_SIZES}
              value={String(fontSize)}
              onChange={(v) => setFontSize(Number(v))}
              className="w-24"
              align="left"
            />
            <button
              onClick={resetCode}
              className="ml-auto rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
            >
              Reset to boilerplate
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              fontSize={fontSize}
              onRunShortcut={() => void handleRun()}
            />
          </div>

          {user ? (
            <div className="flex items-center gap-2 border-t border-subtle px-3 py-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRun()}
                disabled={busy}
                loading={busy && mode === 'run'}
                icon={<IconPlay className="h-3.5 w-3.5" />}
              >
                Run sample
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={busy}
                loading={busy && mode === 'submit'}
                icon={<IconSend className="h-3.5 w-3.5" />}
              >
                Submit
              </Button>
              <span className="ml-auto hidden text-[11px] text-muted sm:block">Ctrl+Enter to run</span>
            </div>
          ) : (
            <div className="border-t border-subtle px-3 py-2.5 text-sm text-secondary">
              <Link to="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>{' '}
              to run and submit solutions.
            </div>
          )}
        </div>

        {/* `max-h-[45%]` needs a definite parent height to resolve against, which only
            exists from `lg` up — hence the viewport-relative cap on mobile. */}
        <div className="max-h-[50vh] shrink-0 overflow-y-auto rounded-xl border border-subtle bg-surface lg:max-h-[45%]">
          <ResultPanel
            mode={mode}
            running={busy}
            runResult={runResult}
            submission={submission}
            error={actionError}
            timeLimit={problem.timeLimit}
            memoryLimit={problem.memoryLimit}
            expectedSample={problem.sampleOutput}
          />
        </div>
      </section>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title="Delete this problem?"
        description="This also permanently deletes every submission ever made against it — from every user, not just yours. This cannot be undone."
        confirmLabel="Delete problem"
      />
      </div>
    </>
  );
}
