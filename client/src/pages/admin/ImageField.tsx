import { useRef, useState } from 'react';
import { api } from '../../services/api';
import { assetUrl } from '../../utils/assetUrl';
import { getErrorMessage } from '../../utils/errors';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

/** Mirrors `MAX_UPLOAD_BYTES` on the server. */
const MAX_BYTES = 2 * 1024 * 1024;

interface ImageFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}

/**
 * Upload-or-paste image control for CMS rows.
 *
 * Both are allowed on purpose: an uploaded file is the common case, but a company logo
 * often already lives on a CDN, and forcing a re-upload of something that is fine where
 * it is would be busywork. The stored value is a string either way.
 */
export default function ImageField({ label, value, onChange, hint }: ImageFieldProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.push('error', 'That image is too large', 'Pick a file under 2 MB.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.post<{ url: string }>('/admin/uploads', body);
      onChange(res.data.url);
    } catch (err) {
      toast.push('error', 'Upload failed', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">{label}</span>

      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-canvas">
          {value ? (
            <img src={assetUrl(value)} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted">none</span>
          )}
        </span>

        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
            Upload
          </Button>
          {value && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onChange(null)}>
              Clear
            </Button>
          )}
        </span>
      </div>

      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        placeholder="…or paste an image URL"
        className="mt-1 w-full rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent"
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
