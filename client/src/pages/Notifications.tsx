import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, type NotificationItem } from '../context/NotificationsContext';
import Button from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import { IconBell, IconCheckCircle, IconFlame, IconStar, IconTrophy } from '../components/icons';

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

export default function Notifications() {
  const { items, unread, loading, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const visible = filter === 'unread' ? items.filter((n) => !n.readAt) : items;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-secondary">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        )}
      </header>

      <div className="mb-4 flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === f ? 'bg-primary text-canvas' : 'border border-subtle bg-surface text-secondary hover:text-primary'
            }`}
          >
            {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <SkeletonRows rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconBell />}
          title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'You have read everything here.'
              : 'Submission results, badges, and level-ups will appear here.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const Icon = typeIcon[item.type] ?? IconBell;
            const content = (
              <div
                className={`flex gap-3 rounded-xl border p-4 transition-colors ${
                  item.readAt ? 'border-subtle bg-surface' : 'border-accent/30 bg-accent/5'
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${typeTone[item.type] ?? 'text-muted'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${item.readAt ? 'text-secondary' : 'font-semibold text-primary'}`}>
                      {item.title}
                    </p>
                    <time className="shrink-0 text-xs text-muted" dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {item.body && <p className="mt-1 text-sm text-muted">{item.body}</p>}
                  {!item.readAt && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        void markRead(item.id);
                      }}
                      className="mt-2 text-xs font-medium text-accent hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );

            return (
              <li key={item.id}>
                {item.link ? (
                  <Link to={item.link} onClick={() => !item.readAt && void markRead(item.id)} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
