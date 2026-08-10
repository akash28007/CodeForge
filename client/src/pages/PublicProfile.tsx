import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import { ErrorState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import LevelBadge, { LevelBadgeIcon } from '../components/LevelBadge';
import { levelForXp, LEVELS } from '../utils/levels';
import type { BadgeState } from '../context/GamificationContext';
import { IconCheckCircle, IconFlame, IconTrophy, IconUser } from '../components/icons';

interface PublicProfileData {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  profileViews: number;
  createdAt: string;
  xp: number;
  level: { rank: number; name: string; minXp: number };
  rank: number | null;
  streak: { current: number; longest: number };
  solvedCount: number;
  badges: BadgeState[];
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setProfile(null);
    setError(null);
    api
      .get<PublicProfileData>(`/u/${username}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(getErrorMessage(err, 'That profile does not exist.')));
  }, [username]);

  if (error) return <ErrorState title="Profile not found" description={error} />;
  if (!profile) return <SkeletonRows rows={5} className="h-20" />;

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-xl border border-subtle bg-surface p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-primary">{profile.name}</h1>
            <p className="text-sm text-muted">@{profile.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LevelBadge xp={profile.xp} size="md" />
              <span className="text-sm font-semibold tabular-nums text-secondary">
                {profile.xp.toLocaleString()} XP
              </span>
            </div>
          </div>
          <LevelBadgeIcon level={levelForXp(profile.xp)} className="h-14 w-14" />
        </div>

        {profile.bio && <p className="mt-4 text-sm text-secondary">{profile.bio}</p>}
        <p className="mt-3 text-xs text-muted">Joined {joined}</p>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconTrophy className="h-4 w-4" />}
          label="Global Rank"
          value={profile.rank ? `#${profile.rank}` : '—'}
          tone="text-medium"
        />
        <StatCard
          icon={<IconCheckCircle className="h-4 w-4" />}
          label="Problems Solved"
          value={profile.solvedCount}
          tone="text-easy"
        />
        <StatCard
          icon={<IconFlame className="h-4 w-4" />}
          label="Current Streak"
          value={`${profile.streak.current}d`}
          caption={`Longest: ${profile.streak.longest}d`}
          tone="text-medium"
        />
        <StatCard
          icon={<IconUser className="h-4 w-4" />}
          label="Profile Views"
          value={profile.profileViews}
        />
      </div>

      <section className="mt-4 rounded-xl border border-subtle bg-surface p-5">
        <h2 className="mb-4 font-semibold text-primary">
          Badges <span className="text-sm font-normal text-muted">{profile.badges.length} earned</span>
        </h2>
        {profile.badges.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No badges earned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {profile.badges.map((badge, i) => (
              <div key={badge.code} className="flex w-24 flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-raised ring-1 ring-subtle">
                  <LevelBadgeIcon level={LEVELS[Math.min(i, LEVELS.length - 1)]} className="h-8 w-8" />
                </div>
                <p className="mt-1.5 text-xs font-semibold text-primary">{badge.name}</p>
                <p className="text-[10px] leading-tight text-muted">{badge.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
