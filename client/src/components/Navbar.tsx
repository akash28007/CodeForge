import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import ProfileDropdown from './ProfileDropdown';
import NotificationBell from './NotificationBell';
import SearchInput from './ui/SearchInput';
import { ButtonLink } from './ui/Button';
import { IconBarChart, IconClipboard, IconFlame, IconTrophy, LogoMark } from './icons';

const navLinks = [
  { to: '/problems', label: 'Problems', icon: IconClipboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: IconTrophy },
  { to: '/resources', label: 'Resources', icon: IconBarChart },
];

export default function Navbar() {
  const { user } = useAuth();
  const { summary } = useGamification();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  // Keep the box in sync when the Problems page owns the search term via the URL.
  useEffect(() => {
    if (location.pathname === '/problems') setQuery(searchParams.get('search') ?? '');
  }, [location.pathname, searchParams]);

  // Ctrl/Cmd+K focuses the search box from anywhere (guide §1).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/problems?search=${encodeURIComponent(trimmed)}` : '/problems');
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-subtle bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="CodeForge home">
          <LogoMark className="h-7 w-7" />
          <span className="text-lg font-extrabold tracking-tight text-primary">CodeForge</span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-subtle md:block" aria-hidden="true" />

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-raised text-primary' : 'text-secondary hover:bg-raised hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="ml-auto min-w-0 flex-1 md:ml-4 md:max-w-md">
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems..."
            shortcut={['Ctrl', 'K']}
            aria-label="Search problems"
            containerClassName="py-1.5"
          />
        </form>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              {summary && summary.streak.current > 0 && (
                <span
                  title={`${summary.streak.current}-day streak · longest ${summary.streak.longest}`}
                  className="hidden items-center gap-1 rounded-full bg-medium/10 px-2 py-1 text-xs font-semibold text-medium sm:inline-flex"
                >
                  <IconFlame className="h-3.5 w-3.5" />
                  {summary.streak.current}
                </span>
              )}
              <NotificationBell />
              <ProfileDropdown />
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Login
              </ButtonLink>
              <ButtonLink to="/register" variant="primary" size="sm">
                Register
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
