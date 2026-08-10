import { useMemo, useState } from 'react';
import type { ProblemQuery, QuickView } from '../../hooks/useProblemQuery';
import { Checkbox } from '../../components/ui/Toggle';
import SearchInput from '../../components/ui/SearchInput';
import { IconBookmark, IconCheckCircle, IconClipboard, IconClock } from '../../components/icons';

export interface Facets {
  tags: { name: string; count: number }[];
  difficulty: { value: string; count: number }[];
  status: { solved: number; unsolved: number; bookmarked: number };
  total: number;
}

interface Props {
  facets: Facets | null;
  query: ProblemQuery;
  signedIn: boolean;
  hasFilters: boolean;
  onView: (view: QuickView) => void;
  onToggle: (key: 'tags' | 'difficulty' | 'status', value: string) => void;
  onClear: () => void;
}

const QUICK_VIEWS: { key: QuickView; label: string; icon: typeof IconClipboard; authOnly: boolean }[] = [
  { key: 'all', label: 'All Problems', icon: IconClipboard, authOnly: false },
  { key: 'bookmarked', label: 'Bookmarked', icon: IconBookmark, authOnly: true },
  { key: 'solved', label: 'Solved', icon: IconCheckCircle, authOnly: true },
  { key: 'recent-solved', label: 'Recently Solved', icon: IconClock, authOnly: true },
];

const TOPICS_COLLAPSED = 6;

export default function ProblemsSidebar({
  facets,
  query,
  signedIn,
  hasFilters,
  onView,
  onToggle,
  onClear,
}: Props) {
  const [topicSearch, setTopicSearch] = useState('');
  const [showAllTopics, setShowAllTopics] = useState(false);

  const topics = useMemo(() => {
    const all = facets?.tags ?? [];
    const filtered = topicSearch
      ? all.filter((t) => t.name.toLowerCase().includes(topicSearch.toLowerCase()))
      : all;
    return { filtered, truncated: !showAllTopics && !topicSearch };
  }, [facets, topicSearch, showAllTopics]);

  const visibleTopics = topics.truncated ? topics.filtered.slice(0, TOPICS_COLLAPSED) : topics.filtered;

  return (
    <aside className="flex flex-col gap-6">
      <nav className="flex flex-col gap-0.5">
        {QUICK_VIEWS.filter((v) => signedIn || !v.authOnly).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            aria-current={query.view === key ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              query.view === key ? 'bg-accent/15 text-accent' : 'text-secondary hover:bg-raised hover:text-primary'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-subtle bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Filter</h2>
          {hasFilters && (
            <button onClick={onClear} className="text-xs font-medium text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>

        <SearchInput
          value={topicSearch}
          onChange={(e) => setTopicSearch(e.target.value)}
          placeholder="Search topics..."
          aria-label="Search topics"
          containerClassName="py-1"
        />

        <section className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Topics</h3>
          {!facets ? (
            <p className="px-2 py-1 text-xs text-muted">Loading…</p>
          ) : visibleTopics.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted">No topics match.</p>
          ) : (
            <div className="-mx-2 flex flex-col">
              {visibleTopics.map((topic) => (
                <Checkbox
                  key={topic.name}
                  checked={query.tags.includes(topic.name)}
                  onChange={() => onToggle('tags', topic.name)}
                  label={topic.name}
                  count={topic.count}
                />
              ))}
            </div>
          )}
          {topics.filtered.length > TOPICS_COLLAPSED && !topicSearch && (
            <button
              onClick={() => setShowAllTopics((s) => !s)}
              className="mt-1 px-2 text-xs font-medium text-accent hover:underline"
            >
              {showAllTopics ? 'Show less' : `More (${topics.filtered.length - TOPICS_COLLAPSED})`}
            </button>
          )}
        </section>

        <section className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</h3>
          <div className="-mx-2 flex flex-col">
            {(facets?.difficulty ?? []).map((d) => (
              <Checkbox
                key={d.value}
                checked={query.difficulty.includes(d.value)}
                onChange={() => onToggle('difficulty', d.value)}
                label={d.value.charAt(0) + d.value.slice(1).toLowerCase()}
                count={d.count}
              />
            ))}
          </div>
        </section>

        {signedIn && facets && (
          <section className="mt-4">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Status</h3>
            <div className="-mx-2 flex flex-col">
              <Checkbox
                checked={query.status.includes('solved')}
                onChange={() => onToggle('status', 'solved')}
                label="Solved"
                count={facets.status.solved}
              />
              <Checkbox
                checked={query.status.includes('unsolved')}
                onChange={() => onToggle('status', 'unsolved')}
                label="Unsolved"
                count={facets.status.unsolved}
              />
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
