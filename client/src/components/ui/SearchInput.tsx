import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconSearch } from '../icons';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Renders a keyboard-shortcut hint chip inside the input (e.g. Ctrl K). */
  shortcut?: string[];
  trailing?: ReactNode;
  containerClassName?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { shortcut, trailing, containerClassName = '', className = '', ...rest },
  ref,
) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-subtle bg-surface px-3 py-2 focus-within:border-accent transition-colors ${containerClassName}`}
    >
      <IconSearch className="w-4 h-4 text-muted shrink-0" />
      <input
        ref={ref}
        type="search"
        className={`w-full bg-transparent text-sm text-primary placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:appearance-none ${className}`}
        {...rest}
      />
      {shortcut && (
        <span className="hidden sm:flex items-center gap-1 shrink-0" aria-hidden="true">
          {shortcut.map((key) => (
            <kbd
              key={key}
              className="rounded border border-subtle bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted"
            >
              {key}
            </kbd>
          ))}
        </span>
      )}
      {trailing}
    </div>
  );
});

export default SearchInput;
