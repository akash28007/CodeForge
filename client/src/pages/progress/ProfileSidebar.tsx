import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import Avatar from '../../components/ui/Avatar';
import AvatarPicker from '../../components/AvatarPicker';
import Button, { ButtonLink } from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';
import Modal from '../../components/ui/Modal';
import LevelBadge from '../../components/LevelBadge';
import { TopicChip } from '../../components/Badge';
import { useToast } from '../../components/ui/Toast';
import { IconBarChart, IconCalendar, IconCode, IconFlame, IconTrophy, IconUser } from '../../components/icons';

export interface ProfileCard {
  id: string;
  name: string;
  email: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  profileViews: number;
  xp: number;
  level: { rank: number; name: string; minXp: number };
  rank: number | null;
  totalRanked: number;
  streak: { current: number; longest: number };
  skills: string[];
  languages: string[];
  /** Present from `/me/profile-card`; guarded at the call site for older cached payloads. */
  createdAt?: string;
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
        <Avatar name={card.name} src={card.avatarUrl} size="xl" />
        <h1 className="mt-3 text-lg font-bold text-primary">{card.name}</h1>
        {card.username && <p className="text-sm text-muted">@{card.username}</p>}
        <div className="mt-2.5">
          <LevelBadge xp={card.xp} size="md" />
        </div>
        {card.bio && <p className="mt-3 text-sm text-secondary">{card.bio}</p>}
      </div>

      {/* Rank links to the board it refers to — it was previously a dead figure that
          looked like it should go somewhere. */}
      <Link
        to="/leaderboard"
        className="mt-4 flex items-center justify-between rounded-lg bg-raised px-3 py-2 transition-colors hover:bg-subtle"
      >
        <span className="inline-flex items-center gap-1.5 text-sm text-secondary">
          <IconTrophy className="h-4 w-4 text-medium" />
          Rank
        </span>
        <span className="text-sm font-bold tabular-nums text-primary">
          {card.rank ? `#${card.rank}` : '—'}
          {card.rank && <span className="ml-1 text-xs font-normal text-muted">of {card.totalRanked}</span>}
        </span>
      </Link>

      <div className="mt-3 flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
        {card.username && (
          // `secondary`, not `ghost` — a ghost button on the card it sits on has no fill
          // and no border, so it reads as a stray line of text rather than a control.
          <ButtonLink to={`/u/${card.username}`} variant="secondary" size="sm" className="w-full">
            View public profile
          </ButtonLink>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-subtle pt-4">
        <Block icon={<IconUser className="h-4 w-4" />} label="Profile Views">
          {/* The tooltip states the counting rule, because a number with no stated
              basis invites the assumption that it counts every visit. */}
          <span
            className="tabular-nums"
            title="Signed-in visitors who opened your public profile, counted once per person per day. Your own visits and signed-out visitors are not counted."
          >
            {card.profileViews}
          </span>
        </Block>

        <Block icon={<IconFlame className="h-4 w-4" />} label="Streak">
          <span className="tabular-nums">
            {card.streak.current} day{card.streak.current === 1 ? '' : 's'}
          </span>
          <span className="text-muted"> · longest {card.streak.longest}</span>
        </Block>

        {card.createdAt && (
          <Block icon={<IconCalendar className="h-4 w-4" />} label="Member since">
            {new Date(card.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Block>
        )}

        {/* Languages and skills now go somewhere. They read as filters, and they were
            the "links that aren't touchable" — so they are links. */}
        <Block icon={<IconCode className="h-4 w-4" />} label="Languages">
          {card.languages.length ? (
            <div className="flex flex-wrap gap-1.5">
              {card.languages.map((l) => (
                <Link
                  key={l}
                  to={`/submissions?language=${encodeURIComponent(l)}`}
                  className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  {l.toUpperCase()}
                </Link>
              ))}
            </div>
          ) : (
            <span className="text-muted">—</span>
          )}
        </Block>

        <Block icon={<IconBarChart className="h-4 w-4" />} label="Skills">
          {card.skills.length ? (
            <div className="flex flex-wrap gap-1.5">
              {card.skills.map((s) => (
                <Link key={s} to={`/problems?tags=${encodeURIComponent(s)}`} title={`Practise ${s.replace(/-/g, ' ')}`}>
                  <TopicChip name={s} />
                </Link>
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
          {/* Saves immediately on its own, rather than waiting for the form's Save —
              an upload is not a draft, and pretending otherwise means a cancelled form
              would have to somehow un-upload the file. */}
          <div className="border-b border-subtle pb-4">
            <AvatarPicker name={card.name} avatarUrl={card.avatarUrl} size="lg" onChange={() => onUpdated()} />
          </div>

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
