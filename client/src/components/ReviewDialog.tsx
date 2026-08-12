import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import type { Review } from '../context/HomeContentContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import TextField from './ui/TextField';
import Avatar from './ui/Avatar';
import { useToast } from './ui/Toast';
import { IconStar } from './icons';

/** Clickable 1–5 rating. Keyboard-reachable because each star is a real button. */
function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">Your rating</span>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <IconStar filled={n <= shown} className={`h-7 w-7 ${n <= shown ? 'text-medium' : 'text-subtle'}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-primary">{value}.0</span>
      </div>
    </div>
  );
}

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  /** The caller's existing review, if any — drives edit-vs-create. */
  existing: Review | null;
  onSaved: (review: Review | null) => void;
}

const MAX_BODY = 600;

export default function ReviewDialog({ open, onClose, existing, onSaved }: ReviewDialogProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [designation, setDesignation] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = existing?.status === 'PENDING';

  // Re-seed the form each time the dialog opens, so a cancelled edit does not leave
  // stale text behind for the next open.
  useEffect(() => {
    if (!open) return;
    setDesignation(existing?.designation ?? '');
    setRating(existing?.rating ?? 5);
    setBody(existing?.body ?? '');
    setError(null);
  }, [open, existing]);

  async function save() {
    if (body.trim().length < 10) {
      setError('Please write at least a sentence or two.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { designation: designation.trim() || null, rating, body: body.trim() };
      const res = editing
        ? await api.patch<Review>('/reviews/mine', payload)
        : await api.post<Review>('/reviews', payload);
      onSaved(res.data);
      toast.push('success', editing ? 'Review updated' : 'Thanks! Your review is awaiting approval');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your review.'));
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    setSaving(true);
    try {
      await api.delete('/reviews/mine');
      onSaved(null);
      toast.push('success', 'Review withdrawn');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not withdraw your review.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit your review' : 'Write a review'}
      description="An admin approves reviews before they appear on the homepage."
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          {editing && (
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => void withdraw()}>
              Withdraw
            </Button>
          )}
          <span className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={() => void save()}>
              {editing ? 'Save changes' : 'Submit for approval'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Name and picture are shown, not edited: they come from the account, so the
            review is attributable to a real profile on this site. */}
        <div className="flex items-center gap-3 rounded-lg border border-subtle bg-canvas p-3">
          <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">{user?.name}</p>
            <p className="text-xs text-muted">
              Posted from your account. Change your name or picture in Settings.
            </p>
          </div>
        </div>

        <TextField
          label="Designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          maxLength={80}
          placeholder="Student, SDE @ Acme, …"
          hint="Optional — shown under your name."
        />

        <RatingPicker value={rating} onChange={setRating} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-body" className="text-sm font-medium text-secondary">
            Your review
          </label>
          <textarea
            id="review-body"
            value={body}
            maxLength={MAX_BODY}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What has CodeForge helped you with?"
            className="h-32 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
          />
          <p className="text-xs text-muted">
            {body.length}/{MAX_BODY}
          </p>
        </div>

        {error && <p className="text-sm text-hard">{error}</p>}
      </div>
    </Modal>
  );
}
