import BadgeArt from '../../components/BadgeArt';
import type { BadgeState } from '../../context/GamificationContext';

/** Rarity drives the card's accent, so a Legendary never looks like a Common. */
const rarityStyle: Record<string, { border: string; text: string; chip: string }> = {
  COMMON: { border: 'border-subtle', text: 'text-muted', chip: 'bg-raised' },
  RARE: { border: 'border-info/40', text: 'text-info', chip: 'bg-info/10' },
  EPIC: { border: 'border-accent/50', text: 'text-accent', chip: 'bg-accent/10' },
  LEGENDARY: { border: 'border-medium/50', text: 'text-medium', chip: 'bg-medium/10' },
};

function formatEarned(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BadgesSection({ badges }: { badges: BadgeState[] }) {
  const earned = badges.filter((b) => b.earned).length;
  const pct = badges.length ? (earned / badges.length) * 100 : 0;

  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-primary">
          Badges <span className="ml-1 text-sm font-normal text-muted">{earned} / {badges.length}</span>
        </h2>
        <span className="text-xs text-muted">{Math.round(pct)}% collected</span>
      </div>

      {/* A wrapping grid rather than a horizontal scroller: the old row put later badges
          off-screen behind a scrollbar that was easy to miss, so half the set was
          effectively invisible. Everything is now reachable without scrolling. */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {badges.map((badge) => {
          const style = rarityStyle[badge.rarity] ?? rarityStyle.COMMON;
          const earnedOn = formatEarned(badge.earnedAt);
          return (
            <li
              key={badge.code}
              title={
                badge.earned
                  ? `${badge.name}${earnedOn ? ` — earned ${earnedOn}` : ''}`
                  : `${badge.name} — locked: ${badge.description}`
              }
              className={`flex flex-col items-center rounded-xl border p-3 text-center transition-transform duration-200 hover:-translate-y-0.5 ${
                badge.earned ? `${style.border} bg-raised` : 'border-subtle bg-canvas'
              }`}
            >
              <BadgeArt
                code={badge.code}
                criteria={badge.criteria}
                locked={!badge.earned}
                className="h-16 w-16"
              />

              <p className={`mt-2 text-xs font-semibold ${badge.earned ? 'text-primary' : 'text-secondary'}`}>
                {badge.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted">{badge.description}</p>

              <span
                className={`mt-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  badge.earned ? `${style.chip} ${style.text}` : 'bg-raised text-muted'
                }`}
              >
                {badge.rarity}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-easy transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
