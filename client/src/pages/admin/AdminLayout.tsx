import { NavLink, Outlet } from 'react-router-dom';
import {
  IconBarChart,
  IconClipboard,
  IconCode,
  IconCpu,
  IconSettings,
  IconTrophy,
  IconUser,
} from '../../components/icons';

const sections = [
  { to: '/admin', end: true, label: 'Dashboard', icon: IconBarChart },
  { to: '/admin/users', label: 'Users', icon: IconUser },
  { to: '/admin/submissions', label: 'Judge monitor', icon: IconCpu },
  { to: '/admin/problems', label: 'Problems', icon: IconClipboard },
  { to: '/admin/home', label: 'Homepage', icon: IconCode },
  { to: '/admin/resources', label: 'Resources', icon: IconTrophy },
  { to: '/admin/gamification', label: 'Gamification', icon: IconSettings },
  { to: '/admin/audit', label: 'Audit log', icon: IconClipboard },
];

/**
 * Admin shell. The nav is only a convenience — every route behind it is guarded by
 * `ProtectedRoute adminOnly` on the client *and* by `RolesGuard(ADMIN)` on the server,
 * so hiding the links is never what keeps a non-admin out.
 */
export default function AdminLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside>
        <h1 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-muted">Admin</h1>
        <nav>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map(({ to, end, label, icon: Icon }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-secondary hover:bg-raised hover:text-primary'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

/** Shared page header for admin screens. */
export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {action}
    </header>
  );
}
