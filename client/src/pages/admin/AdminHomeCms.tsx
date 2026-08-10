import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useToast } from '../../components/ui/Toast';
import { useHomeContent, type HomeCopy } from '../../context/HomeContentContext';
import { AdminHeader } from './AdminLayout';
import { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import Skeleton from '../../components/ui/Skeleton';

interface Row { id: string; published: boolean; [key: string]: unknown }
interface AdminPayload {
  content: HomeCopy & { id: string };
  courses: (Row & { title: string; description: string; metaLabel: string; href: string; icon: string; accent: string; order: number })[];
  reviews: (Row & { name: string; rating: number; body: string; order: number })[];
  companies: (Row & { name: string; logoUrl: string | null; order: number })[];
}

/** Which singleton fields belong to which editable group, and how to label them. */
const COPY_GROUPS: { title: string; fields: [keyof HomeCopy, string][] }[] = [
  {
    title: 'Hero',
    fields: [
      ['heroHeadline', 'Headline'],
      ['heroHighlight', 'Highlighted word (must appear in the headline)'],
      ['heroSubtext', 'Sub-text'],
      ['heroImageUrl', 'Hero image URL (blank uses the built-in illustration)'],
      ['ctaPrimaryLabel', 'Primary button label'],
      ['ctaPrimaryHref', 'Primary button link'],
      ['ctaSecondaryLabel', 'Secondary button label'],
      ['ctaSecondaryHref', 'Secondary button link'],
      ['ctaTertiaryLabel', 'Third button label'],
      ['ctaTertiaryHref', 'Third button link'],
    ],
  },
  {
    title: 'Section headings',
    fields: [
      ['coursesHeading', 'Courses heading'],
      ['coursesViewAllHref', 'Courses "View all" link'],
      ['reviewsHeading', 'Reviews heading'],
      ['reviewsViewAllHref', 'Reviews "View all" link'],
      ['marqueeCaption', 'Company marquee caption'],
    ],
  },
  {
    title: 'Contact',
    fields: [
      ['contactHeading', 'Contact heading'],
      ['contactPhone', 'Phone number'],
      ['contactEmail', 'Email address'],
    ],
  },
  {
    title: 'Footer',
    fields: [
      ['footerTagline', 'Footer tagline'],
      ['newsletterHeading', 'Newsletter heading'],
      ['newsletterBody', 'Newsletter description'],
      ['copyrightText', 'Copyright line'],
    ],
  },
];

export default function AdminHomeCms() {
  const toast = useToast();
  const { reload: reloadPublicContent } = useHomeContent();
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Partial<Record<keyof HomeCopy, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'courses' | 'reviews' | 'companies'; id: string; label: string } | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<AdminPayload>('/admin/home')
      .then((res) => { setData(res.data); setDirty({}); })
      .catch((err) => setError(getErrorMessage(err, 'Could not load homepage content')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveCopy() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      await api.patch('/admin/home/content', dirty);
      toast.push('success', 'Homepage copy saved');
      setDirty({});
      load();
      // The public page reads through a provider fetched once at app mount, so it has
      // to be told the content changed or the admin sees a stale homepage.
      reloadPublicContent();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not save'));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(kind: 'courses' | 'reviews' | 'companies', id: string, published: boolean) {
    try {
      await api.patch(`/admin/home/${kind}/${id}`, { published });
      toast.push('success', published ? 'Published' : 'Unpublished');
      load();
      reloadPublicContent();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not update'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/home/${deleteTarget.kind}/${deleteTarget.id}`);
      toast.push('success', `Deleted ${deleteTarget.label}`);
      setDeleteTarget(null);
      load();
      reloadPublicContent();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not delete'));
    }
  }

  if (loading) return <><AdminHeader title="Homepage" /><Skeleton className="h-96 rounded-xl" /></>;
  if (error || !data) return <ErrorState title="Couldn't load homepage content" description={error ?? undefined} onRetry={load} />;

  const dirtyCount = Object.keys(dirty).length;
  const valueOf = (key: keyof HomeCopy) => dirty[key] ?? (data.content[key] ?? '') as string;

  function ListSection({ kind, title, rows, labelOf }: {
    kind: 'courses' | 'reviews' | 'companies';
    title: string;
    rows: Row[];
    labelOf: (row: never) => string;
  }) {
    return (
      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-3 font-semibold text-primary">{title} <span className="text-xs font-normal text-muted">({rows.length})</span></h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-1.5 last:border-b-0">
                <span className={`min-w-0 flex-1 truncate text-sm ${row.published ? 'text-primary' : 'text-muted line-through'}`}>
                  {labelOf(row as never)}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => togglePublished(kind, row.id, !row.published)}>
                    {row.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ kind, id: row.id, label: labelOf(row as never) })}>
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <>
      <AdminHeader
        title="Homepage"
        description="Every string on the landing page is a database row. Edits go live immediately."
        action={
          <Button onClick={saveCopy} loading={saving} disabled={dirtyCount === 0}>
            {dirtyCount === 0 ? 'No changes' : `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`}
          </Button>
        }
      />

      {COPY_GROUPS.map((group) => (
        <section key={group.title} className="mb-6 rounded-xl border border-subtle bg-surface p-4">
          <h3 className="mb-3 font-semibold text-primary">{group.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map(([key, label]) => {
              const long = key === 'heroSubtext' || key === 'footerTagline' || key === 'newsletterBody';
              return (
                <label key={key} className={`block text-sm ${long ? 'sm:col-span-2' : ''}`}>
                  <span className="text-secondary">{label}</span>
                  {long ? (
                    <textarea
                      rows={2}
                      value={valueOf(key)}
                      onChange={(e) => setDirty((d) => ({ ...d, [key]: e.target.value }))}
                      className={`mt-1 w-full rounded-lg border bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent ${key in dirty ? 'border-accent' : 'border-subtle'}`}
                    />
                  ) : (
                    <input
                      value={valueOf(key)}
                      onChange={(e) => setDirty((d) => ({ ...d, [key]: e.target.value }))}
                      className={`mt-1 w-full rounded-lg border bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent ${key in dirty ? 'border-accent' : 'border-subtle'}`}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      <ListSection kind="courses" title="Course cards" rows={data.courses} labelOf={(c: AdminPayload['courses'][number]) => c.title} />
      <ListSection kind="reviews" title="Reviews" rows={data.reviews} labelOf={(r: AdminPayload['reviews'][number]) => `${r.name} — ${r.rating}★`} />
      <ListSection kind="companies" title="Companies" rows={data.companies} labelOf={(c: AdminPayload['companies'][number]) => c.name} />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        title={`Delete ${deleteTarget?.label}?`}
        description="It disappears from the homepage immediately. This cannot be undone."
      />
    </>
  );
}
