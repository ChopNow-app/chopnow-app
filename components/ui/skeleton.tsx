import { cn } from '@/lib/utils';

// Loading skeleton — a muted animated block. Use in place of "Chargement…"
// text so pages feel responsive on slow Cameroon mobile networks.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
