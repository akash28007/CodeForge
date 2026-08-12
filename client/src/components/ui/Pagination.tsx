import { IconChevronLeft, IconChevronRight } from '../icons';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Builds a compact page list with ellipses, e.g. 1 … 4 5 6 … 20 */
function pageList(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  if (start > 2) pages.push('gap');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < last - 1) pages.push('gap');
  pages.push(last);
  return pages;
}

export default function Pagination({ page, pageSize, total, onPageChange, className = '' }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-muted">
        Showing {from} to {to} of {total}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-md p-1.5 text-secondary hover:bg-raised hover:text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        {pageList(page, lastPage).map((entry, i) =>
          entry === 'gap' ? (
            <span key={`gap-${i}`} className="px-1.5 text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={entry}
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={`min-w-[2rem] rounded-md px-2 py-1 text-sm transition-colors ${
                entry === page
                  ? 'btn-gradient font-semibold'
                  : 'text-secondary hover:bg-raised hover:text-primary'
              }`}
            >
              {entry}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
          className="rounded-md p-1.5 text-secondary hover:bg-raised hover:text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <IconChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
