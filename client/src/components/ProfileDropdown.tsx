import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useDismiss } from '../hooks/useOutsideClick';
import LevelBadge from './LevelBadge';
import ProgressBar from './ui/ProgressBar';
import Avatar from './ui/Avatar';
import { IconBarChart, IconChevronDown, IconLogOut, IconPieChart, IconSettings, IconStar } from './icons';

interface MenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const items: MenuItem[] = [
  { to: '/progress', label: 'Progress', icon: <IconPieChart className="w-4 h-4" /> },
  { to: '/settings', label: 'Settings', icon: <IconSettings className="w-4 h-4" /> },
  { to: '/favourites', label: 'Favourites', icon: <IconStar className="w-4 h-4" filled={false} /> },
];

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const { summary } = useGamification();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismiss(panelRef, open, () => setOpen(false), triggerRef);

  if (!user) return null;

  function handleSignOut() {
    setOpen(false);
    logout();
    navigate('/');
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm text-secondary hover:bg-raised hover:text-primary transition-colors"
      >
        {/* The picture itself is the trigger — it's the most visible place a user's
            avatar can appear, and it confirms at a glance whose session this is. */}
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <span className="hidden lg:inline">Profile</span>
        <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* caret connecting the panel to the trigger */}
          <span className="absolute right-4 top-full z-40 mt-1 h-2 w-2 rotate-45 border-l border-t border-subtle bg-surface" />
          <div
            ref={panelRef}
            role="menu"
            className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-subtle bg-surface shadow-panel animate-pop"
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} src={user.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-primary">{user.name}</p>
                    {user.role === 'ADMIN' && (
                      <span className="shrink-0 rounded-full bg-medium/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>

              {summary && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <LevelBadge xp={summary.xp} />
                    <span className="text-xs font-semibold tabular-nums text-secondary">
                      {summary.xp.toLocaleString()} XP
                    </span>
                  </div>
                  {summary.nextLevel && (
                    <>
                      <ProgressBar value={summary.percentToNext} className="mt-2" />
                      <p className="mt-1 text-[11px] text-muted">
                        {summary.xpRemaining.toLocaleString()} XP to {summary.nextLevel.name}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-subtle py-1">
              {/* Convenience only — /admin is guarded by ProtectedRoute on the client
                  and RolesGuard(ADMIN) on the server, so hiding it is never the
                  thing that keeps a non-admin out. */}
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-accent hover:bg-raised transition-colors"
                >
                  <span className="text-accent"><IconBarChart className="w-4 h-4" /></span>
                  Admin panel
                </Link>
              )}
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-raised hover:text-primary transition-colors"
                >
                  <span className="text-muted">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-subtle py-1">
              <button
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-hard hover:bg-hard/10 transition-colors"
              >
                <IconLogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
