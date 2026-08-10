import type { ReactNode } from 'react';
import { IconChevronDown } from '../icons';
import { SkeletonRows } from './Skeleton';
import { EmptyState, ErrorState } from './States';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row, index: number) => ReactNode;
  /** Enables the sort affordance on this column's header. */
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export type SortDirection = 'asc' | 'desc';

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[] | null;
  rowKey: (row: Row, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  onRowClick?: (row: Row) => void;
  /** Marks a row as the current user's, for the leaderboard's pinned-row treatment. */
  isHighlighted?: (row: Row) => boolean;
  className?: string;
}

export default function DataTable<Row>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  isHighlighted,
  className = '',
}: DataTableProps<Row>) {
  const shell = `rounded-xl border border-subtle bg-surface overflow-hidden ${className}`;

  if (error) {
    return (
      <div className={shell}>
        <ErrorState description={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading || rows === null) {
    return (
      <div className={`${shell} p-4`}>
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={shell}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-raised/60 text-xs uppercase tracking-wide text-muted">
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th key={col.key} className={`px-4 py-2.5 font-medium ${col.headerClassName ?? ''}`} scope="col">
                    {col.sortable && onSort ? (
                      <button
                        onClick={() => onSort(col.key)}
                        className={`inline-flex items-center gap-1 transition-colors hover:text-primary ${
                          active ? 'text-primary' : ''
                        }`}
                        aria-label={`Sort by ${col.key}`}
                      >
                        {col.header}
                        <IconChevronDown
                          className={`h-3 w-3 transition-transform ${
                            active && sortDirection === 'asc' ? 'rotate-180' : ''
                          } ${active ? 'opacity-100' : 'opacity-40'}`}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-subtle transition-colors ${
                  isHighlighted?.(row) ? 'bg-accent/10' : 'hover:bg-raised/50'
                } ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-2.5 ${col.className ?? ''}`}>
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
