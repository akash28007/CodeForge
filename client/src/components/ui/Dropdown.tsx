import { useRef, useState } from 'react';
import { useDismiss } from '../../hooks/useOutsideClick';
import { IconCheck, IconChevronDown } from '../icons';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefix shown before the selected label, e.g. "Sort: ". */
  label?: string;
  className?: string;
  align?: 'left' | 'right';
}

/** Accessible select-style dropdown. Closes on outside click, Esc, and selection. */
export default function Dropdown<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
  align = 'right',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismiss(panelRef, open, () => setOpen(false), triggerRef);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary hover:border-muted transition-colors"
      >
        <span className="truncate">
          {label && <span className="text-muted">{label}</span>}
          {selected?.label ?? 'Select'}
        </span>
        <IconChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          className={`absolute z-30 mt-1.5 min-w-full overflow-hidden rounded-lg border border-subtle bg-surface shadow-panel animate-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors ${
                option.value === value ? 'bg-raised text-primary' : 'text-secondary hover:bg-raised hover:text-primary'
              }`}
            >
              {option.label}
              {option.value === value && <IconCheck className="w-3.5 h-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
