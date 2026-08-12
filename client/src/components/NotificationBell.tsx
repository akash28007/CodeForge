import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, type NotificationItem } from '../context/NotificationsContext';
import { useDismiss } from '../hooks/useOutsideClick';
import { IconBell, IconCheckCircle, IconFlame, IconStar, IconTrophy } from './icons';

const typeIcon: Record<NotificationItem['type'], (p: { className?: string }) => JSX.Element> = {
  SUBMISSION_RESULT: IconCheckCircle,
  BADGE_EARNED: IconStar,
  LEVEL_UP: IconTrophy,
  STREAK_REMINDER: IconFlame,
  ANNOUNCEMENT: IconBell,
};

const typeTone: Record<NotificationItem['type'], string> = {
  SUBMISSION_RESULT: 'text-easy',
  BADGE_EARNED: 'text-medium',
  LEVEL_UP: 'text-accent',
  STREAK_REMINDER: 'text-medium',
  ANNOUNCEMENT: 'text-info',
};

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useDismiss(containerRef, open, () => setOpen(false));

  function handleClick(item: NotificationItem) {
    if (!item.readAt) void markRead(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  const recent = items.slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-md p-1.5 text-secondary transition-colors hover:bg-raised hover:text-primary"
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hard px-1 text-[9px] font-bold text-canvas">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-subtle bg-surface shadow-panel">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-2.5">
            <span className="text-sm font-semibold text-primary">Notifications</span>
            {unread > 0 && (
              <button onClick={() => void markAllRead()} className="text-xs font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {recent.map((item) => {
                const Icon = typeIcon[item.type] ?? IconBell;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleClick(item)}
                      className={`flex w-full gap-2.5 border-b border-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-raised/60 ${
                        item.readAt ? '' : 'bg-accent/5'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeTone[item.type] ?? 'text-muted'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm ${item.readAt ? 'text-secondary' : 'font-semibold text-primary'}`}>
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted">{relativeTime(item.createdAt)}</span>
                        </span>
                        {item.body && <span className="mt-0.5 block text-xs text-muted">{item.body}</span>}
                      </span>
                      {!item.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-subtle px-4 py-2.5 text-center text-xs font-medium text-accent hover:bg-raised/60"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
