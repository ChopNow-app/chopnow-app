'use client';

import * as React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  onFilterClick?: () => void;
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
  placeholder = 'Ndolé, poulet DG, pizza…',
}: SearchBarProps) {
  return (
    <div className="px-5 pt-5 md:px-8 lg:px-12">
      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-chop-surface-gray p-1.5 pl-5',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(15,15,15,0.04)]',
        )}
      >
        <Search className="h-5 w-5 shrink-0 text-chop-ink-secondary" strokeWidth={2.2} />
        <input
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium text-chop-ink placeholder:text-chop-ink-secondary/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="Filtres"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            'bg-chop-red text-white shadow-card transition-transform active:scale-95',
            'hover:bg-chop-red-dark',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
