import type { ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconBan,
  IconCheckCircle,
  IconClock,
  IconCpu,
  IconLoader,
  IconXCircle,
} from './icons';

/* ── Difficulty (guide 0.2 — same colors everywhere, no exceptions) ── */

const difficultyMeta: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  EASY: { label: 'Easy', dot: 'bg-easy', text: 'text-easy', bg: 'bg-easy/10' },
  MEDIUM: { label: 'Medium', dot: 'bg-medium', text: 'text-medium', bg: 'bg-medium/10' },
  HARD: { label: 'Hard', dot: 'bg-hard', text: 'text-hard', bg: 'bg-hard/10' },
};

export function difficultyTextClass(difficulty: string): string {
  return difficultyMeta[difficulty]?.text ?? 'text-muted';
}

export function DifficultyBadge({ difficulty, dot = true }: { difficulty: string; dot?: boolean }) {
  const meta = difficultyMeta[difficulty] ?? {
    label: difficulty,
    dot: 'bg-muted',
    text: 'text-muted',
    bg: 'bg-raised',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.text} ${meta.bg}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
      {meta.label}
    </span>
  );
}

/* ── Verdicts ── */

export interface VerdictMeta {
  label: string;
  short: string;
  text: string;
  bg: string;
  border: string;
  icon: (p: { className?: string }) => ReactNode;
}

export const statusMeta: Record<string, VerdictMeta> = {
  PENDING: {
    label: 'Pending',
    short: 'Pending',
    text: 'text-secondary',
    bg: 'bg-raised',
    border: 'border-subtle',
    icon: IconLoader,
  },
  RUNNING: {
    label: 'Running',
    short: 'Running',
    text: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/30',
    icon: IconLoader,
  },
  ACCEPTED: {
    label: 'Accepted',
    short: 'AC',
    text: 'text-easy',
    bg: 'bg-easy/10',
    border: 'border-easy/30',
    icon: IconCheckCircle,
  },
  WRONG_ANSWER: {
    label: 'Wrong Answer',
    short: 'WA',
    text: 'text-hard',
    bg: 'bg-hard/10',
    border: 'border-hard/30',
    icon: IconXCircle,
  },
  TIME_LIMIT_EXCEEDED: {
    label: 'Time Limit Exceeded',
    short: 'TLE',
    text: 'text-medium',
    bg: 'bg-medium/10',
    border: 'border-medium/30',
    icon: IconClock,
  },
  MEMORY_LIMIT_EXCEEDED: {
    label: 'Memory Limit Exceeded',
    short: 'MLE',
    text: 'text-medium',
    bg: 'bg-medium/10',
    border: 'border-medium/30',
    icon: IconCpu,
  },
  RUNTIME_ERROR: {
    label: 'Runtime Error',
    short: 'RE',
    text: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/30',
    icon: IconAlertTriangle,
  },
  COMPILE_ERROR: {
    label: 'Compile Error',
    short: 'CE',
    text: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/30',
    icon: IconBan,
  },
};

const fallbackMeta: VerdictMeta = {
  label: 'Unknown',
  short: '?',
  text: 'text-muted',
  bg: 'bg-raised',
  border: 'border-subtle',
  icon: IconLoader,
};

export function verdictMeta(status: string): VerdictMeta {
  return statusMeta[status] ?? { ...fallbackMeta, label: status, short: status };
}

export function VerdictPill({
  status,
  subtitle,
  compact = false,
}: {
  status: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const meta = verdictMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.text} ${meta.bg} ${meta.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {compact ? meta.short : meta.label}
      {subtitle && <span className="font-normal opacity-70">{subtitle}</span>}
    </span>
  );
}

/** Kept as an alias so existing call sites keep working. */
export const StatusBadge = VerdictPill;

/* ── Topic chip ── */

export function TopicChip({
  name,
  active = false,
  onClick,
}: {
  name: string;
  active?: boolean;
  onClick?: () => void;
}) {
  // `btn-gradient` brings its own label colour, so the selected chip can never end up
  // dark-on-dark the way a flat `bg-accent` could.
  const cls = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
    active ? 'btn-gradient' : 'bg-raised text-secondary'
  }`;
  if (!onClick) return <span className={cls}>{name}</span>;
  return (
    // The hover tint is for the *unselected* state only. Applying it to both is what
    // turned a selected chip's label near-black on its own dark fill.
    <button type="button" onClick={onClick} className={`${cls} ${active ? '' : 'hover:text-primary'}`}>
      {name}
    </button>
  );
}
