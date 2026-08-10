import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import Dropdown from '../components/ui/Dropdown';
import { Checkbox } from '../components/ui/Toggle';
import { ConfirmModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonRows } from '../components/ui/Skeleton';

interface Preferences {
  theme: string;
  editorFontSize: number;
  editorLanguage: string;
  notifyVerdicts: boolean;
  notifyBadges: boolean;
  notifyStreaks: boolean;
  notifyAnnouncements: boolean;
}

interface ProfileCard {
  name: string;
  email: string;
  username: string | null;
  bio: string | null;
}

type Tab = 'profile' | 'account' | 'preferences' | 'notifications' | 'danger';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'account', label: 'Account' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'danger', label: 'Danger zone' },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <h2 className="font-semibold text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('profile');
  const [card, setCard] = useState<ProfileCard | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [cardRes, prefsRes] = await Promise.all([
      api.get<ProfileCard>('/me/profile-card'),
      api.get<Preferences>('/settings/preferences'),
    ]);
    setCard(cardRes.data);
    setPrefs(prefsRes.data);
    setName(cardRes.data.name);
    setUsername(cardRes.data.username ?? '');
    setBio(cardRes.data.bio ?? '');
  }, []);

  useEffect(() => {
    void load().catch((err) => push('error', 'Could not load settings', getErrorMessage(err, '')));
  }, [load, push]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      await api.patch('/profile', { name, username, bio });
      await refreshUser();
      push('success', 'Profile saved');
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/settings/password', { currentPassword, newPassword });
      push('success', 'Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Could not change your password.'));
    } finally {
      setSavingPassword(false);
    }
  }

  /** Preferences save immediately — a toggle that needs a separate Save button is a trap. */
  async function updatePref(patch: Partial<Preferences>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      await api.patch('/settings/preferences', patch);
    } catch (err) {
      setPrefs(previous);
      push('error', 'Could not save that setting', getErrorMessage(err, 'Please try again.'));
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.delete('/settings/account', { data: { password: deletePassword } });
      push('success', 'Account deleted');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      push('error', 'Could not delete account', getErrorMessage(err, 'Please try again.'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!card || !prefs) return <SkeletonRows rows={5} className="h-16" />;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-primary">Settings</h1>
        <p className="mt-1 text-sm text-secondary">Manage your profile, account, and preferences.</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-accent text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            } ${t.key === 'danger' ? 'ml-auto' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Section title="Public profile" description="How you appear on the leaderboard and to other users.">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              hint="3–20 characters: lowercase letters, numbers, underscores"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-bio" className="text-sm font-medium text-secondary">Bio</label>
              <textarea
                id="settings-bio"
                value={bio}
                maxLength={300}
                onChange={(e) => setBio(e.target.value)}
                className="h-24 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
              />
              <p className="text-xs text-muted">{bio.length}/300</p>
            </div>
            {profileError && <p className="text-sm text-hard">{profileError}</p>}
            <Button type="submit" size="sm" loading={savingProfile} className="self-start">
              Save profile
            </Button>
          </form>
        </Section>
      )}

      {tab === 'account' && (
        <div className="flex flex-col gap-4">
          <Section title="Email" description="Your sign-in address. Contact an admin to change it.">
            <TextField label="Email" value={card.email} readOnly disabled />
          </Section>

          <Section title="Change password">
            <form onSubmit={savePassword} className="flex flex-col gap-4">
              <TextField
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <TextField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {passwordError && <p className="text-sm text-hard">{passwordError}</p>}
              <Button type="submit" size="sm" loading={savingPassword} className="self-start">
                Change password
              </Button>
            </form>
          </Section>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="flex flex-col gap-4">
          <Section title="Editor" description="Applies the next time you open a problem.">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">Default language</span>
                <Dropdown
                  options={[{ value: 'cpp', label: 'C++ (GNU g++)' }]}
                  value={prefs.editorLanguage}
                  onChange={(v) => void updatePref({ editorLanguage: v })}
                  className="w-48"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">Font size</span>
                <Dropdown
                  options={[12, 13, 14, 16, 18].map((n) => ({ value: String(n), label: `${n}px` }))}
                  value={String(prefs.editorFontSize)}
                  onChange={(v) => void updatePref({ editorFontSize: Number(v) })}
                  className="w-32"
                />
              </div>
            </div>
          </Section>

          <Section title="Appearance">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">Theme</span>
              <Dropdown
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                value={prefs.theme}
                onChange={(v) => void updatePref({ theme: v })}
                className="w-40"
              />
              <p className="mt-1 text-xs text-muted">
                The light theme is not fully validated yet — the dark theme is the supported default.
              </p>
            </div>
          </Section>
        </div>
      )}

      {tab === 'notifications' && (
        <Section title="Notifications" description="Choose what CodeForge should tell you about.">
          <div className="flex flex-col gap-1">
            <Checkbox
              checked={prefs.notifyVerdicts}
              onChange={(v) => void updatePref({ notifyVerdicts: v })}
              label="Submission results"
            />
            <Checkbox
              checked={prefs.notifyBadges}
              onChange={(v) => void updatePref({ notifyBadges: v })}
              label="Badges and level-ups"
            />
            <Checkbox
              checked={prefs.notifyStreaks}
              onChange={(v) => void updatePref({ notifyStreaks: v })}
              label="Streak reminders"
            />
            <Checkbox
              checked={prefs.notifyAnnouncements}
              onChange={(v) => void updatePref({ notifyAnnouncements: v })}
              label="Announcements"
            />
          </div>
          <p className="mt-3 text-xs text-muted">Changes save immediately.</p>
        </Section>
      )}

      {tab === 'danger' && (
        <section className="rounded-xl border border-hard/30 bg-hard/5 p-5">
          <h2 className="font-semibold text-hard">Delete account</h2>
          <p className="mt-1 text-sm text-secondary">
            This permanently deletes your account, submissions, XP, badges, and bookmarks. It cannot be undone.
          </p>
          {user?.role === 'ADMIN' && (
            <p className="mt-2 text-xs text-medium">
              Admin accounts that authored problems must reassign them first.
            </p>
          )}
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </Button>
        </section>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteAccount()}
        loading={deleting}
        title="Delete your account?"
        description="Everything is removed permanently — submissions, XP, badges, and bookmarks. This cannot be undone."
        confirmLabel="Delete forever"
      >
        <TextField
          label="Confirm your password"
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          autoComplete="current-password"
        />
      </ConfirmModal>
    </div>
  );
}
