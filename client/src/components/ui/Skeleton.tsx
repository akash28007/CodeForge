interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`relative overflow-hidden rounded bg-raised ${className}`} aria-hidden="true" />;
}

/** Convenience: N stacked skeleton rows, for table/list loading states. */
export function SkeletonRows({ rows = 5, className = 'h-10' }: { rows?: number; className?: string }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}
