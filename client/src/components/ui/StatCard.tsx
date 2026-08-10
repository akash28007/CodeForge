import type { ReactNode } from 'react';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  caption?: string;
  /** Tailwind text-* class tinting the icon chip. */
  tone?: string;
  className?: string;
}

export default function StatCard({ icon, label, value, caption, tone = 'text-accent', className = '' }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-subtle bg-surface p-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-raised ${tone}`}>{icon}</span>
        )}
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-primary tabular-nums">{value}</p>
      {caption && <p className="mt-1 text-xs text-secondary">{caption}</p>}
    </div>
  );
}
