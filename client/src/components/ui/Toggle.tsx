interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Right-aligned count, used by the Problems page filter lists. */
  count?: number;
  className?: string;
}

export function Checkbox({ checked, onChange, label, count, className = '' }: CheckboxProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-raised transition-colors ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-subtle bg-surface checked:border-accent checked:bg-accent relative checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[10px] checked:after:font-bold checked:after:text-white checked:after:content-['✓']"
      />
      <span className="flex-1 text-secondary">{label}</span>
      {count !== undefined && <span className="text-xs text-muted tabular-nums">{count}</span>}
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Hides the visible label but keeps it for screen readers. */
  hideLabel?: boolean;
}

export function Switch({ checked, onChange, label, hideLabel = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-raised'}`}
      >
        <span
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(1rem)' : 'translateX(0)' }}
        />
      </span>
      {!hideLabel && <span className="text-sm text-secondary">{label}</span>}
    </button>
  );
}
