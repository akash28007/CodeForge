import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { IconMoon, IconSun } from './icons';

/**
 * Top-bar light/dark switch. Deliberately rendered for signed-out visitors too — the
 * theme lives in `localStorage`, so it works with no account at all.
 *
 * When someone *is* signed in the choice is also written to their preferences, the same
 * row the Settings page edits, so the two can't disagree. That write is fire-and-forget:
 * the visual change already happened locally, and failing to persist it is not worth
 * interrupting the user with a toast on what is meant to be a one-click control.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const next = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    setTheme(next);
    if (user) void api.patch('/settings/preferences', { theme: next }).catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-raised hover:text-primary ${className}`}
    >
      {theme === 'dark' ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
    </button>
  );
}
