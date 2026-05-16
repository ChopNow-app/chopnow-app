import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional "Voir tout" affordance — kept intentionally small to let the title dominate. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

// Oversized magazine-style section header. The title is the typographic
// anchor; the subtitle is editorial copy in chop-ink-secondary; the action
// link is a small ghost button on the right, weighted to NOT compete with
// the title.
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4 px-5 pb-3 pt-7', className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-[28px] font-extrabold leading-[1.05] tracking-tight text-chop-ink">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] font-medium text-chop-ink-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-chop-ink-secondary transition-colors hover:text-chop-red"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      ) : null}
    </header>
  );
}
