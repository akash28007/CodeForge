import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import SearchInput from '../components/ui/SearchInput';
import ProgressBar from '../components/ui/ProgressBar';
import { EmptyState, ErrorState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import { DifficultyBadge } from '../components/Badge';
import { useToast } from '../components/ui/Toast';
import {
  IconBarChart,
  IconCheckCircle,
  IconClipboard,
  IconClock,
  IconCode,
  IconCpu,
  IconDatabase,
  IconExternalLink,
  IconLayers,
  IconPlay,
  IconSettings,
  IconTrophy,
} from '../components/icons';

type ResourceType = 'ARTICLE' | 'VIDEO' | 'SHEET' | 'EXTERNAL';

interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  accent: string;
  resourceCount: number;
}

interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ResourceType;
  url: string | null;
  estimatedMinutes: number | null;
  category: { slug: string; name: string; accent: string };
}

interface PathStep {
  id: string;
  order: number;
  label: string | null;
  resourceId: string | null;
  problemId: string | null;
  resource: { slug: string; title: string; type: ResourceType; url: string | null } | null;
  problem: { id: string; title: string; difficulty: string } | null;
  completed: boolean;
}

interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  steps: PathStep[];
  completedSteps: number;
}

const categoryIcons: Record<string, (p: { className?: string }) => JSX.Element> = {
  layers: IconLayers,
  code: IconCode,
  database: IconDatabase,
  settings: IconSettings,
  trophy: IconTrophy,
  book: IconClipboard,
  cpu: IconCpu,
  map: IconBarChart,
};

const accentClasses: Record<string, string> = {
  accent: 'bg-accent/10 text-accent',
  easy: 'bg-easy/10 text-easy',
  medium: 'bg-medium/10 text-medium',
  hard: 'bg-hard/10 text-hard',
  info: 'bg-info/10 text-info',
};

const typeMeta: Record<ResourceType, { label: string; className: string }> = {
  ARTICLE: { label: 'Article', className: 'bg-info/10 text-info' },
  VIDEO: { label: 'Video', className: 'bg-hard/10 text-hard' },
  SHEET: { label: 'Sheet', className: 'bg-easy/10 text-easy' },
  EXTERNAL: { label: 'Link', className: 'bg-raised text-secondary' },
};

const TYPES: (ResourceType | 'ALL')[] = ['ALL', 'ARTICLE', 'VIDEO', 'SHEET', 'EXTERNAL'];

function formatMinutes(mins: number | null): string | null {
  if (mins === null) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.round((mins / 60) * 10) / 10;
  return `${hours} hr`;
}

function ResourceCard({ resource }: { resource: Resource }) {
  const meta = typeMeta[resource.type];
  const time = formatMinutes(resource.estimatedMinutes);
  // Sheets are authored here and read in-app; everything else links out.
  const isInternal = resource.type === 'SHEET';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}>
          {meta.label}
        </span>
        {!isInternal && <IconExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />}
      </div>
      <h3 className="mt-3 font-semibold text-primary">{resource.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-secondary">{resource.description}</p>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted">
        <span>{resource.category.name}</span>
        {time && (
          <span className="inline-flex items-center gap-1">
            <IconClock className="h-3 w-3" />
            {time}
          </span>
        )}
      </div>
    </>
  );

  const className =
    'flex h-full flex-col rounded-xl border border-subtle bg-surface p-5 transition-colors hover:border-accent/50';

  return isInternal ? (
    <Link to={`/resources/${resource.slug}`} className={className}>
      {body}
    </Link>
  ) : (
    <a href={resource.url ?? '#'} target="_blank" rel="noreferrer noopener" className={className}>
      {body}
    </a>
  );
}

function PathCard({ path, onToggle }: { path: LearningPath; onToggle: (step: PathStep) => void }) {
  const Icon = categoryIcons[path.icon] ?? IconBarChart;
  const pct = path.steps.length ? (path.completedSteps / path.steps.length) * 100 : 0;

  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accentClasses[path.accent] ?? accentClasses.accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary">{path.title}</h3>
          <p className="mt-1 text-sm text-secondary">{path.description}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-secondary">
          {path.completedSteps}/{path.steps.length}
        </span>
      </div>

      <ProgressBar value={pct} className="mt-4" />

      <ol className="mt-4 flex flex-col gap-1.5">
        {path.steps.map((step, index) => {
          const title = step.label ?? step.resource?.title ?? step.problem?.title ?? 'Step';
          return (
            <li key={step.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-raised/50">
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted">{index + 1}</span>

              {step.problemId ? (
                // Problem steps are judged, never self-reported — no toggle here.
                <span
                  title={step.completed ? 'Solved' : 'Solve this problem to complete the step'}
                  className={step.completed ? 'text-easy' : 'text-muted'}
                >
                  <IconCheckCircle className="h-4 w-4" />
                </span>
              ) : (
                <button
                  onClick={() => onToggle(step)}
                  aria-pressed={step.completed}
                  aria-label={step.completed ? `Mark "${title}" unread` : `Mark "${title}" read`}
                  className={`transition-colors ${step.completed ? 'text-easy' : 'text-muted hover:text-primary'}`}
                >
                  <IconCheckCircle className="h-4 w-4" />
                </button>
              )}

              <span className="min-w-0 flex-1">
                {step.problem ? (
                  <Link to={`/problems/${step.problem.id}`} className="text-sm text-primary hover:text-accent">
                    {title}
                  </Link>
                ) : step.resource?.type === 'SHEET' ? (
                  <Link to={`/resources/${step.resource.slug}`} className="text-sm text-primary hover:text-accent">
                    {title}
                  </Link>
                ) : (
                  <a
                    href={step.resource?.url ?? '#'}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-primary hover:text-accent"
                  >
                    {title}
                  </a>
                )}
              </span>

              {step.problem ? (
                <DifficultyBadge difficulty={step.problem.difficulty} />
              ) : (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {step.resource ? typeMeta[step.resource.type].label : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function Resources() {
  const { user } = useAuth();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? '';
  const type = (searchParams.get('type') as ResourceType | null) ?? 'ALL';
  const search = searchParams.get('search') ?? '';

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(search);

  useEffect(() => setDraft(search), [search]);

  function patchParams(patch: Record<string, string>) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (!value || value === 'ALL') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  // Debounce typing into the URL, which is what drives the fetch.
  useEffect(() => {
    if (draft === search) return;
    const timer = setTimeout(() => patchParams({ search: draft }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (type !== 'ALL') params.set('type', type);
    if (search) params.set('search', search);
    return params.toString();
  }, [category, type, search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, list, pathList] = await Promise.all([
        api.get<Category[]>('/resources/categories'),
        api.get<Resource[]>(`/resources${query ? `?${query}` : ''}`),
        api.get<LearningPath[]>('/resources/paths'),
      ]);
      setCategories(cats.data);
      setResources(list.data);
      setPaths(pathList.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load resources.'));
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStep(step: PathStep) {
    if (!user) {
      push('info', 'Sign in to track your progress');
      return;
    }
    const next = !step.completed;
    // Optimistic; reverted below if the request fails.
    setPaths((current) =>
      current.map((p) => {
        if (!p.steps.some((s) => s.id === step.id)) return p;
        const steps = p.steps.map((s) => (s.id === step.id ? { ...s, completed: next } : s));
        return { ...p, steps, completedSteps: steps.filter((s) => s.completed).length };
      }),
    );
    try {
      await api.patch(`/resources/paths/steps/${step.id}`, { completed: next });
    } catch (err) {
      setPaths((current) =>
        current.map((p) => {
          if (!p.steps.some((s) => s.id === step.id)) return p;
          const steps = p.steps.map((s) => (s.id === step.id ? { ...s, completed: !next } : s));
          return { ...p, steps, completedSteps: steps.filter((s) => s.completed).length };
        }),
      );
      push('error', 'Could not update the step', getErrorMessage(err, 'Please try again.'));
    }
  }

  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-bold text-primary">Resources</h1>
        <p className="mt-1 text-sm text-secondary">
          Curated free material for the things the judge can&apos;t grade — SQL, system design, OOP — plus cheat
          sheets written here.
        </p>
      </header>

      <SearchInput
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search resources..."
        aria-label="Search resources"
        containerClassName="max-w-xl"
      />

      {/* ── category chips ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => patchParams({ category: '' })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              category === '' ? 'bg-primary text-canvas' : 'border border-subtle bg-surface text-secondary hover:text-primary'
            }`}
          >
            All
          </button>
          {(categories ?? []).map((cat) => {
            const Icon = categoryIcons[cat.icon] ?? IconClipboard;
            const active = category === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => patchParams({ category: active ? '' : cat.slug })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-primary text-canvas' : 'border border-subtle bg-surface text-secondary hover:text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.name}
                <span className="tabular-nums opacity-70">{cat.resourceCount}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => patchParams({ type: t })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                type === t ? 'bg-accent/15 text-accent' : 'text-muted hover:text-primary'
              }`}
            >
              {t === 'ALL' ? 'All types' : typeMeta[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── resource grid ── */}
      {!resources ? (
        <SkeletonRows rows={4} className="h-32" />
      ) : resources.length === 0 ? (
        <div className="rounded-xl border border-subtle bg-surface">
          <EmptyState
            icon={<IconClipboard />}
            title="No resources match those filters"
            description="Try a different category, type, or search term."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {/* ── learning paths ── */}
      {paths.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
              <IconPlay className="h-4 w-4 text-accent" />
              Learning paths
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Ordered tracks that mix reading with problems. Problem steps tick themselves when the judge accepts your
              solution.
            </p>
          </div>
          {paths.map((path) => (
            <PathCard key={path.id} path={path} onToggle={toggleStep} />
          ))}
        </section>
      )}
    </div>
  );
}
