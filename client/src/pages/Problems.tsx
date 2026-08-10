import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useProblemQuery, type QuickView } from '../hooks/useProblemQuery';
import { getErrorMessage } from '../utils/errors';
import { DifficultyBadge, TopicChip } from '../components/Badge';
import SearchInput from '../components/ui/SearchInput';
import Dropdown from '../components/ui/Dropdown';
import Pagination from '../components/ui/Pagination';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import Button, { ButtonLink } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import ProblemsSidebar, { type Facets } from './problems/ProblemsSidebar';
import ProgressPanel, { type ProgressData } from './problems/ProgressPanel';
import type { ActivityDay } from '../components/charts/ActivityCalendar';
import { IconBookmark, IconCheckCircle, IconClipboard, IconPlus } from '../components/icons';

interface ProblemRow {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  acceptance: number;
  totalSubmissions: number;
  solved: boolean;
  bookmarked: boolean;
}

interface ProblemsResponse {
  items: ProblemRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'title', label: 'Title' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'acceptance', label: 'Acceptance' },
  { value: 'solves', label: 'Most Solved' },
];

const PILL_TOPICS = 6;

/** Maps a sidebar quick view onto the query params the API understands. */
function viewToParams(view: QuickView): { status?: string; sort?: string; order?: string } {
  switch (view) {
    case 'bookmarked':
      return { status: 'bookmarked' };
    case 'solved':
      return { status: 'solved' };
    case 'recent-solved':
      return { status: 'solved', sort: 'recent' };
    default:
      return {};
  }
}

export default function Problems() {
  const { user } = useAuth();
  const { push } = useToast();
  const { query, update, toggleInList, clearAll, hasFilters } = useProblemQuery();

  const [data, setData] = useState<ProblemsResponse | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [activity, setActivity] = useState<{ days: ActivityDay[]; activeDays: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState(query.search);

  // The URL is the source of truth; keep the box in sync when it changes elsewhere
  // (top-bar search, back button) without fighting the user's typing.
  useEffect(() => {
    setSearchDraft(query.search);
  }, [query.search]);

  // Debounce typing into a URL update, which is what actually triggers the fetch.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (searchDraft === query.search) return;
    const timer = setTimeout(() => update({ search: searchDraft }), 350);
    return () => clearTimeout(timer);
  }, [searchDraft, query.search, update]);

  const params = useMemo(() => {
    const viewParams = viewToParams(query.view);
    const status = viewParams.status
      ? [...new Set([...query.status, viewParams.status])].join(',')
      : query.status.join(',');

    const search = new URLSearchParams();
    if (query.search) search.set('search', query.search);
    if (query.tags.length) search.set('tags', query.tags.join(','));
    if (query.difficulty.length) search.set('difficulty', query.difficulty.join(','));
    if (status) search.set('status', status);
    if (query.sort) search.set('sort', viewParams.sort ?? query.sort);
    if (query.order) search.set('order', query.order);
    search.set('page', String(query.page));
    search.set('pageSize', '20');
    return search.toString();
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, facetRes] = await Promise.all([
        api.get<ProblemsResponse>(`/problems?${params}`),
        api.get<Facets>(`/problems/facets${query.search ? `?search=${encodeURIComponent(query.search)}` : ''}`),
      ]);
      setData(list.data);
      setFacets(facetRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load problems.'));
    } finally {
      setLoading(false);
    }
  }, [params, query.search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setProgress(null);
      setActivity(null);
      return;
    }
    void api.get<ProgressData>('/me/progress').then((r) => setProgress(r.data)).catch(() => setProgress(null));
    void api
      .get<{ days: ActivityDay[]; activeDays: number }>('/me/activity?days=365')
      .then((r) => setActivity(r.data))
      .catch(() => setActivity(null));
  }, [user]);

  async function toggleBookmark(problem: ProblemRow) {
    const next = !problem.bookmarked;
    // Optimistic — reverted below if the request fails.
    setData((current) =>
      current
        ? { ...current, items: current.items.map((p) => (p.id === problem.id ? { ...p, bookmarked: next } : p)) }
        : current,
    );
    try {
      if (next) await api.post(`/problem/${problem.id}/bookmark`);
      else await api.delete(`/problem/${problem.id}/bookmark`);
      setFacets((f) =>
        f ? { ...f, status: { ...f.status, bookmarked: f.status.bookmarked + (next ? 1 : -1) } } : f,
      );
    } catch (err) {
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((p) => (p.id === problem.id ? { ...p, bookmarked: !next } : p)),
            }
          : current,
      );
      push('error', 'Could not update bookmark', getErrorMessage(err, 'Please try again.'));
    }
  }

  const pillTopics = (facets?.tags ?? []).slice(0, PILL_TOPICS);
  const rows = data?.items ?? [];
  const startIndex = ((data?.page ?? 1) - 1) * (data?.pageSize ?? 20);

  return (
    <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_270px]">
      <ProblemsSidebar
        facets={facets}
        query={query}
        signedIn={Boolean(user)}
        hasFilters={hasFilters}
        onView={(view) => update({ view, status: [], page: 1 })}
        onToggle={toggleInList}
        onClear={clearAll}
      />

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TopicChip name="All Topics" active={query.tags.length === 0} onClick={() => update({ tags: [] })} />
          {pillTopics.map((topic) => (
            <TopicChip
              key={topic.name}
              name={topic.name}
              active={query.tags.includes(topic.name)}
              onClick={() => toggleInList('tags', topic.name)}
            />
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Dropdown
              options={SORT_OPTIONS}
              value={query.sort}
              onChange={(sort) => update({ sort })}
              label="Sort: "
              className="w-44"
            />
            {user?.role === 'ADMIN' && (
              <ButtonLink to="/problems/new" size="sm" icon={<IconPlus className="h-4 w-4" />}>
                New
              </ButtonLink>
            )}
          </div>
        </div>

        <SearchInput
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search problems..."
          aria-label="Search problems"
          containerClassName="mb-4"
        />

        {error ? (
          <ErrorState description={error} onRetry={() => void load()} />
        ) : loading && !data ? (
          <div className="rounded-xl border border-subtle bg-surface p-4">
            <SkeletonRows rows={8} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-subtle bg-surface">
            <EmptyState
              icon={<IconClipboard />}
              title="No problems match these filters"
              description={hasFilters ? 'Try removing a filter or clearing the search.' : 'No problems exist yet.'}
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear all filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className={`rounded-xl border border-subtle bg-surface ${loading ? 'opacity-60' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-raised/50 text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="w-12 px-4 py-2.5 font-medium">#</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Problem</th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Topic</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Difficulty</th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Acceptance</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((problem, index) => (
                    <tr key={problem.id} className="border-t border-subtle transition-colors hover:bg-raised/40">
                      <td className="px-4 py-2.5 tabular-nums text-muted">{startIndex + index + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/problems/${problem.id}`}
                          className="font-medium text-primary transition-colors hover:text-accent"
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        {problem.tags[0] ? <TopicChip name={problem.tags[0]} /> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </td>
                      <td className="hidden px-4 py-2.5 tabular-nums text-secondary md:table-cell">
                        {problem.totalSubmissions > 0 ? `${problem.acceptance}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          {problem.solved && (
                            <span title="Solved" className="text-easy">
                              <IconCheckCircle className="h-4 w-4" />
                            </span>
                          )}
                          {user && (
                            <button
                              onClick={() => void toggleBookmark(problem)}
                              aria-label={problem.bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
                              aria-pressed={problem.bookmarked}
                              className={`rounded p-1 transition-colors ${
                                problem.bookmarked ? 'text-accent' : 'text-muted hover:text-primary'
                              }`}
                            >
                              <IconBookmark className="h-4 w-4" filled={problem.bookmarked} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => update({ page })}
            className="mt-4"
          />
        )}
      </div>

      <div className="hidden xl:block">
        {user ? (
          <ProgressPanel
            progress={progress}
            activity={activity}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        ) : (
          <aside className="rounded-xl border border-subtle bg-surface p-5 text-center">
            <h2 className="text-sm font-semibold text-primary">Track your progress</h2>
            <p className="mt-1.5 text-xs text-secondary">
              Sign in to see your solved count, activity calendar, and streak.
            </p>
            <ButtonLink to="/login" size="sm" className="mt-4 w-full">
              Sign in
            </ButtonLink>
          </aside>
        )}
      </div>
    </div>
  );
}
