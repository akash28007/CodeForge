import { useRef, useState } from 'react';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import { useToast } from './ui/Toast';

/** Mirrors `MAX_UPLOAD_BYTES` on the server. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface AvatarPickerProps {
  name: string;
  avatarUrl: string | null;
  /** Fired with the new value after the server confirms it. */
  onChange: (avatarUrl: string | null) => void;
  size?: 'lg' | 'xl';
}

/**
 * Upload / remove control for the signed-in user's own picture.
 *
 * Shared between Settings and the Edit Profile dialog rather than written twice — two
 * copies of an upload flow is exactly where the size limit, the input reset and the
 * error handling drift apart.
 */
export default function AvatarPicker({ name, avatarUrl, onChange, size = 'xl' }: AvatarPickerProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    // A courtesy check so an oversized file fails instantly rather than after a slow
    // upload. The server enforces the real limit, and decides the accepted formats by
    // magic bytes rather than by this input's `accept`.
    if (file.size > MAX_AVATAR_BYTES) {
      toast.push('error', 'That image is too large', 'Pick a picture under 2 MB.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.post<{ avatarUrl: string | null }>('/profile/avatar', body);
      onChange(res.data.avatarUrl);
      toast.push('success', 'Profile picture updated');
    } catch (err) {
      toast.push('error', 'Could not upload that picture', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
      // Clearing the input means re-picking the same file still fires `change`.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete('/profile/avatar');
      onChange(null);
      toast.push('success', 'Profile picture removed');
    } catch (err) {
      toast.push('error', 'Could not remove your picture', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} src={avatarUrl} size={size} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm font-medium text-secondary">Profile picture</span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
            {avatarUrl ? 'Change picture' : 'Upload picture'}
          </Button>
          {avatarUrl && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">PNG, JPEG, GIF or WebP · up to 2 MB. Square images look best.</p>
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
    </div>
  );
}
