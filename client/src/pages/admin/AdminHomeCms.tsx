import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useToast } from '../../components/ui/Toast';
import { useHomeContent, type HomeCopy } from '../../context/HomeContentContext';
import { AdminHeader } from './AdminLayout';
import { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { ErrorState } from '../../components/ui/States';
import Skeleton from '../../components/ui/Skeleton';
import EntityDialog, { type FieldSpec, type FieldValue } from './EntityDialog';
import ImageField from './ImageField';

interface Row { id: string; published: boolean; [key: string]: unknown }

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ReviewRow extends Row {
  name: string;
  designation: string | null;
  avatarUrl: string | null;
  rating: number;
  body: string;
  order: number;
  status: ReviewStatus;
  createdAt: string;
  authorId: string | null;
  verified: boolean;
}

type CourseRow = Row & {
  title: string; description: string; metaLabel: string; href: string; icon: string; accent: string; order: number;
};
type CompanyRow = Row & { name: string; logoUrl: string | null; order: number };
type SocialRow = Row & { platform: string; url: string; order: number };
type FooterRow = Row & { section: string; label: string; href: string; order: number };

interface AdminPayload {
  content: HomeCopy & { id: string };
  courses: CourseRow[];
  reviews: ReviewRow[];
  companies: CompanyRow[];
  socials: SocialRow[];
  footerLinks: FooterRow[];
}

/** Kept in step with `cardIcons` / `cardAccents` in `pages/Home.tsx`. */
const ICON_OPTIONS = ['code', 'cpu', 'layers', 'database', 'settings', 'trophy'].map((v) => ({
  value: v,
  label: v,
}));
const ACCENT_OPTIONS = ['accent', 'easy', 'medium', 'hard', 'info'].map((v) => ({ value: v, label: v }));
const PLATFORM_OPTIONS = ['GITHUB', 'LINKEDIN', 'TWITTER', 'INSTAGRAM'].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));
const SECTION_OPTIONS = [
  { value: 'PLATFORM', label: 'Platform column' },
  { value: 'COMPANY', label: 'Company column' },
];

const COURSE_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, maxLength: 80 },
  { key: 'metaLabel', label: 'Meta label', type: 'text', required: true, maxLength: 40, hint: 'Free text, e.g. "120+ Problems".' },
  { key: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 200 },
  { key: 'href', label: 'Link', type: 'text', required: true, maxLength: 200, placeholder: '/problems?topic=arrays' },
  { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
  { key: 'accent', label: 'Accent colour', type: 'select', options: ACCENT_OPTIONS },
  { key: 'order', label: 'Order', type: 'number', hint: 'Lower numbers appear first.' },
  { key: 'published', label: 'Published', type: 'toggle' },
];

const COMPANY_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Company name', type: 'text', required: true, maxLength: 60 },
  { key: 'order', label: 'Order', type: 'number' },
  { key: 'logoUrl', label: 'Logo', type: 'image', hint: 'Leave empty to render the name as a wordmark instead.' },
  { key: 'published', label: 'Published', type: 'toggle' },
];

const REVIEW_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, maxLength: 80 },
  { key: 'designation', label: 'Designation', type: 'text', maxLength: 80, placeholder: 'Student, SDE @ Acme, …' },
  { key: 'body', label: 'Review', type: 'textarea', required: true, maxLength: 600 },
  { key: 'rating', label: 'Rating (1–5)', type: 'number' },
  { key: 'order', label: 'Order', type: 'number' },
  { key: 'avatarUrl', label: 'Photo', type: 'image', hint: 'Ignored for reviews written by a registered user — their profile picture wins.' },
  { key: 'published', label: 'Published', type: 'toggle' },
];

const SOCIAL_FIELDS: FieldSpec[] = [
  { key: 'platform', label: 'Platform', type: 'select', options: PLATFORM_OPTIONS, hint: 'One link per platform — saving replaces the existing one.' },
  { key: 'order', label: 'Order', type: 'number' },
  { key: 'url', label: 'URL', type: 'text', required: true, maxLength: 300, wide: true, placeholder: 'https://github.com/your-handle' },
  { key: 'published', label: 'Published', type: 'toggle' },
];

const FOOTER_FIELDS: FieldSpec[] = [
  { key: 'section', label: 'Column', type: 'select', options: SECTION_OPTIONS },
  { key: 'order', label: 'Order', type: 'number' },
  { key: 'label', label: 'Label', type: 'text', required: true, maxLength: 60 },
  { key: 'href', label: 'Link', type: 'text', required: true, maxLength: 200 },
  { key: 'published', label: 'Published', type: 'toggle' },
];

/** The API path segment for each collection doubles as its key. */
type CollectionKind = 'courses' | 'reviews' | 'companies' | 'socials' | 'footer-links';

const FIELDS_BY_KIND: Record<CollectionKind, FieldSpec[]> = {
  courses: COURSE_FIELDS,
  reviews: REVIEW_FIELDS,
  companies: COMPANY_FIELDS,
  socials: SOCIAL_FIELDS,
  'footer-links': FOOTER_FIELDS,
};

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
      ['statsHeading', 'Live numbers heading'],
      ['topicsHeading', 'Topic grid heading'],
      ['marqueeCaption', 'Company marquee caption'],
    ],
  },
  {
    // The counters beneath the stats heading are computed live and are deliberately
    // not editable — see docs/DECISIONS.md.
    title: 'How it works',
    fields: [
      ['howHeading', 'Section heading'],
      ['howStep1Title', 'Step 1 title'],
      ['howStep1Body', 'Step 1 text'],
      ['howStep2Title', 'Step 2 title'],
      ['howStep2Body', 'Step 2 text'],
      ['howStep3Title', 'Step 3 title'],
      ['howStep3Body', 'Step 3 text'],
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

const statusChip: Record<ReviewStatus, string> = {
  PENDING: 'bg-medium/10 text-medium',
  APPROVED: 'bg-easy/10 text-easy',
  REJECTED: 'bg-hard/10 text-hard',
};

/**
 * Reviews get their own panel rather than the shared publish/delete row: they are the
 * only homepage content users can submit, so an admin needs to read the text and see who
 * wrote it before deciding, not just a one-line label.
 */
function ReviewsPanel({
  rows,
  onAdd,
  onEdit,
  onModerate,
  onTogglePublished,
  onDelete,
}: {
  rows: ReviewRow[];
  onAdd: () => void;
  onEdit: (row: ReviewRow) => void;
  onModerate: (id: string, status: ReviewStatus) => void;
  onTogglePublished: (id: string, published: boolean) => void;
  onDelete: (row: ReviewRow) => void;
}) {
  const pending = rows.filter((r) => r.status === 'PENDING').length;

  return (
    <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 font-semibold text-primary">
          Reviews <span className="text-xs font-normal text-muted">({rows.length})</span>
          {pending > 0 && (
            <span className="rounded-full bg-medium/10 px-2 py-0.5 text-xs font-semibold text-medium">
              {pending} awaiting approval
            </span>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={onAdd}>
          Add review
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-subtle p-3">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                    {row.name}
                    {row.designation && <span className="font-normal text-muted">· {row.designation}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusChip[row.status]}`}>
                      {row.status}
                    </span>
                    {row.authorId && (
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        {row.verified ? 'verified learner' : 'user submitted'}
                      </span>
                    )}
                    {!row.published && <span className="text-xs font-normal text-muted">· unpublished</span>}
                  </p>
                  <p className="mt-1 text-sm text-secondary">{row.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.rating}★ · {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                  Edit
                </Button>
                {row.status !== 'APPROVED' && (
                  <Button size="sm" variant="primary" onClick={() => onModerate(row.id, 'APPROVED')}>
                    Approve
                  </Button>
                )}
                {row.status !== 'REJECTED' && (
                  <Button size="sm" variant="ghost" onClick={() => onModerate(row.id, 'REJECTED')}>
                    Reject
                  </Button>
                )}
                {row.status === 'APPROVED' && (
                  <Button size="sm" variant="ghost" onClick={() => onTogglePublished(row.id, !row.published)}>
                    {row.published ? 'Unpublish' : 'Publish'}
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => onDelete(row)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminHomeCms() {
  const toast = useToast();
  const { reload: reloadPublicContent } = useHomeContent();
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Partial<Record<keyof HomeCopy, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: CollectionKind; id: string; label: string } | null>(null);
  /** Which entity dialog is open, and the row it is editing (null = creating). */
  const [editing, setEditing] = useState<{ kind: CollectionKind; row: Row | null } | null>(null);

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

  /**
   * Create or update one row.
   *
   * Social links are the odd one out: the API is `PUT /socials` keyed on platform, not
   * POST/PATCH on an id, because the schema allows exactly one row per platform. Doing it
   * any other way here would let the UI offer a second GitHub link the database refuses.
   */
  async function saveEntity(kind: CollectionKind, row: Row | null, values: Record<string, FieldValue>) {
    try {
      if (kind === 'socials') {
        await api.put('/admin/home/socials', values);
      } else if (row) {
        await api.patch(`/admin/home/${kind}/${row.id}`, values);
      } else {
        await api.post(`/admin/home/${kind}`, values);
      }
      toast.push('success', row ? 'Saved' : 'Added');
      load();
      reloadPublicContent();
    } catch (err) {
      // Rethrown so the dialog shows it inline and stays open with the user's input.
      throw new Error(getErrorMessage(err, 'Could not save'));
    }
  }

  async function togglePublished(kind: CollectionKind, id: string, published: boolean) {
    try {
      await api.patch(`/admin/home/${kind}/${id}`, { published });
      toast.push('success', published ? 'Published' : 'Unpublished');
      load();
      reloadPublicContent();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not update'));
    }
  }

  /**
   * Moderation. Approving also publishes, because an approved-but-unpublished review is
   * a state an admin almost never wants and would have to notice to fix; rejecting
   * unpublishes for the same reason.
   */
  async function moderate(id: string, status: ReviewStatus) {
    try {
      await api.patch(`/admin/home/reviews/${id}`, {
        status,
        published: status === 'APPROVED',
      });
      toast.push('success', status === 'APPROVED' ? 'Review approved and published' : 'Review rejected');
      load();
      reloadPublicContent();
    } catch (err) {
      toast.push('error', getErrorMessage(err, 'Could not update that review'));
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

  function ListSection({ kind, title, rows, labelOf, addLabel, description }: {
    kind: CollectionKind;
    title: string;
    rows: Row[];
    labelOf: (row: never) => string;
    addLabel: string;
    description?: string;
  }) {
    return (
      <section className="mb-6 rounded-xl border border-subtle bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-primary">
            {title} <span className="text-xs font-normal text-muted">({rows.length})</span>
            {description && <span className="ml-2 text-xs font-normal text-muted">{description}</span>}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setEditing({ kind, row: null })}>
            {addLabel}
          </Button>
        </div>
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
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ kind, row })}>
                    Edit
                  </Button>
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
              // The hero image is a file, not a string an admin should have to produce a
              // URL for by hand — so it gets the upload control instead of a text box.
              if (key === 'heroImageUrl') {
                return (
                  <div key={key} className="sm:col-span-2">
                    <ImageField
                      label={label}
                      value={valueOf(key) || null}
                      onChange={(url) => setDirty((d) => ({ ...d, heroImageUrl: url ?? '' }))}
                      hint="Leave empty to use the built-in illustration."
                    />
                  </div>
                );
              }

              const long =
                key === 'heroSubtext' ||
                key === 'footerTagline' ||
                key === 'newsletterBody' ||
                key.startsWith('howStep');
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

      <ListSection
        kind="courses"
        title="Course cards"
        addLabel="Add card"
        rows={data.courses}
        labelOf={(c: CourseRow) => `${c.title} — ${c.metaLabel}`}
      />

      <ReviewsPanel
        rows={data.reviews}
        onAdd={() => setEditing({ kind: 'reviews', row: null })}
        onEdit={(row) => setEditing({ kind: 'reviews', row })}
        onModerate={moderate}
        onTogglePublished={(id, published) => togglePublished('reviews', id, published)}
        onDelete={(row) => setDeleteTarget({ kind: 'reviews', id: row.id, label: `${row.name}'s review` })}
      />

      <ListSection
        kind="companies"
        title="Companies"
        addLabel="Add company"
        description="Shown in the scrolling marquee."
        rows={data.companies}
        labelOf={(c: CompanyRow) => (c.logoUrl ? `${c.name} (logo)` : `${c.name} (wordmark)`)}
      />

      <ListSection
        kind="socials"
        title="Follow us links"
        addLabel="Set a link"
        description="Drives both the contact row and the footer column."
        rows={data.socials}
        labelOf={(s: SocialRow) => `${s.platform} — ${s.url}`}
      />

      <ListSection
        kind="footer-links"
        title="Footer links"
        addLabel="Add link"
        rows={data.footerLinks}
        labelOf={(f: FooterRow) => `${f.section === 'PLATFORM' ? 'Platform' : 'Company'} · ${f.label} → ${f.href}`}
      />

      <EntityDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `${editing.row ? 'Edit' : 'New'} ${
                { courses: 'course card', reviews: 'review', companies: 'company', socials: 'social link', 'footer-links': 'footer link' }[editing.kind]
              }`
            : ''
        }
        fields={editing ? FIELDS_BY_KIND[editing.kind] : []}
        initial={editing?.row ?? null}
        submitLabel={editing?.row ? 'Save changes' : 'Create'}
        onSubmit={(values) => saveEntity(editing!.kind, editing!.row, values)}
      />

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
