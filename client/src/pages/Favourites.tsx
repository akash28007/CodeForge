import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import { DifficultyBadge, TopicChip } from '../components/Badge';
import { ButtonLink } from '../components/ui/Button';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import Pagination from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';
import { IconBookmark, IconCheckCircle } from '../components/icons';

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

interface Response {
  items: ProblemRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function Favourites() {
  const { push } = useToast();
  const [data, setData] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Scoped to bookmarks via the same endpoint the Problems page uses.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Response>(`/problems?status=bookmarked&page=${page}&pageSize=20`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your bookmarks.'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unbookmark(problem: ProblemRow) {
    // Remove the row immediately; restore it if the request fails.
    setData((current) =>
      current ? { ...current, items: current.items.filter((p) => p.id !== problem.id), total: current.total - 1 } : current,
    );
    try {
      await api.delete(`/problem/${problem.id}/bookmark`);
      push('success', 'Bookmark removed', problem.title);
    } catch (err) {
      push('error', 'Could not remove bookmark', getErrorMessage(err, 'Please try again.'));
      void load();
    }
  }

  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  return (
    <div>
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-primary">
          <IconBookmark className="h-5 w-5 text-accent" filled />
          Favourites
        </h1>
        <p className="mt-1 text-sm text-secondary">Problems you have bookmarked to come back to.</p>
      </header>

      {loading && !data ? (
        <SkeletonRows rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconBookmark />}
          title="Nothing bookmarked yet"
          description="Tap the bookmark icon on any problem to save it here for later."
          action={<ButtonLink to="/problems" size="sm">Browse problems</ButtonLink>}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((problem) => (
              <li key={problem.id}>
                <div className="group flex items-center justify-between gap-3 rounded-lg border border-subtle bg-surface px-4 py-3 transition-colors hover:border-strong">
                  <Link to={`/problems/${problem.id}`} className="flex min-w-0 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {problem.solved ? (
                        <IconCheckCircle className="h-4 w-4 text-easy" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-strong" />
                      )}
                    </span>
                    <span className="truncate font-medium text-primary transition-colors group-hover:text-accent">
                      {problem.title}
                    </span>
                  </Link>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden items-center gap-2 sm:flex">
                      {problem.tags.slice(0, 2).map((t) => (
                        <TopicChip key={t} name={t} />
                      ))}
                    </div>
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <button
                      onClick={() => void unbookmark(problem)}
                      aria-label={`Remove ${problem.title} from favourites`}
                      className="rounded p-1 text-accent transition-colors hover:text-hard"
                    >
                      <IconBookmark className="h-4 w-4" filled />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} className="mt-4" />
        </>
      )}
    </div>
  );
}
