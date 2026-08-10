import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type QuickView = 'all' | 'bookmarked' | 'solved' | 'recent-solved';

export interface ProblemQuery {
  search: string;
  tags: string[];
  difficulty: string[];
  status: string[];
  view: QuickView;
  sort: string;
  order: string;
  page: number;
}

/**
 * The Problems page keeps its entire filter/sort/page state in the URL, so a view is
 * shareable and survives a refresh or a back-button press (guide 4.2).
 */
export function useProblemQuery() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo<ProblemQuery>(() => {
    const list = (key: string) => {
      const raw = searchParams.get(key);
      return raw ? raw.split(',').filter(Boolean) : [];
    };
    return {
      search: searchParams.get('search') ?? '',
      tags: list('tags'),
      difficulty: list('difficulty'),
      status: list('status'),
      view: (searchParams.get('view') as QuickView) ?? 'all',
      sort: searchParams.get('sort') ?? 'recent',
      order: searchParams.get('order') ?? '',
      page: Number(searchParams.get('page') ?? 1) || 1,
    };
  }, [searchParams]);

  /** Any change other than the page itself resets back to page 1. */
  const update = useCallback(
    (patch: Partial<ProblemQuery>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          for (const [key, value] of Object.entries(patch)) {
            const isEmpty =
              value === undefined ||
              value === '' ||
              (Array.isArray(value) && value.length === 0) ||
              (key === 'view' && value === 'all') ||
              (key === 'sort' && value === 'recent') ||
              (key === 'page' && value === 1);

            if (isEmpty) next.delete(key);
            else next.set(key, Array.isArray(value) ? value.join(',') : String(value));
          }

          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleInList = useCallback(
    (key: 'tags' | 'difficulty' | 'status', value: string) => {
      const current = query[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      update({ [key]: next } as Partial<ProblemQuery>);
    },
    [query, update],
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasFilters =
    query.search !== '' ||
    query.tags.length > 0 ||
    query.difficulty.length > 0 ||
    query.status.length > 0 ||
    query.view !== 'all';

  return { query, update, toggleInList, clearAll, hasFilters };
}
