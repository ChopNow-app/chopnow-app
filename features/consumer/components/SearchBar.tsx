'use client';

import * as React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  onFilterClick?: () => void;
  isFilterActive?: boolean;
  placeholder?: string;
}

// A heavy "slab" search bar — surface-gray pill containing the input, with a
// red square filter button breaking the right edge. Per DESIGN.md §4 pills
// dominate the UI, but this one accepts a sharp 14px-radius interruption to
// signal that the filter is a discrete action, not a chip.
export function SearchBar({
  value,
  onChange,
  onFilterClick,
  isFilterActive,
  placeholder,
}: SearchBarProps) {
  const t = useTranslations('Consumer');
  const tCommon = useTranslations('Common');
  const finalPlaceholder = placeholder ?? t('searchPlaceholder');
  return (
    <div className="px-5 pt-5 md:px-8 lg:px-12">
      {/* Search is the primary action for food delivery — on desktop it
          gets more height, a larger icon/font, and a max width so it reads
          as the hero's focal point rather than a secondary chip. */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-chop-surface-gray p-1.5 pl-5',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(15,15,15,0.04)]',
          'lg:max-w-2xl lg:gap-3 lg:p-2 lg:pl-7',
        )}
      >
        <Search
          className="h-5 w-5 shrink-0 text-chop-ink-secondary lg:h-6 lg:w-6"
          strokeWidth={2.2}
        />
        <input
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={finalPlaceholder}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium text-chop-ink placeholder:text-chop-ink-secondary/70 focus:outline-none lg:py-3.5 lg:text-lg"
        />
        <button
          type="button"
          onClick={onFilterClick}
          aria-label={tCommon('filters')}
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            'bg-chop-red text-white shadow-card transition-transform active:scale-95',
            'hover:bg-chop-red-dark',
            'lg:h-12 lg:w-12',
          )}
        >
          <SlidersHorizontal className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.4} />
          {isFilterActive ? (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-chop-red lg:right-2 lg:top-2"
            />
          ) : null}
        </button>
      </div>
    </div>
  );
}
