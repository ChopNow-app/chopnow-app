import { cn } from '@/lib/utils';

// Loading skeleton — a muted animated block. Use in place of "Chargement…"
// text so pages feel responsive on slow Cameroon mobile networks.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/**
 * Layout-matched list skeleton. Renders N pulse rows shaped like a
 * typical card/row in the consumer + admin (light variant) or rider
 * (dark variant) UI. Drop-in for `data.status === 'loading'` branches
 * to avoid generic gray-block flicker right before the real list
 * renders.
 *
 * Use:
 *   <ListSkeleton rows={3} />              // light, card height
 *   <ListSkeleton rows={5} variant="row" /> // light, table-row height
 *   <ListSkeleton rows={3} variant="dark" /> // rider surface
 */
export function ListSkeleton({
  rows = 3,
  variant = 'card',
  className,
}: {
  rows?: number;
  variant?: 'card' | 'row' | 'dark';
  className?: string;
}) {
  const styles =
    variant === 'dark'
      ? 'h-24 rounded-2xl border border-chop-dark-border bg-chop-dark-surface'
      : variant === 'row'
        ? 'h-12 rounded-md bg-muted/60'
        : 'h-24 rounded-2xl border border-divider bg-chop-card-white shadow-card';
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('animate-pulse', styles)} />
      ))}
    </div>
  );
}
