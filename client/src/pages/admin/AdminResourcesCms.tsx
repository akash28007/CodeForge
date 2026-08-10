import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useToast } from '../../components/ui/Toast';
import { AdminHeader } from './AdminLayout';
import { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import Skeleton from '../../components/ui/Skeleton';

type ResourceType = 'ARTICLE' | 'VIDEO' | 'SHEET' | 'EXTERNAL';

interface Category { id: string; slug: string; name: string; order: number; published: boolean }
interface Resource {
  id: string; slug: string; title: string; description: string; type: ResourceType;
  categoryId: string; url: string | null; body: string | null; estimatedMinutes: number | null;
  order: number; published: boolean;
}
interface PathStep { id: string; order: number; label: string | null; resourceId: string | null; problemId: string | null }
interface LearningPath { id: string; slug: string; title: string; description: string; order: number; published: boolean; steps: PathStep[] }

const EMPTY_RESOURCE = {
  slug: '', title: '', description: '', type: 'ARTICLE' as ResourceType,
  categoryId: '', url: '', body: '', estimatedMinutes: '',
};

export default function AdminResourcesCms() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_RESOURCE });
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; id: string; label: string } | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Resource[]>('/admin/resources'),
      api.get<Category[]>('/admin/resources/categories'),
      api.get<LearningPath[]>('/admin/resources/paths'),
    ])
      .then(([r, c, p]) => { setResources(r.data); setCategories(c.data); setPaths(p.data); })
      .catch((err) => setError(getErrorMessage(err, 'Could not load resources')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createResource(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      // The server enforces "exactly one of url/body"; send only the one that was filled
      // so an empty string is never mistaken for content.
      const payload: Record<string, unknown> = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        categoryId: form.categoryId,
      };
      if (form.url.trim()) payload.url = form.url.trim();
      if (form.body.trim()) payload.body = form.body.trim();
      if (form.estimatedMinutes) payload.estimatedMinutes = Number(form.estimatedMinutes);

      await api.post('/admin/resources', payload);
      toast.push('success', `Created "${form.title}"`);
      setForm({ ...EMPTY_RESOURCE });
      load();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not create that resource'));
    } finally {
      setCreating(false);
    }
  }

  async function togglePublished(path: string, id: string, published: boolean) {
    try {
      await api.patch(`/admin/resources${path}/${id}`, { published });
      load();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not update'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/resources${deleteTarget.path}/${deleteTarget.id}`);
      toast.push('success', `Deleted ${deleteTarget.label}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not delete'));
    }
  }

  if (loading) return <><AdminHeader title="Resources" /><Skeleton className="h-96 rounded-xl" /></>;
  if (error) return <ErrorState title="Couldn't load resources" description={error} onRetry={load} />;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorised';

  return (
    <>
      <AdminHeader title="Resources" description="Curated links, authored sheets, categories, and learning paths." />

      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">Add a resource</h3>
        <form onSubmit={createResource} className="grid gap-3 sm:grid-cols-2">
          {([
            ['title', 'Title', 'text'],
            ['slug', 'Slug (URL segment)', 'text'],
            ['description', 'Short description', 'text'],
            ['estimatedMinutes', 'Estimated minutes (optional)', 'number'],
          ] as const).map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="text-secondary">{label}</span>
              <input
                type={type}
                required={key === 'title' || key === 'slug' || key === 'description'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              />
            </label>
          ))}

          <label className="block text-sm">
            <span className="text-secondary">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ResourceType }))}
              className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary"
            >
              {(['ARTICLE', 'VIDEO', 'SHEET', 'EXTERNAL'] as const).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-secondary">Category</span>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary"
            >
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-secondary">Outbound URL — for curated links</span>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              disabled={form.body.trim().length > 0}
              className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-40"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-secondary">Markdown body — for sheets written here</span>
            <textarea
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              disabled={form.url.trim().length > 0}
              className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 font-mono text-xs text-primary outline-none focus:border-accent disabled:opacity-40"
            />
          </label>

          <p className="text-xs text-muted sm:col-span-2">
            A resource has exactly one of the two — filling either disables the other.
          </p>

          <div className="sm:col-span-2">
            <Button type="submit" loading={creating}>Create resource</Button>
          </div>
        </form>
      </section>

      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">
          Resources <span className="text-xs font-normal text-muted">({resources.length})</span>
        </h3>
        <ul className="flex flex-col gap-1.5">
          {resources.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-1.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${r.published ? 'text-primary' : 'text-muted line-through'}`}>{r.title}</span>
                <span className="block text-xs text-muted">
                  {r.type} · {categoryName(r.categoryId)} · {r.body ? 'authored sheet' : 'curated link'}
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => togglePublished('', r.id, !r.published)}>
                  {r.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ path: '', id: r.id, label: r.title })}>Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">
          Categories <span className="text-xs font-normal text-muted">({categories.length})</span>
        </h3>
        <ul className="flex flex-col gap-1.5">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 border-b border-subtle pb-1.5 last:border-b-0">
              <span className={`text-sm ${c.published ? 'text-primary' : 'text-muted line-through'}`}>
                {c.name} <span className="font-mono text-xs text-muted">{c.slug}</span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => togglePublished('/categories', c.id, !c.published)}>
                  {c.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ path: '/categories', id: c.id, label: c.name })}>Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">
          Learning paths <span className="text-xs font-normal text-muted">({paths.length})</span>
        </h3>
        <ul className="flex flex-col gap-1.5">
          {paths.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-1.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${p.published ? 'text-primary' : 'text-muted line-through'}`}>{p.title}</span>
                <span className="block text-xs text-muted">{p.steps.length} steps</span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => togglePublished('/paths', p.id, !p.published)}>
                  {p.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ path: '/paths', id: p.id, label: p.title })}>Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        title={`Delete ${deleteTarget?.label}?`}
        description={
          deleteTarget?.path === '/categories'
            ? 'Deleting a category also deletes every resource inside it. This cannot be undone.'
            : deleteTarget?.path === '/paths'
              ? "This also clears every user's recorded progress through the path. This cannot be undone."
              : 'This cannot be undone.'
        }
      />
    </>
  );
}
