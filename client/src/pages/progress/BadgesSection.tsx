import { LevelBadgeIcon } from '../../components/LevelBadge';
import { LEVELS } from '../../utils/levels';
import type { BadgeState } from '../../context/GamificationContext';

const rarityRing: Record<string, string> = {
  COMMON: 'ring-slate-500/30',
  RARE: 'ring-info/40',
  EPIC: 'ring-accent/50',
  LEGENDARY: 'ring-medium/50',
};

const rarityText: Record<string, string> = {
  COMMON: 'text-muted',
  RARE: 'text-info',
  EPIC: 'text-accent',
  LEGENDARY: 'text-medium',
};

export default function BadgesSection({ badges }: { badges: BadgeState[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-primary">
          Badges <span className="ml-1 text-sm font-normal text-muted">{earned} / {badges.length}</span>
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {badges.map((badge, index) => {
          // Reuse the level badge silhouettes so a badge's shape scales with its position.
          const shape = LEVELS[Math.min(index, LEVELS.length - 1)];
          return (
            <div key={badge.code} className="flex w-24 shrink-0 flex-col items-center text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-xl ring-1 ${
                  badge.earned ? rarityRing[badge.rarity] : 'ring-subtle'
                } ${badge.earned ? 'bg-raised' : 'bg-canvas'}`}
              >
                <LevelBadgeIcon level={shape} className="h-9 w-9" locked={!badge.earned} />
              </div>
              <p className={`mt-2 text-xs font-semibold ${badge.earned ? 'text-primary' : 'text-muted'}`}>
                {badge.name}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted">{badge.description}</p>
              {badge.earned && (
                <span className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${rarityText[badge.rarity]}`}>
                  {badge.rarity}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-easy transition-all duration-700"
            style={{ width: `${badges.length ? (earned / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </section>
  );
}
