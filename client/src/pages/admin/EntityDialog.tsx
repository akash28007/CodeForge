import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { Checkbox } from '../../components/ui/Toggle';
import ImageField from './ImageField';

export type FieldValue = string | number | boolean | null;

export type FieldSpec = {
  key: string;
  label: string;
  hint?: string;
  /** Full-width in the two-column grid. */
  wide?: boolean;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
} & (
  | { type: 'text' | 'textarea' | 'number' }
  | { type: 'select'; options: { value: string; label: string }[] }
  | { type: 'image' }
  | { type: 'toggle' }
);

/**
 * One modal that drives create *and* edit for every homepage collection.
 *
 * Written spec-first rather than as four hand-rolled forms: the collections differ only
 * in their field lists, and four copies of the same dirty-tracking and submit plumbing is
 * exactly where they drift apart. `initial === null` means create.
 */
export default function EntityDialog({
  open,
  onClose,
  title,
  fields,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldSpec[];
  initial: Record<string, unknown> | null;
  submitLabel?: string;
  onSubmit: (values: Record<string, FieldValue>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed on every open so a cancelled edit leaves nothing behind for the next one.
  useEffect(() => {
    if (!open) return;
    const seeded: Record<string, FieldValue> = {};
    for (const field of fields) {
      const existing = initial?.[field.key];
      if (existing !== undefined && existing !== null) {
        seeded[field.key] = existing as FieldValue;
      } else {
        seeded[field.key] =
          field.type === 'toggle' ? true : field.type === 'number' ? 0 : field.type === 'select' ? field.options[0].value : field.type === 'image' ? null : '';
      }
    }
    setValues(seeded);
    setError(null);
  }, [open, initial, fields]);

  const set = (key: string, value: FieldValue) => setValues((v) => ({ ...v, [key]: value }));

  async function submit() {
    const missing = fields.find(
      (f) => f.required && (values[f.key] === null || String(values[f.key] ?? '').trim() === ''),
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={() => void submit()}>
            {submitLabel ?? 'Save'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.key];
          const span = field.wide || field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : '';

          if (field.type === 'toggle') {
            return (
              <div key={field.key} className={`flex flex-col justify-end ${span}`}>
                <Checkbox
                  checked={Boolean(value)}
                  onChange={(v) => set(field.key, v)}
                  label={field.label}
                />
                {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
              </div>
            );
          }

          if (field.type === 'image') {
            return (
              <div key={field.key} className={span}>
                <ImageField
                  label={field.label}
                  hint={field.hint}
                  value={(value as string | null) ?? null}
                  onChange={(url) => set(field.key, url)}
                />
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <label key={field.key} className={`block text-sm ${span}`}>
                <span className="text-secondary">{field.label}</span>
                <div className="mt-1">
                  <Dropdown
                    options={field.options}
                    value={String(value ?? field.options[0].value)}
                    onChange={(v) => set(field.key, v)}
                    align="left"
                  />
                </div>
                {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
              </label>
            );
          }

          return (
            <label key={field.key} className={`block text-sm ${span}`}>
              <span className="text-secondary">
                {field.label}
                {field.required && <span className="text-hard"> *</span>}
              </span>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={String(value ?? '')}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.key, e.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(value ?? '')}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                  className={inputClass}
                />
              )}
              {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
            </label>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-hard">{error}</p>}
    </Modal>
  );
}
