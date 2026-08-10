import { useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';
import Modal from '../../components/ui/Modal';
import LevelBadge from '../../components/LevelBadge';
import { TopicChip } from '../../components/Badge';
import { useToast } from '../../components/ui/Toast';
import { IconBarChart, IconCode, IconFlame, IconTrophy, IconUser } from '../../components/icons';

export interface ProfileCard {
  id: string;
  name: string;
  email: string;
  username: string | null;
  bio: string | null;
  profileViews: number;
  xp: number;
  level: { rank: number; name: string; minXp: number };
  rank: number | null;
  totalRanked: number;
  streak: { current: number; longest: number };
  skills: string[];
  languages: string[];
}

function Block({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-1 text-sm text-secondary">{children}</div>
      </div>
    </div>
  );
}

export default function ProfileSidebar({ card, onUpdated }: { card: ProfileCard; onUpdated: () => void }) {
  const { push } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(card.name);
  const [username, setUsername] = useState(card.username ?? '');
  const [bio, setBio] = useState(card.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch('/profile', { name, username, bio });
      push('success', 'Profile updated');
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="rounded-xl border border-subtle bg-surface p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar name={card.name} size="xl" />
        <h1 className="mt-3 text-lg font-bold text-primary">{card.name}</h1>
        {card.username && <p className="text-sm text-muted">@{card.username}</p>}
        <div className="mt-2.5">
          <LevelBadge xp={card.xp} size="md" />
        </div>
        {card.bio && <p className="mt-3 text-sm text-secondary">{card.bio}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-raised px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-secondary">
          <IconTrophy className="h-4 w-4 text-medium" />
          Rank
        </span>
        <span className="text-sm font-bold tabular-nums text-primary">
          {card.rank ? `#${card.rank}` : '—'}
          {card.rank && <span className="ml-1 text-xs font-normal text-muted">of {card.totalRanked}</span>}
        </span>
      </div>

      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setEditing(true)}>
        Edit Profile
      </Button>

      <div className="mt-5 flex flex-col gap-4 border-t border-subtle pt-4">
        <Block icon={<IconUser className="h-4 w-4" />} label="Profile Views">
          <span className="tabular-nums">{card.profileViews}</span>
        </Block>

        <Block icon={<IconFlame className="h-4 w-4" />} label="Streak">
          <span className="tabular-nums">
            {card.streak.current} day{card.streak.current === 1 ? '' : 's'}
          </span>
          <span className="text-muted"> · longest {card.streak.longest}</span>
        </Block>

        <Block icon={<IconCode className="h-4 w-4" />} label="Languages">
          {card.languages.length ? card.languages.map((l) => l.toUpperCase()).join(', ') : '—'}
        </Block>

        <Block icon={<IconBarChart className="h-4 w-4" />} label="Skills">
          {card.skills.length ? (
            <div className="flex flex-wrap gap-1.5">
              {card.skills.map((s) => (
                <TopicChip key={s} name={s} />
              ))}
            </div>
          ) : (
            <span className="text-muted">Solve problems to build this up</span>
          )}
        </Block>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit profile"
        description="Your skills and languages are derived from what you solve, so they can't be edited here."
      >
        <form onSubmit={save} className="flex flex-col gap-4" id="edit-profile-form">
          <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            hint="3–20 characters: lowercase letters, numbers, underscores"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio-field" className="text-sm font-medium text-secondary">
              Bio
            </label>
            <textarea
              id="bio-field"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              className="h-24 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
            />
            <p className="text-xs text-muted">{bio.length}/300</p>
          </div>
          {error && <p className="text-sm text-hard">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </aside>
  );
}
